const rewardsService = require('../services/rewards.service');
const { validationResult } = require('express-validator');

/**
 * 奖励控制器 - 处理代币奖励相关请求
 */
class RewardsController {
  /**
   * 获取用户代币余额
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserBalance(req, res) {
    try {
      const userId = req.user.id;
      
      const balance = await rewardsService.getUserBalance(userId);
      
      res.status(200).json({
        success: true,
        data: balance
      });
    } catch (error) {
      console.error('获取用户代币余额错误:', error);
      res.status(500).json({
        success: false,
        message: '获取代币余额失败',
        error: error.message
      });
    }
  }

  /**
   * 处理用户奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async processReward(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const userId = req.user.id;
      const { rewardType, data } = req.body;
      
      const result = await rewardsService.processReward(userId, rewardType, data);
      
      if (result.rewarded) {
        res.status(200).json({
          success: true,
          message: '奖励已发放',
          data: result
        });
      } else {
        res.status(200).json({
          success: false,
          message: result.reason || '无法发放奖励',
          data: result
        });
      }
    } catch (error) {
      console.error('处理用户奖励错误:', error);
      res.status(500).json({
        success: false,
        message: '处理奖励失败',
        error: error.message
      });
    }
  }

  /**
   * 转账代币
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async transferTokens(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const fromUserId = req.user.id;
      const { toUserId, amount, reason } = req.body;
      
      if (fromUserId === toUserId) {
        return res.status(400).json({
          success: false,
          message: '不能向自己转账'
        });
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: '转账金额必须大于0'
        });
      }
      
      const result = await rewardsService.transferTokens(fromUserId, toUserId, amount, reason);
      
      res.status(200).json({
        success: true,
        message: '转账成功',
        data: result
      });
    } catch (error) {
      console.error('转账代币错误:', error);
      
      if (error.message === '余额不足') {
        return res.status(400).json({
          success: false,
          message: '余额不足',
          error: error.message
        });
      }
      
      if (error.message === '接收方用户不存在') {
        return res.status(404).json({
          success: false,
          message: '接收方用户不存在',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '转账失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户奖励历史
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserRewardHistory(req, res) {
    try {
      const userId = req.user.id;
      
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20
      };
      
      const result = await rewardsService.getUserRewardHistory(userId, options);
      
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取用户奖励历史错误:', error);
      res.status(500).json({
        success: false,
        message: '获取奖励历史失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户交易历史
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserTransactionHistory(req, res) {
    try {
      const userId = req.user.id;
      
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
        includeTypes: req.query.includeTypes ? req.query.includeTypes.split(',') : undefined,
        excludeTypes: req.query.excludeTypes ? req.query.excludeTypes.split(',') : undefined,
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20
      };
      
      const result = await rewardsService.getUserTransactionHistory(userId, options);
      
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取用户交易历史错误:', error);
      res.status(500).json({
        success: false,
        message: '获取交易历史失败',
        error: error.message
      });
    }
  }

  /**
   * 获取活动奖励规则
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getActiveRewardRules(req, res) {
    try {
      const rules = await rewardsService.getActiveRewardRules();
      
      // 对用户隐藏详细的条件和公式
      const userRules = rules.map(rule => ({
        id: rule._id,
        name: rule.name,
        type: rule.type,
        description: rule.description,
        amount: rule.amount
      }));
      
      res.status(200).json({
        success: true,
        data: userRules
      });
    } catch (error) {
      console.error('获取活动奖励规则错误:', error);
      res.status(500).json({
        success: false,
        message: '获取奖励规则失败',
        error: error.message
      });
    }
  }

  // ==== 管理员接口 ====

  /**
   * 创建奖励规则
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createRewardRule(req, res) {
    try {
      // 验证是否为管理员
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: '没有权限创建奖励规则'
        });
      }
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const ruleData = req.body;
      
      const rule = await rewardsService.saveRewardRule(ruleData);
      
      res.status(201).json({
        success: true,
        message: '奖励规则创建成功',
        data: rule
      });
    } catch (error) {
      console.error('创建奖励规则错误:', error);
      res.status(500).json({
        success: false,
        message: '创建奖励规则失败',
        error: error.message
      });
    }
  }

  /**
   * 更新奖励规则
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateRewardRule(req, res) {
    try {
      // 验证是否为管理员
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: '没有权限更新奖励规则'
        });
      }
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const { id } = req.params;
      const ruleData = req.body;
      
      const rule = await rewardsService.saveRewardRule(ruleData, id);
      
      res.status(200).json({
        success: true,
        message: '奖励规则更新成功',
        data: rule
      });
    } catch (error) {
      console.error('更新奖励规则错误:', error);
      
      if (error.message === '奖励规则不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '更新奖励规则失败',
        error: error.message
      });
    }
  }

  /**
   * 手动发放奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async manualReward(req, res) {
    try {
      // 验证是否为管理员
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: '没有权限发放奖励'
        });
      }
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const { userId, rewardType, data } = req.body;
      
      const result = await rewardsService.processReward(userId, rewardType, data);
      
      if (result.rewarded) {
        res.status(200).json({
          success: true,
          message: '奖励已手动发放',
          data: result
        });
      } else {
        res.status(200).json({
          success: false,
          message: result.reason || '无法发放奖励',
          data: result
        });
      }
    } catch (error) {
      console.error('手动发放奖励错误:', error);
      res.status(500).json({
        success: false,
        message: '手动发放奖励失败',
        error: error.message
      });
    }
  }
}

module.exports = new RewardsController(); 