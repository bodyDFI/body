const privacyService = require('../services/privacy.service');
const { validationResult } = require('express-validator');

/**
 * 隐私控制器 - 处理用户隐私设置和数据访问控制请求
 */
class PrivacyController {
  /**
   * 获取用户隐私设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserPrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      
      const settings = await privacyService.getUserPrivacySettings(userId);
      
      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('获取用户隐私设置错误:', error);
      res.status(500).json({
        success: false,
        message: '获取隐私设置失败',
        error: error.message
      });
    }
  }

  /**
   * 更新用户隐私设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePrivacySettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const userId = req.user.id;
      const updateData = req.body;
      
      const updatedSettings = await privacyService.updatePrivacySettings(userId, updateData);
      
      res.status(200).json({
        success: true,
        message: '隐私设置已更新',
        data: updatedSettings
      });
    } catch (error) {
      console.error('更新用户隐私设置错误:', error);
      res.status(500).json({
        success: false,
        message: '更新隐私设置失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户数据访问日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserAccessLogs(req, res) {
    try {
      const userId = req.user.id;
      
      const filters = {
        accessType: req.query.accessType,
        dataType: req.query.dataType,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20
      };
      
      const result = await privacyService.getUserAccessLogs(userId, filters);
      
      res.status(200).json({
        success: true,
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取用户访问日志错误:', error);
      res.status(500).json({
        success: false,
        message: '获取访问日志失败',
        error: error.message
      });
    }
  }

  /**
   * 提交数据删除请求
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async submitDeletionRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const userId = req.user.id;
      const requestData = req.body;
      
      const deletionRequest = await privacyService.submitDeletionRequest(userId, requestData);
      
      res.status(201).json({
        success: true,
        message: '数据删除请求已提交',
        data: deletionRequest
      });
    } catch (error) {
      console.error('提交数据删除请求错误:', error);
      res.status(500).json({
        success: false,
        message: '提交删除请求失败',
        error: error.message
      });
    }
  }

  /**
   * 设置个人数据加密密钥
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async setEncryptionKey(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const userId = req.user.id;
      const { masterKey, recoveryHint } = req.body;
      
      const result = await privacyService.setEncryptionKey(userId, masterKey, recoveryHint);
      
      res.status(200).json({
        success: true,
        message: '加密密钥已设置',
        data: { hasKey: true }
      });
    } catch (error) {
      console.error('设置加密密钥错误:', error);
      res.status(500).json({
        success: false,
        message: '设置加密密钥失败',
        error: error.message
      });
    }
  }

  /**
   * 获取加密密钥信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getEncryptionKeyInfo(req, res) {
    try {
      const userId = req.user.id;
      
      const keyInfo = await privacyService.getEncryptionKeyInfo(userId);
      
      res.status(200).json({
        success: true,
        data: keyInfo
      });
    } catch (error) {
      console.error('获取加密密钥信息错误:', error);
      res.status(500).json({
        success: false,
        message: '获取加密密钥信息失败',
        error: error.message
      });
    }
  }

  /**
   * 授权设备数据收集
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async authorizeDevice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const userId = req.user.id;
      const { deviceId } = req.params;
      
      const result = await privacyService.authorizeDevice(userId, deviceId);
      
      res.status(200).json({
        success: true,
        message: '设备已授权',
        data: result
      });
    } catch (error) {
      console.error('授权设备错误:', error);
      
      if (error.message === '设备不存在或不属于该用户') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '授权设备失败',
        error: error.message
      });
    }
  }

  /**
   * 撤销设备数据收集授权
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async revokeDeviceAuthorization(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;
      
      const result = await privacyService.revokeDeviceAuthorization(userId, deviceId);
      
      res.status(200).json({
        success: true,
        message: '设备授权已撤销',
        data: result
      });
    } catch (error) {
      console.error('撤销设备授权错误:', error);
      
      if (error.message === '设备未授权' || error.message === '隐私设置不存在') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '撤销设备授权失败',
        error: error.message
      });
    }
  }

  /**
   * 检查设备授权状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkDeviceAuthorization(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;
      
      const status = await privacyService.checkDeviceAuthorization(userId, deviceId);
      
      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('检查设备授权状态错误:', error);
      res.status(500).json({
        success: false,
        message: '检查设备授权状态失败',
        error: error.message
      });
    }
  }
}

module.exports = new PrivacyController(); 