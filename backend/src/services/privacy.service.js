const { PrivacySettings, DataAccessLog } = require('../models/privacy.model');
const User = require('../models/user.model');
const Device = require('../models/device.model');
const Data = require('../models/data.model');
const { encrypt, decrypt, encryptFields, decryptFields } = require('../utils/encryption');

/**
 * 隐私服务 - 处理用户隐私设置和数据访问控制
 */
class PrivacyService {
  /**
   * 初始化用户隐私设置
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 初始化的隐私设置
   */
  async initializePrivacySettings(userId) {
    try {
      // 检查设置是否已存在
      let settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        // 创建默认隐私设置
        settings = new PrivacySettings({
          user: userId,
          // 其他字段使用模型中定义的默认值
        });
        
        await settings.save();
      }
      
      return settings;
    } catch (error) {
      console.error('初始化用户隐私设置错误:', error);
      throw new Error('初始化隐私设置失败');
    }
  }

  /**
   * 获取用户隐私设置
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户隐私设置
   */
  async getUserPrivacySettings(userId) {
    try {
      let settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        settings = await this.initializePrivacySettings(userId);
      }
      
      // 移除敏感字段
      const result = settings.toObject();
      delete result.encryptionKeys;
      
      return result;
    } catch (error) {
      console.error('获取用户隐私设置错误:', error);
      throw new Error('获取隐私设置失败');
    }
  }

  /**
   * 更新用户隐私设置
   * @param {string} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的隐私设置
   */
  async updatePrivacySettings(userId, updateData) {
    try {
      let settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        settings = await this.initializePrivacySettings(userId);
      }
      
      // 更新数据收集同意
      if (updateData.dataUsageConsent) {
        settings.dataUsageConsent = {
          ...settings.dataUsageConsent.toObject(),
          ...updateData.dataUsageConsent,
          updatedAt: new Date()
        };
      }
      
      // 更新个人资料可见性
      if (updateData.profileVisibility) {
        settings.profileVisibility = {
          ...settings.profileVisibility.toObject(),
          ...updateData.profileVisibility
        };
      }
      
      // 更新数据隐私设置
      if (updateData.dataPrivacy) {
        settings.dataPrivacy = {
          ...settings.dataPrivacy.toObject(),
          ...updateData.dataPrivacy
        };
      }
      
      // 更新通知设置
      if (updateData.notifications) {
        settings.notifications = {
          ...settings.notifications.toObject(),
          ...updateData.notifications
        };
      }
      
      // 更新访问日志设置
      if (updateData.accessLogs) {
        settings.accessLogs = {
          ...settings.accessLogs.toObject(),
          ...updateData.accessLogs
        };
      }
      
      // 更新时间
      settings.updatedAt = new Date();
      
      await settings.save();
      
      // 移除敏感字段
      const result = settings.toObject();
      delete result.encryptionKeys;
      
      return result;
    } catch (error) {
      console.error('更新用户隐私设置错误:', error);
      throw new Error('更新隐私设置失败');
    }
  }

  /**
   * 检查数据访问权限
   * @param {string} ownerId - 数据拥有者ID
   * @param {string} requesterId - 请求访问者ID
   * @param {string} dataType - 数据类型
   * @param {string} accessType - 访问类型 (view, export, etc.)
   * @returns {Promise<boolean>} 是否有权限访问
   */
  async checkDataAccessPermission(ownerId, requesterId, dataType, accessType) {
    try {
      // 如果是自己的数据，直接允许访问
      if (ownerId === requesterId) {
        return true;
      }
      
      // 获取拥有者的隐私设置
      const settings = await PrivacySettings.findOne({ user: ownerId });
      if (!settings) {
        return false; // 没有设置，默认拒绝
      }
      
      // 检查对应数据类型的隐私设置
      const privacyLevel = settings.dataPrivacy[dataType];
      
      // 如果请求者是系统管理员，根据访问类型决定
      const requester = await User.findById(requesterId);
      if (requester && requester.role === 'admin') {
        if (accessType === 'view' || accessType === 'analyze') {
          return true; // 管理员可以查看和分析数据
        }
        // 对于修改、删除等操作，即使是管理员也需要符合隐私设置
      }
      
      // 根据隐私级别检查权限
      switch (privacyLevel) {
        case 'public':
          return true; // 对所有人开放
          
        case 'registeredUsers':
          return !!requesterId; // 只要是已注册用户就允许
          
        case 'anonymous':
          // 匿名数据可以被访问，但需要记录日志并移除个人标识
          return accessType === 'view' || accessType === 'analyze';
          
        case 'private':
        default:
          return false; // 私有数据，不允许他人访问
      }
    } catch (error) {
      console.error('检查数据访问权限错误:', error);
      return false; // 出错时默认拒绝访问
    }
  }

  /**
   * 记录数据访问日志
   * @param {Object} logData - 日志数据
   * @returns {Promise<Object>} 创建的日志记录
   */
  async logDataAccess(logData) {
    try {
      // 检查用户的日志设置
      const settings = await PrivacySettings.findOne({ user: logData.user });
      
      // 如果用户禁用了日志，不记录
      if (settings && settings.accessLogs && settings.accessLogs.enabled === false) {
        return null;
      }
      
      // 创建访问日志
      const log = new DataAccessLog({
        user: logData.user,
        accessedBy: logData.accessedBy,
        activity: logData.activity,
        accessedData: logData.accessedData,
        ipAddress: logData.ipAddress,
        source: logData.source,
        status: logData.status,
        deniedReason: logData.deniedReason
      });
      
      await log.save();
      
      // 可以在这里添加通知逻辑，例如当数据被访问时通知用户
      if (settings && settings.notifications && settings.notifications.dataAccessAlerts) {
        // TODO: 发送通知
      }
      
      return log;
    } catch (error) {
      console.error('记录数据访问日志错误:', error);
      // 记录日志失败不应影响主流程，所以只记录错误，不抛出
      return null;
    }
  }

  /**
   * 匿名化数据
   * @param {Object|Array} data - 要匿名化的数据
   * @returns {Object|Array} 匿名化后的数据
   */
  anonymizeData(data) {
    try {
      if (Array.isArray(data)) {
        // 处理数组数据
        return data.map(item => this.anonymizeDataItem(item));
      } else {
        // 处理单个数据对象
        return this.anonymizeDataItem(data);
      }
    } catch (error) {
      console.error('匿名化数据错误:', error);
      return data; // 失败时返回原始数据
    }
  }

  /**
   * 匿名化单个数据项
   * @param {Object} item - 要匿名化的数据项
   * @returns {Object} 匿名化后的数据项
   */
  anonymizeDataItem(item) {
    if (!item) return item;
    
    const result = { ...item };
    
    // 如果是Mongoose文档，转换为普通对象
    if (typeof result.toObject === 'function') {
      result = result.toObject();
    }
    
    // 移除用户标识
    delete result.user;
    delete result.userId;
    delete result.createdBy;
    delete result.username;
    
    // 移除设备标识
    delete result.deviceId;
    delete result.device;
    
    // 移除位置详细信息
    if (result.location) {
      // 保留大致位置（如城市），移除精确坐标
      if (result.location.coordinates) {
        // 对坐标进行模糊化处理（保留到小数点后一位）
        result.location.coordinates = result.location.coordinates.map(
          coord => Math.round(coord * 10) / 10
        );
      }
      
      delete result.location.address;
      delete result.location.ip;
    }
    
    // 对时间戳进行模糊化（只保留到小时）
    if (result.timestamp || result.createdAt) {
      const date = new Date(result.timestamp || result.createdAt);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      
      if (result.timestamp) result.timestamp = date;
      if (result.createdAt) result.createdAt = date;
    }
    
    // 生成匿名ID
    result.anonymousId = `anon_${Math.random().toString(36).substr(2, 9)}`;
    
    return result;
  }

  /**
   * 提交数据删除请求
   * @param {string} userId - 用户ID
   * @param {Object} requestData - 删除请求数据
   * @returns {Promise<Object>} 创建的删除请求
   */
  async submitDeletionRequest(userId, requestData) {
    try {
      // 获取用户隐私设置
      let settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        settings = await this.initializePrivacySettings(userId);
      }
      
      // 创建删除请求
      const deletionRequest = {
        type: requestData.type,
        dataType: requestData.dataType,
        timeframe: requestData.timeframe,
        reason: requestData.reason,
        status: 'pending',
        createdAt: new Date()
      };
      
      // 添加到删除请求列表
      settings.deletionRequests.push(deletionRequest);
      
      await settings.save();
      
      return deletionRequest;
    } catch (error) {
      console.error('提交数据删除请求错误:', error);
      throw new Error('提交删除请求失败');
    }
  }

  /**
   * 获取用户的数据访问日志
   * @param {string} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>} 访问日志列表
   */
  async getUserAccessLogs(userId, filters = {}) {
    try {
      const query = { user: userId };
      
      // 应用筛选条件
      if (filters.accessType) {
        query['activity.type'] = filters.accessType;
      }
      
      if (filters.dataType) {
        query['accessedData.type'] = filters.dataType;
      }
      
      if (filters.startDate || filters.endDate) {
        query.accessedAt = {};
        if (filters.startDate) {
          query.accessedAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.accessedAt.$lte = new Date(filters.endDate);
        }
      }
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      // 分页
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;
      
      // 执行查询
      const [logs, total] = await Promise.all([
        DataAccessLog.find(query)
          .sort({ accessedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('accessedBy.userId', 'username'),
        
        DataAccessLog.countDocuments(query)
      ]);
      
      return {
        logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取用户访问日志错误:', error);
      throw new Error('获取访问日志失败');
    }
  }

  /**
   * 设置个人数据加密密钥
   * @param {string} userId - 用户ID
   * @param {string} masterKey - 主密钥
   * @param {string} recoveryHint - 恢复提示
   * @returns {Promise<Object>} 更新结果
   */
  async setEncryptionKey(userId, masterKey, recoveryHint) {
    try {
      // 获取用户隐私设置
      let settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        settings = await this.initializePrivacySettings(userId);
      }
      
      // 加密存储主密钥
      settings.encryptionKeys = {
        masterKey: encrypt(masterKey),
        recoveryHint,
        updatedAt: new Date()
      };
      
      await settings.save();
      
      return { success: true };
    } catch (error) {
      console.error('设置加密密钥错误:', error);
      throw new Error('设置加密密钥失败');
    }
  }

  /**
   * 获取用户加密密钥信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 密钥信息
   */
  async getEncryptionKeyInfo(userId) {
    try {
      // 获取用户隐私设置
      const settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings || !settings.encryptionKeys || !settings.encryptionKeys.masterKey) {
        return { hasKey: false };
      }
      
      return {
        hasKey: true,
        recoveryHint: settings.encryptionKeys.recoveryHint,
        updatedAt: settings.encryptionKeys.updatedAt
      };
    } catch (error) {
      console.error('获取加密密钥信息错误:', error);
      throw new Error('获取加密密钥信息失败');
    }
  }

  /**
   * 授权设备数据收集
   * @param {string} userId - 用户ID
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Object>} 授权结果
   */
  async authorizeDevice(userId, deviceId) {
    try {
      // 检查设备是否存在并属于用户
      const device = await Device.findOne({
        _id: deviceId,
        user: userId
      });
      
      if (!device) {
        throw new Error('设备不存在或不属于该用户');
      }
      
      // 获取用户隐私设置
      let settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        settings = await this.initializePrivacySettings(userId);
      }
      
      // 检查设备是否已授权
      const existingAuth = settings.authorizedDevices.find(
        auth => auth.deviceId.toString() === deviceId
      );
      
      if (existingAuth) {
        // 如果已存在，更新状态
        existingAuth.status = 'active';
        existingAuth.authorizedAt = new Date();
      } else {
        // 添加新授权
        settings.authorizedDevices.push({
          deviceId,
          status: 'active',
          authorizedAt: new Date()
        });
      }
      
      await settings.save();
      
      return { success: true, status: 'active' };
    } catch (error) {
      console.error('授权设备错误:', error);
      throw new Error('授权设备失败');
    }
  }

  /**
   * 撤销设备数据收集授权
   * @param {string} userId - 用户ID
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Object>} 撤销结果
   */
  async revokeDeviceAuthorization(userId, deviceId) {
    try {
      // 获取用户隐私设置
      const settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        throw new Error('隐私设置不存在');
      }
      
      // 查找设备授权
      const authIndex = settings.authorizedDevices.findIndex(
        auth => auth.deviceId.toString() === deviceId
      );
      
      if (authIndex === -1) {
        throw new Error('设备未授权');
      }
      
      // 更新授权状态
      settings.authorizedDevices[authIndex].status = 'revoked';
      
      await settings.save();
      
      return { success: true, status: 'revoked' };
    } catch (error) {
      console.error('撤销设备授权错误:', error);
      throw new Error('撤销设备授权失败');
    }
  }

  /**
   * 检查设备授权状态
   * @param {string} userId - 用户ID
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Object>} 授权状态
   */
  async checkDeviceAuthorization(userId, deviceId) {
    try {
      // 获取用户隐私设置
      const settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        return { authorized: false };
      }
      
      // 查找设备授权
      const deviceAuth = settings.authorizedDevices.find(
        auth => auth.deviceId.toString() === deviceId
      );
      
      if (!deviceAuth) {
        return { authorized: false };
      }
      
      return {
        authorized: deviceAuth.status === 'active',
        status: deviceAuth.status,
        authorizedAt: deviceAuth.authorizedAt
      };
    } catch (error) {
      console.error('检查设备授权状态错误:', error);
      return { authorized: false, error: error.message };
    }
  }
}

module.exports = new PrivacyService(); 