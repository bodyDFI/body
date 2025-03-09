const mongoose = require('mongoose');
const Data = require('../models/data.model');
const Device = require('../models/device.model');
const DataListing = require('../models/marketplace.model').DataListing;
const DataPurchase = require('../models/marketplace.model').DataPurchase;
const User = require('../models/user.model');

/**
 * 数据分析服务 - 处理数据统计分析和洞察
 */
class AnalyticsService {
  /**
   * 获取用户活动概要
   * @param {string} userId - 用户ID
   * @param {Object} timeframe - 时间范围 {startDate, endDate}
   * @returns {Promise<Object>} 活动概要
   */
  async getUserActivitySummary(userId, timeframe = {}) {
    try {
      const startDate = timeframe.startDate ? new Date(timeframe.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = timeframe.endDate ? new Date(timeframe.endDate) : new Date();
      
      // 查询条件
      const timeQuery = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
      
      // 用户设备和数据点
      const devices = await Device.find({ user: userId });
      const deviceIds = devices.map(device => device._id);
      
      // 数据收集统计
      const dataPoints = await Data.find({ 
        device: { $in: deviceIds },
        ...timeQuery
      });
      
      // 按类型分组的数据计数
      const dataTypeCounts = {};
      dataPoints.forEach(point => {
        const type = point.type;
        dataTypeCounts[type] = (dataTypeCounts[type] || 0) + 1;
      });
      
      // 按日期分组的数据收集趋势
      const dailyDataTrend = await Data.aggregate([
        {
          $match: {
            device: { $in: deviceIds },
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      // 用户在市场的活动
      const [
        listedDataCount,
        purchasedDataCount,
        totalEarned,
        totalSpent
      ] = await Promise.all([
        // 列出的数据数量
        DataListing.countDocuments({ provider: userId, ...timeQuery }),
        
        // 购买的数据数量
        DataPurchase.countDocuments({ purchaser: userId, ...timeQuery }),
        
        // 总收入
        DataPurchase.aggregate([
          {
            $match: {
              listing: { $in: await DataListing.find({ provider: userId }).distinct('_id') },
              ...timeQuery
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$price' }
            }
          }
        ]).then(result => result[0]?.total || 0),
        
        // 总支出
        DataPurchase.aggregate([
          {
            $match: {
              purchaser: mongoose.Types.ObjectId(userId),
              ...timeQuery
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$price' }
            }
          }
        ]).then(result => result[0]?.total || 0)
      ]);
      
      // 设备使用统计
      const deviceStats = await Promise.all(
        devices.map(async device => {
          const dataCount = await Data.countDocuments({ 
            device: device._id,
            ...timeQuery
          });
          
          return {
            deviceId: device._id,
            name: device.name,
            type: device.type,
            dataCount,
            lastActive: device.lastConnected
          };
        })
      );
      
      return {
        timeframe: {
          startDate,
          endDate
        },
        dataCollection: {
          totalDataPoints: dataPoints.length,
          byType: dataTypeCounts,
          dailyTrend: dailyDataTrend.map(item => ({
            date: item._id,
            count: item.count
          }))
        },
        devices: {
          total: devices.length,
          active: devices.filter(d => d.status === 'active').length,
          stats: deviceStats
        },
        marketplace: {
          listedData: listedDataCount,
          purchasedData: purchasedDataCount,
          totalEarned,
          totalSpent
        }
      };
    } catch (error) {
      console.error('获取用户活动概要错误:', error);
      throw new Error('获取用户活动统计失败');
    }
  }
  
  /**
   * 获取用户健康趋势
   * @param {string} userId - 用户ID
   * @param {string} metricType - 指标类型 (如 'heartRate', 'steps', 'sleep')
   * @param {Object} timeframe - 时间范围 {startDate, endDate}
   * @returns {Promise<Object>} 健康趋势数据
   */
  async getUserHealthTrend(userId, metricType, timeframe = {}) {
    try {
      const startDate = timeframe.startDate ? new Date(timeframe.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = timeframe.endDate ? new Date(timeframe.endDate) : new Date();
      
      // 获取用户的设备
      const devices = await Device.find({ user: userId });
      const deviceIds = devices.map(device => device._id);
      
      // 获取指定类型的数据
      let dataQuery = {
        device: { $in: deviceIds },
        createdAt: { $gte: startDate, $lte: endDate }
      };
      
      // 根据指标类型设置不同的查询条件
      switch (metricType) {
        case 'heartRate':
          dataQuery.type = 'biometric';
          dataQuery['data.heartRate'] = { $exists: true };
          break;
        case 'steps':
          dataQuery.type = 'motion';
          dataQuery['data.steps'] = { $exists: true };
          break;
        case 'sleep':
          dataQuery.type = 'biometric';
          dataQuery['data.sleepDuration'] = { $exists: true };
          break;
        case 'calories':
          dataQuery.type = 'biometric';
          dataQuery['data.caloriesBurned'] = { $exists: true };
          break;
        default:
          dataQuery.type = metricType;
      }
      
      // 获取数据点
      const dataPoints = await Data.find(dataQuery).sort('createdAt');
      
      // 提取数据值和时间
      const processedData = dataPoints.map(point => {
        let value;
        
        switch (metricType) {
          case 'heartRate':
            value = point.data.heartRate;
            break;
          case 'steps':
            value = point.data.steps;
            break;
          case 'sleep':
            value = point.data.sleepDuration;
            break;
          case 'calories':
            value = point.data.caloriesBurned;
            break;
          default:
            value = point.data[metricType];
        }
        
        return {
          timestamp: point.createdAt,
          value: value || 0
        };
      });
      
      // 计算统计值
      let stats = {};
      if (processedData.length > 0) {
        const values = processedData.map(item => item.value).filter(v => v !== null && v !== undefined);
        
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          
          stats = {
            average: parseFloat(avg.toFixed(2)),
            minimum: min,
            maximum: max,
            count: values.length
          };
        }
      }
      
      // 按日期分组获取日趋势
      const dailyTrend = await Data.aggregate([
        {
          $match: dataQuery
        },
        {
          $project: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            value: {
              $switch: {
                branches: [
                  { case: { $eq: ['$type', 'biometric'] }, then: 
                    { $cond: [
                      { $eq: [metricType, 'heartRate'] },
                      '$data.heartRate',
                      { $cond: [
                        { $eq: [metricType, 'sleep'] },
                        '$data.sleepDuration',
                        { $cond: [
                          { $eq: [metricType, 'calories'] },
                          '$data.caloriesBurned',
                          null
                        ]}
                      ]}
                    ]}
                  },
                  { case: { $eq: ['$type', 'motion'] }, then: 
                    { $cond: [
                      { $eq: [metricType, 'steps'] },
                      '$data.steps',
                      null
                    ]}
                  }
                ],
                default: `$data.${metricType}`
              }
            }
          }
        },
        {
          $group: {
            _id: '$date',
            avgValue: { $avg: '$value' },
            minValue: { $min: '$value' },
            maxValue: { $max: '$value' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      return {
        metricType,
        timeframe: {
          startDate,
          endDate
        },
        data: processedData,
        dailyTrend: dailyTrend.map(day => ({
          date: day._id,
          average: parseFloat(day.avgValue.toFixed(2)),
          minimum: day.minValue,
          maximum: day.maxValue,
          count: day.count
        })),
        statistics: stats
      };
    } catch (error) {
      console.error(`获取用户健康趋势错误 (${metricType}):`, error);
      throw new Error(`获取${metricType}趋势数据失败`);
    }
  }
  
  /**
   * 获取全平台数据统计
   * @returns {Promise<Object>} 平台统计数据
   */
  async getPlatformStatistics() {
    try {
      const [
        totalUsers,
        activeUsers,
        totalDevices,
        totalDataPoints,
        dataPointsLast30Days,
        totalListings,
        activeListings,
        totalPurchases
      ] = await Promise.all([
        // 总用户数
        User.countDocuments(),
        
        // 活跃用户（30天内）
        User.countDocuments({
          lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }),
        
        // 总设备数
        Device.countDocuments(),
        
        // 总数据点数
        Data.countDocuments(),
        
        // 过去30天数据点
        Data.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }),
        
        // 总列表数
        DataListing.countDocuments(),
        
        // 活跃列表数
        DataListing.countDocuments({ status: 'active' }),
        
        // 总购买数
        DataPurchase.countDocuments()
      ]);
      
      // 按类型统计数据点
      const dataByType = await Data.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // 每日新增用户
      const newUsersTrend = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      // 每日数据增长
      const dataGrowthTrend = await Data.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      // 每日市场交易
      const marketTrend = await DataPurchase.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            transactions: { $sum: 1 },
            volume: { $sum: '$price' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          newUsersTrend: newUsersTrend.map(item => ({
            date: item._id,
            count: item.count
          }))
        },
        devices: {
          total: totalDevices
        },
        data: {
          total: totalDataPoints,
          last30Days: dataPointsLast30Days,
          byType: dataByType.map(item => ({
            type: item._id,
            count: item.count
          })),
          growthTrend: dataGrowthTrend.map(item => ({
            date: item._id,
            count: item.count
          }))
        },
        marketplace: {
          totalListings,
          activeListings,
          totalPurchases,
          transactionTrend: marketTrend.map(item => ({
            date: item._id,
            transactions: item.transactions,
            volume: parseFloat(item.volume.toFixed(2))
          }))
        }
      };
    } catch (error) {
      console.error('获取平台统计数据错误:', error);
      throw new Error('获取平台统计数据失败');
    }
  }
  
  /**
   * 获取用户设备使用分析
   * @param {string} userId - 用户ID
   * @param {string} deviceId - 设备ID (可选，如果不提供则返回所有设备)
   * @param {Object} timeframe - 时间范围 {startDate, endDate}
   * @returns {Promise<Object>} 设备使用数据
   */
  async getDeviceUsageAnalytics(userId, deviceId, timeframe = {}) {
    try {
      const startDate = timeframe.startDate ? new Date(timeframe.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = timeframe.endDate ? new Date(timeframe.endDate) : new Date();
      
      // 查询条件
      const timeQuery = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
      
      // 获取设备
      let devices;
      if (deviceId) {
        devices = await Device.find({ _id: deviceId, user: userId });
        if (devices.length === 0) {
          throw new Error('设备不存在或不属于该用户');
        }
      } else {
        devices = await Device.find({ user: userId });
      }
      
      const result = await Promise.all(
        devices.map(async device => {
          // 数据收集统计
          const dataCount = await Data.countDocuments({
            device: device._id,
            ...timeQuery
          });
          
          // 按类型分组数据
          const dataByType = await Data.aggregate([
            {
              $match: {
                device: device._id,
                ...timeQuery
              }
            },
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 }
              }
            }
          ]);
          
          // 每日使用趋势
          const dailyUsage = await Data.aggregate([
            {
              $match: {
                device: device._id,
                ...timeQuery
              }
            },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { _id: 1 }
            }
          ]);
          
          // 连接时长（如果数据模型支持）
          let connectionTime = 0;
          if (device.connectionHistory && device.connectionHistory.length > 0) {
            const relevantHistory = device.connectionHistory.filter(
              h => new Date(h.startTime) >= startDate && new Date(h.startTime) <= endDate
            );
            
            connectionTime = relevantHistory.reduce((total, session) => {
              const start = new Date(session.startTime);
              const end = session.endTime ? new Date(session.endTime) : new Date();
              return total + (end - start) / 1000; // 秒数
            }, 0);
          }
          
          return {
            deviceId: device._id,
            name: device.name,
            type: device.type,
            status: device.status,
            lastConnected: device.lastConnected,
            stats: {
              totalDataPoints: dataCount,
              byType: dataByType.map(item => ({
                type: item._id,
                count: item.count
              })),
              dailyActivity: dailyUsage.map(item => ({
                date: item._id,
                dataPoints: item.count
              })),
              totalConnectionTime: connectionTime // 秒数
            }
          };
        })
      );
      
      return deviceId ? result[0] : { devices: result };
    } catch (error) {
      console.error('获取设备使用分析错误:', error);
      throw new Error('获取设备使用统计失败');
    }
  }
  
  /**
   * 获取用户的市场活动分析
   * @param {string} userId - 用户ID
   * @param {Object} timeframe - 时间范围 {startDate, endDate}
   * @returns {Promise<Object>} 市场活动分析
   */
  async getUserMarketActivity(userId, timeframe = {}) {
    try {
      const startDate = timeframe.startDate ? new Date(timeframe.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = timeframe.endDate ? new Date(timeframe.endDate) : new Date();
      
      // 查询条件
      const timeQuery = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
      
      // 获取用户列表
      const userListings = await DataListing.find({ 
        provider: userId,
        ...timeQuery
      }).sort('-createdAt');
      
      // 列表统计
      const listingStats = {
        total: userListings.length,
        active: userListings.filter(l => l.status === 'active').length,
        inactive: userListings.filter(l => l.status === 'inactive').length,
        pending: userListings.filter(l => l.status === 'pending').length
      };
      
      // 获取销售记录
      const sales = await DataPurchase.find({
        listing: { $in: userListings.map(l => l._id) },
        ...timeQuery
      }).populate('purchaser', 'username');
      
      // 销售统计
      const salesTotal = sales.reduce((sum, sale) => sum + sale.price, 0);
      const salesCount = sales.length;
      
      // 类型销售分布
      const salesByType = {};
      await Promise.all(
        sales.map(async sale => {
          const listing = userListings.find(l => l._id.toString() === sale.listing.toString());
          if (listing) {
            const type = listing.dataType;
            salesByType[type] = salesByType[type] || { count: 0, revenue: 0 };
            salesByType[type].count += 1;
            salesByType[type].revenue += sale.price;
          }
        })
      );
      
      // 每日销售趋势
      const dailySales = await DataPurchase.aggregate([
        {
          $match: {
            listing: { $in: userListings.map(l => l._id) },
            ...timeQuery
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$price' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      // 获取用户购买
      const purchases = await DataPurchase.find({
        purchaser: userId,
        ...timeQuery
      }).populate({
        path: 'listing',
        select: 'title dataType price provider',
        populate: {
          path: 'provider',
          select: 'username'
        }
      });
      
      // 购买统计
      const purchasesTotal = purchases.reduce((sum, purchase) => sum + purchase.price, 0);
      const purchasesCount = purchases.length;
      
      // 类型购买分布
      const purchasesByType = {};
      purchases.forEach(purchase => {
        if (purchase.listing) {
          const type = purchase.listing.dataType;
          purchasesByType[type] = purchasesByType[type] || { count: 0, spent: 0 };
          purchasesByType[type].count += 1;
          purchasesByType[type].spent += purchase.price;
        }
      });
      
      // 每日购买趋势
      const dailyPurchases = await DataPurchase.aggregate([
        {
          $match: {
            purchaser: mongoose.Types.ObjectId(userId),
            ...timeQuery
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            spent: { $sum: '$price' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      return {
        timeframe: {
          startDate,
          endDate
        },
        listings: {
          stats: listingStats,
          recentListings: userListings.slice(0, 5).map(listing => ({
            id: listing._id,
            title: listing.title,
            dataType: listing.dataType,
            price: listing.price,
            status: listing.status,
            createdAt: listing.createdAt,
            purchaseCount: listing.purchaseCount || 0
          }))
        },
        sales: {
          total: salesTotal,
          count: salesCount,
          byType: Object.entries(salesByType).map(([type, data]) => ({
            type,
            count: data.count,
            revenue: data.revenue
          })),
          trend: dailySales.map(day => ({
            date: day._id,
            count: day.count,
            revenue: day.revenue
          })),
          recentSales: sales.slice(0, 5).map(sale => ({
            id: sale._id,
            purchaser: sale.purchaser ? {
              id: sale.purchaser._id,
              username: sale.purchaser.username
            } : null,
            listingId: sale.listing,
            price: sale.price,
            purchasedAt: sale.createdAt
          }))
        },
        purchases: {
          total: purchasesTotal,
          count: purchasesCount,
          byType: Object.entries(purchasesByType).map(([type, data]) => ({
            type,
            count: data.count,
            spent: data.spent
          })),
          trend: dailyPurchases.map(day => ({
            date: day._id,
            count: day.count,
            spent: day.spent
          })),
          recentPurchases: purchases.slice(0, 5).map(purchase => ({
            id: purchase._id,
            listing: purchase.listing ? {
              id: purchase.listing._id,
              title: purchase.listing.title,
              dataType: purchase.listing.dataType,
              price: purchase.listing.price,
              provider: purchase.listing.provider ? {
                id: purchase.listing.provider._id,
                username: purchase.listing.provider.username
              } : null
            } : null,
            price: purchase.price,
            purchasedAt: purchase.createdAt
          }))
        }
      };
    } catch (error) {
      console.error('获取用户市场活动错误:', error);
      throw new Error('获取市场活动分析失败');
    }
  }
}

module.exports = new AnalyticsService(); 