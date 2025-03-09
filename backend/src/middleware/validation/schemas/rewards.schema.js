/**
 * Rewards validation schemas
 */
const Joi = require('joi');

// Schema for getting reward history
const getHistorySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    activityType: Joi.string().messages({
      'string.base': 'Activity type must be a string'
    }),
    startDate: Joi.date().iso().messages({
      'date.format': 'Start date must be in ISO format'
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    }),
    sort: Joi.string().valid('date_asc', 'date_desc', 'amount_asc', 'amount_desc').default('date_desc')
  })
};

// Schema for getting transaction history
const getTransactionsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    type: Joi.string().valid('REWARD', 'PURCHASE', 'TRANSFER', 'STAKE', 'UNSTAKE', 'PLATFORM_FEE').messages({
      'any.only': 'Invalid transaction type'
    }),
    startDate: Joi.date().iso().messages({
      'date.format': 'Start date must be in ISO format'
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    }),
    status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED').messages({
      'any.only': 'Invalid status'
    }),
    sort: Joi.string().valid('date_asc', 'date_desc', 'amount_asc', 'amount_desc').default('date_desc')
  })
};

// Schema for processing a reward
const processRewardSchema = {
  body: Joi.object({
    rewardType: Joi.string().required().messages({
      'any.required': 'Reward type is required',
      'string.base': 'Reward type must be a string'
    }),
    data: Joi.object().required().messages({
      'any.required': 'Reward data is required',
      'object.base': 'Reward data must be an object'
    })
  })
};

// Schema for transferring tokens
const transferTokensSchema = {
  body: Joi.object({
    toUserId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid recipient user ID format',
      'any.required': 'Recipient user ID is required'
    }),
    amount: Joi.number().positive().required().messages({
      'number.positive': 'Amount must be greater than 0',
      'any.required': 'Amount is required'
    }),
    reason: Joi.string().max(200).allow('', null).messages({
      'string.max': 'Reason cannot exceed 200 characters'
    })
  })
};

// Schema for creating a reward rule (admin only)
const createRewardRuleSchema = {
  body: Joi.object({
    name: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Name must be at least 3 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    description: Joi.string().max(500).allow('', null).messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
    activityType: Joi.string().required().messages({
      'any.required': 'Activity type is required'
    }),
    conditions: Joi.object().default({}),
    rewardFormula: Joi.string().required().messages({
      'any.required': 'Reward formula is required'
    }),
    maxReward: Joi.number().min(0).messages({
      'number.min': 'Maximum reward cannot be negative'
    }),
    limits: Joi.object({
      daily: Joi.number().min(0),
      weekly: Joi.number().min(0),
      monthly: Joi.number().min(0)
    }),
    isActive: Joi.boolean().default(true),
    startDate: Joi.date().default(Date.now),
    endDate: Joi.date().greater(Joi.ref('startDate')).allow(null).messages({
      'date.greater': 'End date must be after start date'
    }),
    priority: Joi.number().integer().default(0)
  })
};

// Schema for updating a reward rule (admin only)
const updateRewardRuleSchema = {
  params: Joi.object({
    ruleId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid rule ID format',
      'any.required': 'Rule ID is required'
    })
  }),
  body: Joi.object({
    name: Joi.string().min(3).max(100).messages({
      'string.min': 'Name must be at least 3 characters',
      'string.max': 'Name cannot exceed 100 characters'
    }),
    description: Joi.string().max(500).allow('', null).messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
    conditions: Joi.object(),
    rewardFormula: Joi.string(),
    maxReward: Joi.number().min(0).messages({
      'number.min': 'Maximum reward cannot be negative'
    }),
    limits: Joi.object({
      daily: Joi.number().min(0),
      weekly: Joi.number().min(0),
      monthly: Joi.number().min(0)
    }),
    isActive: Joi.boolean(),
    endDate: Joi.date().greater(Joi.ref('startDate')).allow(null).messages({
      'date.greater': 'End date must be after start date'
    }),
    priority: Joi.number().integer()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

// Schema for manual reward (admin only)
const manualRewardSchema = {
  body: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),
    amount: Joi.number().positive().required().messages({
      'number.positive': 'Amount must be greater than 0',
      'any.required': 'Amount is required'
    }),
    reason: Joi.string().max(200).required().messages({
      'string.max': 'Reason cannot exceed 200 characters',
      'any.required': 'Reason is required'
    }),
    reference: Joi.string().allow('', null)
  })
};

module.exports = {
  getHistorySchema,
  getTransactionsSchema,
  processRewardSchema,
  transferTokensSchema,
  createRewardRuleSchema,
  updateRewardRuleSchema,
  manualRewardSchema
}; 