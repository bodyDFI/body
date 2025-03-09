const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * 数据列表模型 - 用户发布在市场上出售的数据列表
 */
const DataListingSchema = new Schema({
  // 数据提供者（所有者）
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 提供者钱包地址
  providerWallet: {
    type: String,
    required: true,
    index: true
  },
  
  // 列表标题
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // 列表描述
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // 数据类型
  dataType: {
    type: String,
    required: true,
    enum: ['basic', 'pro', 'medical'],
    index: true
  },
  
  // 数据类别
  category: {
    type: String,
    required: true,
    enum: ['fitness', 'health', 'medical', 'sports', 'sleep', 'nutrition', 'other'],
    index: true
  },
  
  // 设备来源
  deviceSource: {
    type: Schema.Types.ObjectId,
    ref: 'Device'
  },
  
  // 价格 (通证数量)
  price: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 访问时长 (天数)
  accessPeriod: {
    type: Number,
    required: true,
    min: 1,
    default: 30
  },
  
  // 包含的数据点数量
  dataPointsCount: {
    type: Number,
    required: true,
    min: 1
  },
  
  // 时间范围
  timeframe: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  // 包含的数据样本 (哈希列表)
  dataHashes: [{
    type: String
  }],
  
  // 数据列表状态
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'suspended', 'sold_out'],
    default: 'active',
    index: true
  },
  
  // 区块链记录
  blockchain: {
    // 是否已记录在链上
    registered: {
      type: Boolean,
      default: false
    },
    
    // 链上ID
    listingId: {
      type: String,
      sparse: true,
      index: true
    },
    
    // 交易签名
    txSignature: {
      type: String
    },
    
    // 注册时间
    registeredAt: {
      type: Date
    }
  },
  
  // 元数据和标签
  metadata: {
    // 标签
    tags: [{
      type: String
    }],
    
    // 覆盖时间段 (天数)
    periodLength: {
      type: Number
    },
    
    // 数据频率 (每天采样次数)
    frequency: {
      type: Number
    },
    
    // 数据质量评分 (0-100)
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    
    // 其他元数据
    additionalInfo: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  
  // 统计信息
  stats: {
    // 浏览次数
    views: {
      type: Number,
      default: 0
    },
    
    // 购买次数
    purchases: {
      type: Number,
      default: 0
    },
    
    // 平均评分
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    
    // 评分次数
    ratingCount: {
      type: Number,
      default: 0
    }
  },
  
  // 特色标志
  featured: {
    type: Boolean,
    default: false
  },
  
  // 预览图片URL
  previewImageUrl: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'marketplace_listings'
});

// 索引
DataListingSchema.index({ provider: 1, status: 1 });
DataListingSchema.index({ category: 1, dataType: 1, status: 1 });
DataListingSchema.index({ price: 1, status: 1 });
DataListingSchema.index({ 'stats.rating': -1, status: 1 });
DataListingSchema.index({ 'stats.purchases': -1, status: 1 });
DataListingSchema.index({ featured: 1, status: 1 });
DataListingSchema.index({ 
  title: 'text', 
  description: 'text', 
  'metadata.tags': 'text' 
});

/**
 * 数据购买模型 - 记录用户购买的数据访问记录
 */
const DataPurchaseSchema = new Schema({
  // 购买者
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 购买者钱包地址
  buyerWallet: {
    type: String,
    required: true
  },
  
  // 相关数据列表
  listing: {
    type: Schema.Types.ObjectId,
    ref: 'DataListing',
    required: true,
    index: true
  },
  
  // 数据提供者
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 价格 (通证数量)
  price: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 访问时长 (天数)
  accessPeriod: {
    type: Number,
    required: true,
    min: 1
  },
  
  // 访问开始时间
  accessStartDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // 访问结束时间
  accessEndDate: {
    type: Date,
    required: true
  },
  
  // 访问状态
  status: {
    type: String,
    required: true,
    enum: ['active', 'expired', 'revoked', 'refunded'],
    default: 'active',
    index: true
  },
  
  // 访问密钥 (加密访问数据)
  accessKey: {
    type: String,
    required: true
  },
  
  // 区块链记录
  blockchain: {
    // 交易签名
    txSignature: {
      type: String,
      required: true
    },
    
    // 确认数
    confirmations: {
      type: Number,
      default: 0
    }
  },
  
  // 访问记录
  accessLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['view', 'download', 'export', 'other']
    },
    details: {
      type: String
    }
  }],
  
  // 用户评分和评价
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 500
    },
    createdAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  collection: 'marketplace_purchases'
});

// 索引
DataPurchaseSchema.index({ buyer: 1, status: 1 });
DataPurchaseSchema.index({ listing: 1, status: 1 });
DataPurchaseSchema.index({ provider: 1, status: 1 });
DataPurchaseSchema.index({ accessEndDate: 1, status: 1 });

/**
 * 数据访问请求模型 - 数据访问请求记录
 */
const DataAccessRequestSchema = new Schema({
  // 请求者
  requester: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 数据提供者
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 数据列表 (可选，可能是直接请求)
  listing: {
    type: Schema.Types.ObjectId,
    ref: 'DataListing'
  },
  
  // 请求类型
  requestType: {
    type: String,
    required: true,
    enum: ['purchase', 'custom', 'collaboration'],
    default: 'purchase'
  },
  
  // 请求描述
  message: {
    type: String,
    maxlength: 1000
  },
  
  // 请求状态
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  // 价格提议 (通证数量，对于自定义请求)
  proposedPrice: {
    type: Number,
    min: 0
  },
  
  // 请求的访问期限 (天)
  proposedPeriod: {
    type: Number,
    min: 1
  },
  
  // 请求的数据类型和范围
  requestedData: {
    dataTypes: [{
      type: String
    }],
    timeframe: {
      startDate: Date,
      endDate: Date
    },
    specificRequirements: {
      type: String,
      maxlength: 2000
    }
  },
  
  // 响应消息
  responseMessage: {
    type: String,
    maxlength: 1000
  },
  
  // 响应时间
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'marketplace_access_requests'
});

// 索引
DataAccessRequestSchema.index({ requester: 1, status: 1 });
DataAccessRequestSchema.index({ provider: 1, status: 1 });
DataAccessRequestSchema.index({ requestType: 1, status: 1 });

/**
 * 市场设置模型 - 市场全局配置和用户设置
 */
const MarketplaceSettingsSchema = new Schema({
  // 设置类型 (全局或用户特定)
  type: {
    type: String,
    required: true,
    enum: ['global', 'user'],
    index: true
  },
  
  // 用户 (用户特定设置)
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true
  },
  
  // 费用设置 (全局)
  fees: {
    // 平台服务费率 (百分比)
    platformFee: {
      type: Number,
      min: 0,
      max: 50,
      default: 5
    },
    
    // 列表发布费 (通证数量)
    listingFee: {
      type: Number,
      min: 0,
      default: 1
    }
  },
  
  // 特色列表设置 (全局)
  featured: {
    // 特色列表费用
    fee: {
      type: Number,
      min: 0,
      default: 10
    },
    
    // 特色持续时间 (天)
    duration: {
      type: Number,
      min: 1,
      default: 7
    }
  },
  
  // 用户市场设置
  userSettings: {
    // 自动接受购买
    autoAcceptPurchases: {
      type: Boolean,
      default: true
    },
    
    // 接收购买通知
    purchaseNotifications: {
      type: Boolean,
      default: true
    },
    
    // 数据质量标准
    qualityThreshold: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    
    // 默认访问期限 (天)
    defaultAccessPeriod: {
      type: Number,
      min: 1,
      default: 30
    },
    
    // 默认定价
    defaultPricing: {
      basic: {
        type: Number,
        min: 0,
        default: 10
      },
      pro: {
        type: Number,
        min: 0,
        default: 50
      },
      medical: {
        type: Number,
        min: 0,
        default: 100
      }
    }
  },
  
  // 白名单设置
  whitelist: {
    // 启用白名单
    enabled: {
      type: Boolean,
      default: false
    },
    
    // 白名单地址列表
    addresses: [{
      type: String
    }]
  }
}, {
  timestamps: true,
  collection: 'marketplace_settings'
});

// 索引
MarketplaceSettingsSchema.index({ type: 1, user: 1 }, { unique: true });

// 创建模型
const DataListing = mongoose.model('DataListing', DataListingSchema);
const DataPurchase = mongoose.model('DataPurchase', DataPurchaseSchema);
const DataAccessRequest = mongoose.model('DataAccessRequest', DataAccessRequestSchema);
const MarketplaceSettings = mongoose.model('MarketplaceSettings', MarketplaceSettingsSchema);

module.exports = {
  DataListing,
  DataPurchase,
  DataAccessRequest,
  MarketplaceSettings
}; 