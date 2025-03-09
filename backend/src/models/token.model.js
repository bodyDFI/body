/**
 * Token Model
 * Represents the token economy for the BodyDFi platform
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Token Balance Schema
 * Keeps track of a user's token balance
 */
const TokenBalanceSchema = new Schema({
  // Reference to the user who owns this balance
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // The user's wallet address on the blockchain
  walletAddress: {
    type: String,
    trim: true,
    index: true
  },

  // The current balance of tokens (platform-side record)
  balance: {
    type: Number,
    default: 0,
    min: 0
  },

  // Token accrual metrics
  lifetimeEarned: {
    type: Number,
    default: 0,
    min: 0
  },

  // Tokens spent on platform
  lifetimeSpent: {
    type: Number,
    default: 0,
    min: 0
  },

  // Last verified blockchain balance
  lastVerifiedBalance: {
    type: Number,
    default: 0
  },

  // Timestamp of last verification
  lastVerifiedAt: {
    type: Date
  },

  // Token circulation status
  locked: {
    type: Number, 
    default: 0,
    min: 0,
    description: 'Amount of tokens locked/staked'
  },

  // Flag to indicate if this wallet is the primary wallet for the user
  isPrimary: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

/**
 * Token Transaction Schema
 * Records all token transactions on the platform
 */
const TokenTransactionSchema = new Schema({
  // Reference to the sender (null for system/rewards)
  from: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Sender wallet address (if applicable)
  fromWallet: {
    type: String,
    trim: true
  },

  // Reference to the recipient
  to: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Recipient wallet address
  toWallet: {
    type: String,
    trim: true
  },

  // Amount of tokens transferred
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Transaction type
  type: {
    type: String,
    enum: ['REWARD', 'PURCHASE', 'TRANSFER', 'STAKE', 'UNSTAKE', 'PLATFORM_FEE'],
    required: true,
    index: true
  },

  // Description of the transaction
  description: {
    type: String,
    trim: true
  },

  // Reference ID for related activity (e.g., reward ID, marketplace purchase ID)
  referenceId: {
    type: String,
    index: true
  },

  // Transaction status
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'COMPLETED',
    index: true
  },

  // Blockchain transaction hash (if recorded on-chain)
  transactionHash: {
    type: String,
    sparse: true,
    index: true
  },

  // Metadata for additional transaction information
  metadata: {
    type: Object
  }
}, {
  timestamps: true
});

/**
 * Reward Record Schema
 * Tracks rewards given to users
 */
const RewardRecordSchema = new Schema({
  // Reference to the user who received the reward
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Reference to the reward rule that triggered this reward
  rule: {
    type: Schema.Types.ObjectId,
    ref: 'RewardRule',
    required: true,
    index: true
  },

  // Amount of tokens rewarded
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Activity that triggered the reward
  activityType: {
    type: String,
    required: true,
    index: true
  },

  // Reference to the related data (e.g., sensor data ID, workout ID)
  reference: {
    type: Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },

  // Model name for the reference field
  referenceModel: {
    type: String,
    enum: ['Data', 'User', 'Marketplace', 'Exercise', 'Challenge']
  },

  // Metadata about the reward context
  metadata: {
    type: Object
  },

  // Related transaction ID
  transaction: {
    type: Schema.Types.ObjectId,
    ref: 'TokenTransaction'
  }
}, {
  timestamps: true
});

/**
 * Reward Rule Schema
 * Defines rules for automatic token rewards
 */
const RewardRuleSchema = new Schema({
  // Name of the reward rule
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Description of what the rule rewards
  description: {
    type: String,
    trim: true
  },

  // Activity type that triggers this rule
  activityType: {
    type: String,
    required: true,
    index: true
  },

  // Conditions that must be met (stored as JSON logic)
  conditions: {
    type: Object,
    default: {}
  },

  // Reward calculation formula or fixed amount
  rewardFormula: {
    type: String,
    required: true
  },

  // Maximum reward per single activity
  maxReward: {
    type: Number,
    min: 0
  },

  // Time-based limits
  limits: {
    daily: {
      type: Number,
      min: 0
    },
    weekly: {
      type: Number,
      min: 0
    },
    monthly: {
      type: Number,
      min: 0
    }
  },

  // Is this rule currently active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Start date of the rule validity
  startDate: {
    type: Date,
    default: Date.now
  },

  // End date of the rule validity (optional)
  endDate: {
    type: Date
  },

  // Priority of the rule (for conflicts)
  priority: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create and export the models
const TokenBalance = mongoose.model('TokenBalance', TokenBalanceSchema);
const TokenTransaction = mongoose.model('TokenTransaction', TokenTransactionSchema);
const RewardRecord = mongoose.model('RewardRecord', RewardRecordSchema);
const RewardRule = mongoose.model('RewardRule', RewardRuleSchema);

module.exports = {
  TokenBalance,
  TokenTransaction,
  RewardRecord,
  RewardRule
}; 