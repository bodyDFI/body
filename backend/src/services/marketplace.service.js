const mongoose = require('mongoose');
const { DataListing, DataPurchase, DataAccessRequest, MarketplaceSettings } = require('../models/marketplace.model');
const Data = require('../models/data.model');
const User = require('../models/user.model');
const Device = require('../models/device.model');
const BlockchainService = require('./blockchain.service');
const crypto = require('crypto');
const { decrypt, encrypt } = require('../utils/encryption');

/**
 * 数据市场服务 - 处理数据列表和交易相关功能
 */
class MarketplaceService {
  constructor() {
    this.blockchainService = new BlockchainService();
  }

  /**
   * 获取数据市场列表
   * @param {Object} filters - 过滤条件
   * @param {Object} options - 分页和排序选项
   * @returns {Promise<Object>} 数据列表及分页信息
   */
  async getListings(filters = {}, options = {}) {
    try {
      // 构建查询条件
      const query = { status: 'active' };

      // 应用过滤器
      if (filters.dataType) {
        query.dataType = filters.dataType;
      }

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.provider) {
        query.provider = filters.provider;
      }

      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        query.price = {};
        if (filters.priceMin !== undefined) {
          query.price.$gte = filters.priceMin;
        }
        if (filters.priceMax !== undefined) {
          query.price.$lte = filters.priceMax;
        }
      }

      if (filters.featured) {
        query.featured = true;
      }

      if (filters.search) {
        query.$text = { $search: filters.search };
      }

      // 定义排序选项
      let sort = {};
      if (options.sortBy) {
        if (options.sortBy === 'price') {
          sort.price = options.sortOrder === 'desc' ? -1 : 1;
        } else if (options.sortBy === 'rating') {
          sort['stats.rating'] = options.sortOrder === 'desc' ? -1 : 1;
        } else if (options.sortBy === 'purchases') {
          sort['stats.purchases'] = options.sortOrder === 'desc' ? -1 : 1;
        } else if (options.sortBy === 'date') {
          sort.createdAt = options.sortOrder === 'desc' ? -1 : 1;
        }
      } else {
        // 默认按创建时间倒序排序
        sort = { createdAt: -1 };
      }

      // 计算分页参数
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      // 执行查询获取总数
      const total = await DataListing.countDocuments(query);

      // 执行主查询
      const listings = await DataListing.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('provider', 'username walletAddress profileImage')
        .populate('deviceSource', 'deviceName deviceType');

      // 返回结果和分页信息
      return {
        listings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取数据列表错误:', error);
      throw error;
    }
  }

  /**
   * 获取单个数据列表详情
   * @param {String} listingId - 列表ID
   * @returns {Promise<Object>} 列表详情
   */
  async getListingById(listingId) {
    try {
      const listing = await DataListing.findById(listingId)
        .populate('provider', 'username walletAddress profileImage')
        .populate('deviceSource', 'deviceName deviceType')
        .lean();

      if (!listing) {
        throw new Error('数据列表不存在');
      }

      // 递增浏览次数
      await DataListing.updateOne(
        { _id: listingId },
        { $inc: { 'stats.views': 1 } }
      );

      return listing;
    } catch (error) {
      console.error('获取数据列表详情错误:', error);
      throw error;
    }
  }

  /**
   * 创建新的数据列表
   * @param {Object} listingData - 列表数据
   * @param {String} userId - 创建用户ID
   * @returns {Promise<Object>} 创建的列表
   */
  async createListing(listingData, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 验证用户
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证设备（如果提供）
      let device = null;
      if (listingData.deviceSource) {
        device = await Device.findOne({
          _id: listingData.deviceSource,
          user: userId
        });
        if (!device) {
          throw new Error('设备不存在或不属于当前用户');
        }
      }

      // 获取相关数据点
      let dataPoints = [];
      const startDate = new Date(listingData.timeframe.startDate);
      const endDate = new Date(listingData.timeframe.endDate);

      const query = {
        user: userId,
        timestamp: {
          $gte: startDate,
          $lte: endDate
        },
        status: 'confirmed',
        'blockchain.submitted': true,
        deleted: { $ne: true }
      };

      if (device) {
        query.device = device._id;
      }

      if (listingData.dataType) {
        query.deviceType = listingData.dataType;
      }

      dataPoints = await Data.find(query, { dataHash: 1 }).limit(1000);

      if (dataPoints.length === 0) {
        throw new Error('找不到符合条件的数据点');
      }

      // 检查市场设置
      const settings = await MarketplaceSettings.findOne({ type: 'global' });
      const feeRate = settings?.fees?.platformFee || 5;
      const listingFee = settings?.fees?.listingFee || 1;

      // 创建列表
      const newListing = new DataListing({
        provider: userId,
        providerWallet: user.walletAddress,
        title: listingData.title,
        description: listingData.description,
        dataType: listingData.dataType || (device ? device.deviceType : 'basic'),
        category: listingData.category,
        deviceSource: device ? device._id : null,
        price: listingData.price,
        accessPeriod: listingData.accessPeriod || 30,
        dataPointsCount: dataPoints.length,
        timeframe: {
          startDate,
          endDate
        },
        dataHashes: dataPoints.map(dp => dp.dataHash),
        status: 'active',
        metadata: {
          tags: listingData.tags || [],
          periodLength: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
          frequency: listingData.frequency || 0,
          qualityScore: 0, // 将在后续处理中计算
          additionalInfo: listingData.additionalInfo || {}
        }
      });

      await newListing.save({ session });

      // 将列表提交到区块链
      try {
        const listingParams = {
          authority: user.walletAddress,
          title: newListing.title,
          dataType: newListing.dataType,
          price: newListing.price,
          accessPeriod: newListing.accessPeriod,
          dataHashes: newListing.dataHashes,
          feeRate
        };

        // 创建上链交易
        const instruction = this.blockchainService.createDataListingInstruction(listingParams);
        const txSignature = await this.blockchainService.sendTransaction([instruction], user.walletAddress);

        // 更新区块链记录
        await DataListing.updateOne(
          { _id: newListing._id },
          {
            'blockchain.registered': true,
            'blockchain.txSignature': txSignature,
            'blockchain.registeredAt': new Date(),
            'blockchain.listingId': `listing_${newListing._id.toString()}`
          },
          { session }
        );
      } catch (blockchainError) {
        console.error('区块链列表提交错误:', blockchainError);
        // 继续处理，即使区块链提交失败
      }

      await session.commitTransaction();
      return await DataListing.findById(newListing._id)
        .populate('provider', 'username walletAddress profileImage')
        .populate('deviceSource', 'deviceName deviceType');
    } catch (error) {
      await session.abortTransaction();
      console.error('创建数据列表错误:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * 更新数据列表
   * @param {String} listingId - 列表ID
   * @param {Object} updateData - 更新数据
   * @param {String} userId - 操作用户ID
   * @returns {Promise<Object>} 更新后的列表
   */
  async updateListing(listingId, updateData, userId) {
    try {
      // 检查列表存在并属于用户
      const listing = await DataListing.findOne({
        _id: listingId,
        provider: userId
      });

      if (!listing) {
        throw new Error('数据列表不存在或无权限编辑');
      }

      // 确保不更改关键字段
      const safeUpdate = {
        title: updateData.title,
        description: updateData.description,
        price: updateData.price,
        accessPeriod: updateData.accessPeriod,
        status: updateData.status,
        category: updateData.category,
        'metadata.tags': updateData.tags,
        previewImageUrl: updateData.previewImageUrl
      };

      // 移除未定义的字段
      Object.keys(safeUpdate).forEach(key => {
        if (safeUpdate[key] === undefined) {
          delete safeUpdate[key];
        }
      });

      // 执行更新
      const updatedListing = await DataListing.findByIdAndUpdate(
        listingId,
        { $set: safeUpdate },
        { new: true }
      )
        .populate('provider', 'username walletAddress profileImage')
        .populate('deviceSource', 'deviceName deviceType');

      return updatedListing;
    } catch (error) {
      console.error('更新数据列表错误:', error);
      throw error;
    }
  }

  /**
   * 购买数据列表
   * @param {String} listingId - 列表ID
   * @param {String} userId - 购买用户ID
   * @returns {Promise<Object>} 购买记录
   */
  async purchaseListing(listingId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 检查用户
      const buyer = await User.findById(userId);
      if (!buyer) {
        throw new Error('用户不存在');
      }

      // 检查列表
      const listing = await DataListing.findOne({
        _id: listingId,
        status: 'active'
      });

      if (!listing) {
        throw new Error('数据列表不存在或不可购买');
      }

      // 检查是否自购
      if (listing.provider.toString() === userId) {
        throw new Error('不能购买自己的数据列表');
      }

      // 检查是否已购买
      const existingPurchase = await DataPurchase.findOne({
        buyer: userId,
        listing: listingId,
        status: 'active'
      });

      if (existingPurchase) {
        throw new Error('已购买此数据列表');
      }

      // 获取数据提供者
      const provider = await User.findById(listing.provider);
      if (!provider) {
        throw new Error('数据提供者不存在');
      }

      // 生成访问密钥
      const accessKey = crypto.randomBytes(32).toString('hex');
      const encryptedAccessKey = encrypt(accessKey);

      // 计算访问结束时间
      const accessStartDate = new Date();
      const accessEndDate = new Date(accessStartDate);
      accessEndDate.setDate(accessEndDate.getDate() + listing.accessPeriod);

      // 获取市场设置
      const settings = await MarketplaceSettings.findOne({ type: 'global' });
      const feeRate = settings?.fees?.platformFee || 5;

      // 计算平台费用
      const platformFee = (listing.price * feeRate) / 100;
      const providerAmount = listing.price - platformFee;

      // 创建购买记录
      const purchase = new DataPurchase({
        buyer: userId,
        buyerWallet: buyer.walletAddress,
        listing: listingId,
        provider: listing.provider,
        price: listing.price,
        accessPeriod: listing.accessPeriod,
        accessStartDate,
        accessEndDate,
        status: 'active',
        accessKey: encryptedAccessKey
      });

      await purchase.save({ session });

      // 执行区块链交易
      try {
        const purchaseParams = {
          buyer: buyer.walletAddress,
          provider: provider.walletAddress,
          listingId: listing.blockchain.listingId,
          price: listing.price,
          platformFee
        };

        // 创建购买指令
        const instruction = this.blockchainService.createPurchaseDataAccessInstruction(purchaseParams);
        const txSignature = await this.blockchainService.sendTransaction([instruction], buyer.walletAddress);

        // 更新购买记录
        await DataPurchase.updateOne(
          { _id: purchase._id },
          {
            'blockchain.txSignature': txSignature,
            'blockchain.confirmations': 1
          },
          { session }
        );
      } catch (blockchainError) {
        console.error('区块链购买错误:', blockchainError);
        throw new Error('区块链交易失败: ' + blockchainError.message);
      }

      // 更新列表统计信息
      await DataListing.updateOne(
        { _id: listingId },
        { $inc: { 'stats.purchases': 1 } },
        { session }
      );

      await session.commitTransaction();
      return await DataPurchase.findById(purchase._id)
        .populate('listing')
        .populate('provider', 'username walletAddress profileImage')
        .populate('buyer', 'username walletAddress profileImage');
    } catch (error) {
      await session.abortTransaction();
      console.error('购买数据列表错误:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * 获取用户购买记录
   * @param {String} userId - 用户ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 购买记录列表
   */
  async getUserPurchases(userId, filters = {}) {
    try {
      const query = { buyer: userId };

      // 应用状态过滤
      if (filters.status) {
        query.status = filters.status;
      }

      // 应用时间过滤
      if (filters.startDate || filters.endDate) {
        query.accessStartDate = {};
        if (filters.startDate) {
          query.accessStartDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.accessStartDate.$lte = new Date(filters.endDate);
        }
      }

      // 查询购买记录
      const purchases = await DataPurchase.find(query)
        .sort({ accessStartDate: -1 })
        .populate('listing', 'title dataType category price')
        .populate('provider', 'username walletAddress profileImage');

      // 检查并更新过期状态
      const now = new Date();
      const expiredIds = purchases
        .filter(p => p.status === 'active' && p.accessEndDate < now)
        .map(p => p._id);

      if (expiredIds.length > 0) {
        await DataPurchase.updateMany(
          { _id: { $in: expiredIds } },
          { $set: { status: 'expired' } }
        );
        // 更新返回结果中的状态
        purchases.forEach(p => {
          if (expiredIds.includes(p._id)) {
            p.status = 'expired';
          }
        });
      }

      return purchases;
    } catch (error) {
      console.error('获取用户购买记录错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户的销售列表
   * @param {String} userId - 用户ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 列表记录
   */
  async getUserListings(userId, filters = {}) {
    try {
      const query = { provider: userId };

      // 应用状态过滤
      if (filters.status) {
        query.status = filters.status;
      }

      // 应用类型过滤
      if (filters.dataType) {
        query.dataType = filters.dataType;
      }

      // 应用时间过滤
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      // 查询列表
      const listings = await DataListing.find(query)
        .sort({ createdAt: -1 })
        .populate('deviceSource', 'deviceName deviceType');

      return listings;
    } catch (error) {
      console.error('获取用户销售列表错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户作为数据提供者的销售记录
   * @param {String} userId - 用户ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 销售记录
   */
  async getUserSales(userId, filters = {}) {
    try {
      const query = { provider: userId };

      // 应用状态过滤
      if (filters.status) {
        query.status = filters.status;
      }

      // 应用时间过滤
      if (filters.startDate || filters.endDate) {
        query.accessStartDate = {};
        if (filters.startDate) {
          query.accessStartDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.accessStartDate.$lte = new Date(filters.endDate);
        }
      }

      // 查询销售记录
      const sales = await DataPurchase.find(query)
        .sort({ accessStartDate: -1 })
        .populate('listing', 'title dataType category price')
        .populate('buyer', 'username walletAddress profileImage');

      return sales;
    } catch (error) {
      console.error('获取用户销售记录错误:', error);
      throw error;
    }
  }

  /**
   * 评价数据购买
   * @param {String} purchaseId - 购买记录ID
   * @param {Object} ratingData - 评价数据
   * @param {String} userId - 用户ID
   * @returns {Promise<Object>} 更新后的购买记录
   */
  async ratePurchase(purchaseId, ratingData, userId) {
    try {
      // 验证购买记录
      const purchase = await DataPurchase.findOne({
        _id: purchaseId,
        buyer: userId
      });

      if (!purchase) {
        throw new Error('购买记录不存在或无权限评价');
      }

      if (purchase.status !== 'active' && purchase.status !== 'expired') {
        throw new Error('只能评价有效或已过期的购买');
      }

      if (purchase.rating && purchase.rating.score) {
        throw new Error('已评价过此购买');
      }

      // 更新购买记录
      const updatedPurchase = await DataPurchase.findByIdAndUpdate(
        purchaseId,
        {
          'rating.score': ratingData.score,
          'rating.comment': ratingData.comment,
          'rating.createdAt': new Date()
        },
        { new: true }
      );

      // 更新列表的评分
      const listing = await DataListing.findById(purchase.listing);
      if (listing) {
        const currentRating = listing.stats.rating || 0;
        const currentCount = listing.stats.ratingCount || 0;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + ratingData.score) / newCount;

        await DataListing.updateOne(
          { _id: purchase.listing },
          {
            'stats.rating': newRating,
            'stats.ratingCount': newCount
          }
        );
      }

      return updatedPurchase;
    } catch (error) {
      console.error('评价购买错误:', error);
      throw error;
    }
  }

  /**
   * 获取和解密数据购买的内容
   * @param {String} purchaseId - 购买记录ID
   * @param {String} userId - 用户ID
   * @returns {Promise<Object>} 解密的数据访问信息
   */
  async getPurchaseData(purchaseId, userId) {
    try {
      // 验证购买记录
      const purchase = await DataPurchase.findOne({
        _id: purchaseId,
        buyer: userId,
        status: 'active'
      }).populate('listing');

      if (!purchase) {
        throw new Error('购买记录不存在、无效或无权限访问');
      }

      // 检查访问是否过期
      const now = new Date();
      if (purchase.accessEndDate < now) {
        await DataPurchase.updateOne(
          { _id: purchaseId },
          { status: 'expired' }
        );
        throw new Error('访问权限已过期');
      }

      // 获取相关数据哈希
      const listing = purchase.listing;
      if (!listing || !listing.dataHashes || listing.dataHashes.length === 0) {
        throw new Error('无法访问数据：数据列表信息不完整');
      }

      // 记录访问日志
      await DataPurchase.updateOne(
        { _id: purchaseId },
        {
          $push: {
            accessLogs: {
              timestamp: now,
              action: 'view',
              details: 'Accessed data via API'
            }
          }
        }
      );

      // 解密访问密钥
      const accessKey = decrypt(purchase.accessKey);

      // 查询关联的数据
      const dataPoints = await Data.find({
        dataHash: { $in: listing.dataHashes },
        user: purchase.provider
      })
        .select('dataHash timestamp metrics')
        .sort({ timestamp: 1 })
        .limit(1000);

      return {
        purchaseId: purchase._id,
        accessKey,
        listing: {
          id: listing._id,
          title: listing.title,
          description: listing.description,
          dataType: listing.dataType,
          category: listing.category
        },
        accessExpires: purchase.accessEndDate,
        dataPoints
      };
    } catch (error) {
      console.error('获取购买数据错误:', error);
      throw error;
    }
  }

  /**
   * 获取数据类别和标签统计
   * @returns {Promise<Object>} 类别和标签统计
   */
  async getCategoriesAndTags() {
    try {
      // 获取活跃类别统计
      const categories = await DataListing.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // 获取常用标签统计
      const tagResults = await DataListing.aggregate([
        { $match: { status: 'active' } },
        { $unwind: '$metadata.tags' },
        { $group: { _id: '$metadata.tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // 获取数据类型统计
      const dataTypes = await DataListing.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$dataType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      return {
        categories: categories.map(c => ({ name: c._id, count: c.count })),
        tags: tagResults.map(t => ({ name: t._id, count: t.count })),
        dataTypes: dataTypes.map(d => ({ name: d._id, count: d.count }))
      };
    } catch (error) {
      console.error('获取类别和标签统计错误:', error);
      throw error;
    }
  }

  /**
   * 设置数据列表为特色
   * @param {String} listingId - 列表ID
   * @param {Boolean} featured - 是否为特色
   * @param {String} adminId - 管理员ID
   * @returns {Promise<Object>} 更新后的列表
   */
  async setListingFeatured(listingId, featured, adminId) {
    try {
      // 验证管理员权限（此处应添加适当的权限检查）
      const admin = await User.findOne({
        _id: adminId,
        role: 'admin'
      });

      if (!admin) {
        throw new Error('无权执行此操作');
      }

      // 更新列表
      const updatedListing = await DataListing.findByIdAndUpdate(
        listingId,
        { featured },
        { new: true }
      );

      if (!updatedListing) {
        throw new Error('数据列表不存在');
      }

      return updatedListing;
    } catch (error) {
      console.error('设置特色列表错误:', error);
      throw error;
    }
  }

  /**
   * 获取市场统计数据
   * @returns {Promise<Object>} 市场统计
   */
  async getMarketplaceStats() {
    try {
      // 总活跃列表数
      const activeListings = await DataListing.countDocuments({ status: 'active' });

      // 总购买交易数
      const totalPurchases = await DataPurchase.countDocuments();

      // 类别分布
      const categoryDistribution = await DataListing.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // 价格区间分布
      const priceRanges = [
        { range: '0-10', min: 0, max: 10 },
        { range: '11-50', min: 11, max: 50 },
        { range: '51-100', min: 51, max: 100 },
        { range: '101+', min: 101, max: Infinity }
      ];

      const priceDistribution = await Promise.all(
        priceRanges.map(async range => {
          const count = await DataListing.countDocuments({
            status: 'active',
            price: { $gte: range.min, ...(range.max < Infinity ? { $lte: range.max } : {}) }
          });
          return { range: range.range, count };
        })
      );

      // 过去7天内交易趋势
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last7Days.push({
          date: date.toISOString().split('T')[0],
          timestamp: date
        });
      }

      const purchaseTrend = await Promise.all(
        last7Days.map(async day => {
          const nextDay = new Date(day.timestamp);
          nextDay.setDate(nextDay.getDate() + 1);

          const count = await DataPurchase.countDocuments({
            createdAt: { $gte: day.timestamp, $lt: nextDay }
          });

          return { date: day.date, count };
        })
      );

      return {
        activeListings,
        totalPurchases,
        categoryDistribution: categoryDistribution.map(c => ({
          category: c._id,
          count: c.count,
          percentage: Math.round((c.count / activeListings) * 100)
        })),
        priceDistribution,
        purchaseTrend
      };
    } catch (error) {
      console.error('获取市场统计错误:', error);
      throw error;
    }
  }
}

module.exports = new MarketplaceService(); 