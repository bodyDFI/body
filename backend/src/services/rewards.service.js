const mongoose = require('mongoose');
const { TokenTransaction, TokenBalance, RewardRule, UserRewardStats } = require('../models/token.model');
const User = require('../models/user.model');
const BlockchainService = require('./blockchain.service');

/**
 * 奖励服务 - 处理代币奖励和通证经济相关功能
 */
class RewardsService {
  constructor() {
    this.blockchainService = new BlockchainService();
  }

  /**
   * 初始化用户代币余额
   * @param {string} userId - 用户ID
   * @param {string} walletAddress - 区块链钱包地址
   * @returns {Promise<Object>} 用户代币余额
   */
  async initializeUserBalance(userId, walletAddress) {
    try {
      let tokenBalance = await TokenBalance.findOne({ user: userId });
      
      if (!tokenBalance) {
        tokenBalance = new TokenBalance({
          user: userId,
          walletAddress,
          balance: 0,
          frozenBalance: 0,
          totalEarned: 0,
          totalSpent: 0
        });
        
        await tokenBalance.save();
      } else if (walletAddress && tokenBalance.walletAddress !== walletAddress) {
        // 更新钱包地址（如果提供且不同）
        tokenBalance.walletAddress = walletAddress;
        await tokenBalance.save();
      }
      
      return tokenBalance;
    } catch (error) {
      console.error('初始化用户代币余额错误:', error);
      throw new Error('初始化用户代币余额失败');
    }
  }

  /**
   * 获取用户代币余额
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户代币余额
   */
  async getUserBalance(userId) {
    try {
      let tokenBalance = await TokenBalance.findOne({ user: userId });
      
      if (!tokenBalance) {
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('用户不存在');
        }
        
        tokenBalance = await this.initializeUserBalance(userId, user.walletAddress);
      }
      
      return {
        balance: tokenBalance.balance,
        frozenBalance: tokenBalance.frozenBalance,
        availableBalance: tokenBalance.balance - tokenBalance.frozenBalance,
        totalEarned: tokenBalance.totalEarned,
        totalSpent: tokenBalance.totalSpent,
        walletAddress: tokenBalance.walletAddress,
        updatedAt: tokenBalance.updatedAt
      };
    } catch (error) {
      console.error('获取用户代币余额错误:', error);
      throw new Error('获取用户代币余额失败');
    }
  }

  /**
   * 处理用户奖励
   * @param {string} userId - 用户ID
   * @param {string} rewardType - 奖励类型
   * @param {Object} data - 奖励相关数据
   * @returns {Promise<Object>} 处理结果
   */
  async processReward(userId, rewardType, data = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 获取用户
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 查找匹配的奖励规则
      const rules = await RewardRule.find({
        type: rewardType,
        status: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gt: new Date() } }
        ],
        startDate: { $lte: new Date() }
      });
      
      if (rules.length === 0) {
        return { rewarded: false, reason: '没有找到匹配的奖励规则' };
      }
      
      // 获取或创建用户代币余额
      let tokenBalance = await TokenBalance.findOne({ user: userId }).session(session);
      if (!tokenBalance) {
        tokenBalance = await this.initializeUserBalance(userId, user.walletAddress);
      }
      
      let totalReward = 0;
      const rewards = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 处理每条匹配的规则
      for (const rule of rules) {
        // 检查规则条件
        if (!this.checkRewardConditions(rule, data)) {
          continue;
        }
        
        // 计算奖励金额
        let rewardAmount = rule.amount;
        if (rule.amountFormula) {
          try {
            // 解析并执行公式，传入data作为上下文
            rewardAmount = this.evaluateFormula(rule.amountFormula, data);
          } catch (error) {
            console.error('计算奖励公式错误:', error);
            continue;
          }
        }
        
        // 查找或创建用户奖励统计
        let rewardStats = await UserRewardStats.findOne({
          user: userId,
          rewardRule: rule._id,
          date: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }).session(session);
        
        if (!rewardStats) {
          rewardStats = new UserRewardStats({
            user: userId,
            rewardRule: rule._id,
            date: today,
            dailyReward: 0,
            dailyCount: 0,
            totalReward: 0,
            totalCount: 0
          });
        }
        
        // 检查用户每日奖励上限
        if (rule.dailyLimitPerUser && rewardStats.dailyReward + rewardAmount > rule.dailyLimitPerUser) {
          rewards.push({
            rule: rule.name,
            amount: 0,
            success: false,
            reason: '已达到每日用户奖励上限'
          });
          continue;
        }
        
        // 创建奖励交易记录
        const transaction = new TokenTransaction({
          type: 'reward',
          to: userId,
          amount: rewardAmount,
          status: 'pending',
          reason: `${rule.name} - ${rule.description || rewardType}`,
          relatedEntity: data.relatedEntityId,
          relatedEntityModel: data.relatedEntityType
        });
        
        await transaction.save({ session });
        
        // 更新用户余额
        tokenBalance.balance += rewardAmount;
        tokenBalance.totalEarned += rewardAmount;
        tokenBalance.updatedAt = new Date();
        
        // 更新奖励统计
        rewardStats.dailyReward += rewardAmount;
        rewardStats.dailyCount += 1;
        rewardStats.totalReward += rewardAmount;
        rewardStats.totalCount += 1;
        rewardStats.lastRewardDate = new Date();
        
        await tokenBalance.save({ session });
        await rewardStats.save({ session });
        
        // 尝试进行区块链操作
        try {
          // 只有在有钱包地址的情况下才进行区块链操作
          if (user.walletAddress) {
            const mintParams = {
              amount: rewardAmount,
              destination: user.walletAddress,
              memo: `Reward: ${rule.name}`
            };
            
            const instruction = this.blockchainService.createTokenMintInstruction(mintParams);
            const txSignature = await this.blockchainService.sendTransaction([instruction]);
            
            // 更新交易记录
            transaction.status = 'completed';
            transaction.blockchain = {
              txSignature,
              confirmations: 1,
              blockTime: new Date(),
              status: 'confirmed'
            };
          } else {
            // 无钱包地址，仅更新状态
            transaction.status = 'completed';
          }
        } catch (blockchainError) {
          console.error('区块链奖励操作错误:', blockchainError);
          // 区块链操作失败，但依然认为奖励已发放（在链下）
          transaction.status = 'completed';
        }
        
        await transaction.save({ session });
        
        totalReward += rewardAmount;
        rewards.push({
          rule: rule.name,
          amount: rewardAmount,
          success: true,
          transactionId: transaction._id
        });
      }
      
      await session.commitTransaction();
      
      return {
        rewarded: totalReward > 0,
        totalReward,
        rewards,
        newBalance: tokenBalance.balance
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('处理用户奖励错误:', error);
      throw new Error('处理用户奖励失败');
    } finally {
      session.endSession();
    }
  }

  /**
   * 检查奖励条件
   * @param {Object} rule - 奖励规则
   * @param {Object} data - 相关数据
   * @returns {boolean} 是否满足条件
   */
  checkRewardConditions(rule, data) {
    // 如果没有设置条件，默认满足
    if (!rule.conditions) {
      return true;
    }
    
    try {
      const conditions = rule.conditions;
      
      // 检查特定条件类型
      switch(rule.type) {
        case 'data_submission':
          if (conditions.requiredDataTypes && !conditions.requiredDataTypes.includes(data.dataType)) {
            return false;
          }
          if (conditions.minDataPoints && data.dataPointsCount < conditions.minDataPoints) {
            return false;
          }
          break;
          
        case 'data_purchase':
          if (conditions.minPrice && data.price < conditions.minPrice) {
            return false;
          }
          if (conditions.requiredDataTypes && !conditions.requiredDataTypes.includes(data.dataType)) {
            return false;
          }
          break;
          
        case 'marketplace_activity':
          if (conditions.activityType && data.activityType !== conditions.activityType) {
            return false;
          }
          break;
          
        case 'device_connection':
          if (conditions.deviceTypes && !conditions.deviceTypes.includes(data.deviceType)) {
            return false;
          }
          if (conditions.minConnectionTime && data.connectionTime < conditions.minConnectionTime) {
            return false;
          }
          break;
      }
      
      return true;
    } catch (error) {
      console.error('检查奖励条件错误:', error);
      return false;
    }
  }

  /**
   * 评估奖励公式
   * @param {string} formula - 奖励公式
   * @param {Object} data - 相关数据
   * @returns {number} 计算的奖励金额
   */
  evaluateFormula(formula, data) {
    // 基本安全检查
    if (!/^[0-9\s\+\-\*\/\(\)\.\,\?\:\d\w\.]+$/.test(formula)) {
      throw new Error('无效的奖励公式');
    }
    
    // 替换变量
    let processedFormula = formula;
    for (const key in data) {
      if (typeof data[key] === 'number') {
        processedFormula = processedFormula.replace(
          new RegExp(`\\b${key}\\b`, 'g'), 
          data[key]
        );
      }
    }
    
    // 替换数学函数
    processedFormula = processedFormula
      .replace(/Math\.min/g, 'Math.min')
      .replace(/Math\.max/g, 'Math.max')
      .replace(/Math\.floor/g, 'Math.floor')
      .replace(/Math\.ceil/g, 'Math.ceil')
      .replace(/Math\.round/g, 'Math.round');
    
    try {
      // 安全地评估表达式
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict";return (' + processedFormula + ')')();
      return Math.max(0, result); // 确保不会有负奖励
    } catch (error) {
      console.error('评估公式错误:', error, { formula, processedFormula });
      throw new Error('奖励公式计算错误');
    }
  }

  /**
   * 转账代币
   * @param {string} fromUserId - 发送方用户ID
   * @param {string} toUserId - 接收方用户ID
   * @param {number} amount - 转账金额
   * @param {string} reason - 转账原因
   * @returns {Promise<Object>} 转账结果
   */
  async transferTokens(fromUserId, toUserId, amount, reason = '') {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 基本验证
      if (fromUserId === toUserId) {
        throw new Error('不能向自己转账');
      }
      
      if (amount <= 0) {
        throw new Error('转账金额必须大于0');
      }
      
      // 获取发送方余额
      const fromBalance = await TokenBalance.findOne({ user: fromUserId }).session(session);
      if (!fromBalance) {
        throw new Error('发送方余额不存在');
      }
      
      // 检查余额是否足够
      const availableBalance = fromBalance.balance - fromBalance.frozenBalance;
      if (availableBalance < amount) {
        throw new Error('余额不足');
      }
      
      // 获取或创建接收方余额
      let toBalance = await TokenBalance.findOne({ user: toUserId }).session(session);
      if (!toBalance) {
        const toUser = await User.findById(toUserId);
        if (!toUser) {
          throw new Error('接收方用户不存在');
        }
        
        toBalance = await this.initializeUserBalance(toUserId, toUser.walletAddress);
      }
      
      // 创建交易记录
      const transaction = new TokenTransaction({
        type: 'transfer',
        from: fromUserId,
        to: toUserId,
        amount,
        status: 'pending',
        reason
      });
      
      await transaction.save({ session });
      
      // 更新余额
      fromBalance.balance -= amount;
      fromBalance.totalSpent += amount;
      fromBalance.updatedAt = new Date();
      
      toBalance.balance += amount;
      toBalance.totalEarned += amount;
      toBalance.updatedAt = new Date();
      
      await fromBalance.save({ session });
      await toBalance.save({ session });
      
      // 尝试区块链操作
      try {
        const fromUser = await User.findById(fromUserId);
        const toUser = await User.findById(toUserId);
        
        if (fromUser.walletAddress && toUser.walletAddress) {
          const transferParams = {
            amount,
            fromWallet: fromUser.walletAddress,
            toWallet: toUser.walletAddress,
            memo: reason
          };
          
          const instruction = this.blockchainService.createTokenTransferInstruction(transferParams);
          const txSignature = await this.blockchainService.sendTransaction([instruction], fromUser.walletAddress);
          
          // 更新交易记录
          transaction.status = 'completed';
          transaction.blockchain = {
            txSignature,
            confirmations: 1,
            blockTime: new Date(),
            status: 'confirmed'
          };
        } else {
          // 无钱包地址，仅更新状态
          transaction.status = 'completed';
        }
      } catch (blockchainError) {
        console.error('区块链转账操作错误:', blockchainError);
        // 区块链操作失败，但依然认为转账已完成（在链下）
        transaction.status = 'completed';
      }
      
      await transaction.save({ session });
      
      await session.commitTransaction();
      
      return {
        success: true,
        transactionId: transaction._id,
        amount,
        fromBalance: fromBalance.balance,
        toBalance: toBalance.balance
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('转账代币错误:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * 创建或更新奖励规则
   * @param {Object} ruleData - 奖励规则数据
   * @param {string} ruleId - 规则ID (可选，用于更新)
   * @returns {Promise<Object>} 创建或更新的规则
   */
  async saveRewardRule(ruleData, ruleId = null) {
    try {
      let rule;
      
      if (ruleId) {
        // 更新现有规则
        rule = await RewardRule.findById(ruleId);
        if (!rule) {
          throw new Error('奖励规则不存在');
        }
        
        // 更新字段
        Object.assign(rule, {
          name: ruleData.name,
          description: ruleData.description,
          amount: ruleData.amount,
          amountFormula: ruleData.amountFormula,
          dailyLimit: ruleData.dailyLimit,
          dailyLimitPerUser: ruleData.dailyLimitPerUser,
          conditions: ruleData.conditions,
          status: ruleData.status,
          startDate: ruleData.startDate,
          endDate: ruleData.endDate,
          updatedAt: new Date()
        });
      } else {
        // 创建新规则
        rule = new RewardRule({
          name: ruleData.name,
          type: ruleData.type,
          description: ruleData.description,
          amount: ruleData.amount,
          amountFormula: ruleData.amountFormula,
          dailyLimit: ruleData.dailyLimit,
          dailyLimitPerUser: ruleData.dailyLimitPerUser,
          conditions: ruleData.conditions,
          status: ruleData.status || 'active',
          startDate: ruleData.startDate || new Date(),
          endDate: ruleData.endDate
        });
      }
      
      await rule.save();
      return rule;
    } catch (error) {
      console.error('保存奖励规则错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户奖励历史
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 奖励历史记录
   */
  async getUserRewardHistory(userId, options = {}) {
    try {
      const query = {
        to: userId,
        type: 'reward'
      };
      
      // 时间过滤
      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = new Date(options.startDate);
        }
        if (options.endDate) {
          query.createdAt.$lte = new Date(options.endDate);
        }
      }
      
      // 状态过滤
      if (options.status) {
        query.status = options.status;
      }
      
      // 分页
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      
      // 查询总数
      const total = await TokenTransaction.countDocuments(query);
      
      // 查询交易
      const transactions = await TokenTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'relatedEntity',
          select: 'title description dataType price',
          options: { refPath: 'relatedEntityModel' }
        });
      
      return {
        data: transactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取用户奖励历史错误:', error);
      throw new Error('获取奖励历史失败');
    }
  }

  /**
   * 获取用户代币交易历史
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 交易历史记录
   */
  async getUserTransactionHistory(userId, options = {}) {
    try {
      const query = {
        $or: [{ from: userId }, { to: userId }]
      };
      
      // 排除特定类型
      if (options.excludeTypes) {
        query.type = { $nin: options.excludeTypes };
      }
      
      // 包含特定类型
      if (options.includeTypes) {
        query.type = { $in: options.includeTypes };
      }
      
      // 时间过滤
      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = new Date(options.startDate);
        }
        if (options.endDate) {
          query.createdAt.$lte = new Date(options.endDate);
        }
      }
      
      // 状态过滤
      if (options.status) {
        query.status = options.status;
      }
      
      // 分页
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      
      // 查询总数
      const total = await TokenTransaction.countDocuments(query);
      
      // 查询交易
      const transactions = await TokenTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('from', 'username profileImage')
        .populate('to', 'username profileImage')
        .populate({
          path: 'relatedEntity',
          select: 'title description dataType price',
          options: { refPath: 'relatedEntityModel' }
        });
      
      // 处理交易方向
      const processedTransactions = transactions.map(tx => {
        const isIncoming = tx.to && tx.to._id.toString() === userId;
        return {
          ...tx.toObject(),
          direction: isIncoming ? 'incoming' : 'outgoing',
          netAmount: isIncoming ? tx.amount : -tx.amount
        };
      });
      
      return {
        data: processedTransactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取用户交易历史错误:', error);
      throw new Error('获取交易历史失败');
    }
  }

  /**
   * 获取所有活动奖励规则
   * @returns {Promise<Array>} 活动奖励规则列表
   */
  async getActiveRewardRules() {
    try {
      return await RewardRule.find({
        status: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gt: new Date() } }
        ],
        startDate: { $lte: new Date() }
      }).sort({ type: 1, name: 1 });
    } catch (error) {
      console.error('获取活动奖励规则错误:', error);
      throw new Error('获取奖励规则失败');
    }
  }
}

module.exports = new RewardsService(); 