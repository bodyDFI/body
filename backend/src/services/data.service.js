const Data = require('../models/data.model');
const User = require('../models/user.model');
const Device = require('../models/device.model');
const mongoose = require('mongoose');
const BlockchainService = require('./blockchain.service');
const { createHash } = require('crypto');

/**
 * 数据服务 - 负责处理和管理来自设备的数据
 */
class DataService {
  constructor() {
    this.blockchainService = new BlockchainService();
  }

  /**
   * 提交数据到系统并选择性地提交到区块链
   * @param {Object} dataInfo - 数据信息
   * @param {String} userId - 用户ID
   * @returns {Promise<Object>} 提交的数据记录
   */
  async submitData(dataInfo, userId) {
    try {
      // 验证用户
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证设备归属
      const device = await Device.findOne({ deviceId: dataInfo.deviceId, user: userId });
      if (!device) {
        throw new Error('设备未注册或不属于当前用户');
      }

      // 计算数据哈希作为标识符
      const dataHash = this._generateDataHash(dataInfo);

      // 创建数据记录
      const dataRecord = new Data({
        user: userId,
        device: device._id,
        deviceType: dataInfo.deviceType || device.deviceType,
        timestamp: dataInfo.timestamp || Date.now(),
        dataHash,
        metrics: dataInfo.metrics,
        status: 'pending', // 初始状态为待处理
      });

      // 保存到数据库
      await dataRecord.save();

      // 如果用户选择加入数据市场，则提交到区块链
      if (user.marketplaceEnabled && device.dataSharingEnabled) {
        try {
          // 生成并发送区块链交易
          const txSignature = await this._submitToBlockchain(dataRecord, user);
          
          // 更新数据记录状态
          dataRecord.blockchain = {
            submitted: true,
            txSignature,
            timestamp: Date.now()
          };
          dataRecord.status = 'confirmed';
          await dataRecord.save();
        } catch (blockchainError) {
          console.error('区块链提交错误:', blockchainError);
          // 即使区块链提交失败，数据仍然保存在我们的系统中
          dataRecord.status = 'blockchain_failed';
          await dataRecord.save();
        }
      }

      return dataRecord;
    } catch (error) {
      console.error('数据提交错误:', error);
      throw error;
    }
  }

  /**
   * 根据用户ID获取用户的数据记录
   * @param {String} userId - 用户ID
   * @param {Object} filters - 过滤参数
   * @returns {Promise<Array>} 数据记录列表
   */
  async getUserData(userId, filters = {}) {
    try {
      const query = { user: userId };

      // 添加过滤条件
      if (filters.deviceId) {
        const device = await Device.findOne({ deviceId: filters.deviceId, user: userId });
        if (device) {
          query.device = device._id;
        }
      }

      if (filters.deviceType) {
        query.deviceType = filters.deviceType;
      }

      if (filters.startDate && filters.endDate) {
        query.timestamp = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      } else if (filters.startDate) {
        query.timestamp = { $gte: new Date(filters.startDate) };
      } else if (filters.endDate) {
        query.timestamp = { $lte: new Date(filters.endDate) };
      }

      if (filters.status) {
        query.status = filters.status;
      }

      // 构建排序选项
      const sortOptions = {};
      if (filters.sortBy) {
        sortOptions[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
      } else {
        sortOptions.timestamp = -1; // 默认按时间戳倒序
      }

      // 执行查询
      const data = await Data.find(query)
        .sort(sortOptions)
        .limit(filters.limit ? parseInt(filters.limit) : 100)
        .populate('device', 'deviceId deviceName deviceType');

      return data;
    } catch (error) {
      console.error('获取用户数据错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户的数据统计信息
   * @param {String} userId - 用户ID
   * @returns {Promise<Object>} 统计信息
   */
  async getUserDataStats(userId) {
    try {
      // 获取用户的设备列表
      const devices = await Device.find({ user: userId });
      const deviceIds = devices.map(device => device._id);

      // 获取数据总数
      const totalCount = await Data.countDocuments({ user: userId });
      
      // 按设备类型分组统计
      const deviceTypeStats = await Data.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } }
      ]);

      // 按blockchain状态分组统计
      const blockchainStats = await Data.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      // 按时间段分组统计
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todayCount = await Data.countDocuments({
        user: userId,
        timestamp: { $gte: oneDayAgo }
      });

      const weekCount = await Data.countDocuments({
        user: userId,
        timestamp: { $gte: oneWeekAgo }
      });

      const monthCount = await Data.countDocuments({
        user: userId,
        timestamp: { $gte: oneMonthAgo }
      });

      // 整合统计结果
      return {
        totalDataPoints: totalCount,
        deviceCount: devices.length,
        byDeviceType: deviceTypeStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        byStatus: blockchainStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        byTimeFrame: {
          today: todayCount,
          week: weekCount,
          month: monthCount
        }
      };
    } catch (error) {
      console.error('获取数据统计错误:', error);
      throw error;
    }
  }

  /**
   * 获取单个数据记录的详细信息
   * @param {String} dataId - 数据记录ID
   * @param {String} userId - 用户ID
   * @returns {Promise<Object>} 数据记录
   */
  async getDataById(dataId, userId) {
    try {
      const data = await Data.findOne({ _id: dataId, user: userId })
        .populate('device', 'deviceId deviceName deviceType');

      if (!data) {
        throw new Error('数据记录不存在或无权访问');
      }

      // 如果数据已提交到区块链，获取区块链上的确认状态
      if (data.blockchain && data.blockchain.submitted && data.blockchain.txSignature) {
        try {
          const txInfo = await this.blockchainService.getTransaction(data.blockchain.txSignature);
          data.blockchain.confirmations = txInfo.confirmations;
          data.blockchain.slot = txInfo.slot;
          
          // 更新数据记录
          await Data.updateOne(
            { _id: dataId },
            { 'blockchain.confirmations': txInfo.confirmations, 'blockchain.slot': txInfo.slot }
          );
        } catch (blockchainError) {
          console.warn('获取区块链交易状态失败:', blockchainError);
          // 忽略区块链查询错误，返回现有数据
        }
      }

      return data;
    } catch (error) {
      console.error('获取数据记录错误:', error);
      throw error;
    }
  }

  /**
   * 删除数据记录
   * @param {String} dataId - 数据记录ID
   * @param {String} userId - 用户ID
   * @returns {Promise<Boolean>} 是否成功删除
   */
  async deleteData(dataId, userId) {
    try {
      const data = await Data.findOne({ _id: dataId, user: userId });
      
      if (!data) {
        throw new Error('数据记录不存在或无权删除');
      }
      
      // 如果数据已提交到区块链，我们不能真正删除它，只能标记为已删除
      if (data.blockchain && data.blockchain.submitted) {
        data.deleted = true;
        await data.save();
        return true;
      }
      
      // 否则直接删除
      await Data.deleteOne({ _id: dataId });
      return true;
    } catch (error) {
      console.error('删除数据记录错误:', error);
      throw error;
    }
  }

  /**
   * 生成数据哈希
   * @param {Object} dataInfo - 数据信息
   * @returns {String} 数据哈希
   * @private
   */
  _generateDataHash(dataInfo) {
    const dataString = JSON.stringify({
      deviceId: dataInfo.deviceId,
      timestamp: dataInfo.timestamp,
      metrics: dataInfo.metrics
    });
    
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * 提交数据到区块链
   * @param {Object} dataRecord - 数据记录
   * @param {Object} user - 用户对象
   * @returns {Promise<String>} 交易签名
   * @private
   */
  async _submitToBlockchain(dataRecord, user) {
    try {
      // 准备区块链交易参数
      const submitDataParams = {
        authority: user.walletAddress,
        dataHash: dataRecord.dataHash,
        dataType: dataRecord.deviceType,
        timestamp: dataRecord.timestamp.getTime(),
        // 添加区块链特定参数
        metadata: {
          source: 'BodyDFi App',
          version: '1.0',
          // 数据摘要 - 不包含完整数据以保护隐私
          summary: {
            deviceType: dataRecord.deviceType,
            metricsCount: Object.keys(dataRecord.metrics).length
          }
        }
      };

      // 创建提交数据指令
      const instruction = this.blockchainService.createSubmitDataInstruction(submitDataParams);
      
      // 发送交易到区块链
      const txSignature = await this.blockchainService.sendTransaction([instruction], user.walletAddress);
      
      return txSignature;
    } catch (error) {
      console.error('区块链数据提交错误:', error);
      throw error;
    }
  }
}

module.exports = new DataService(); 