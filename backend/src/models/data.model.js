const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * BodyDFi数据模型
 * 用于存储从设备收集的传感器数据
 */
const DataSchema = new Schema({
  // 关联的用户
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 关联的设备
  device: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  
  // 设备类型 (basic, pro, medical)
  deviceType: {
    type: String,
    required: true,
    enum: ['basic', 'pro', 'medical'],
    index: true
  },
  
  // 数据收集时间戳
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 数据哈希，用于唯一标识和区块链记录
  dataHash: {
    type: String,
    required: true,
    unique: true
  },
  
  // 实际指标数据
  metrics: {
    // 加速度数据 [x, y, z]
    acceleration: {
      type: [Number],
      validate: {
        validator: function(arr) {
          return arr.length === 3;
        },
        message: '加速度数据必须是3个元素的数组 [x, y, z]'
      }
    },
    
    // 陀螺仪数据 [x, y, z]
    gyroscope: {
      type: [Number],
      validate: {
        validator: function(arr) {
          return arr.length === 3;
        },
        message: '陀螺仪数据必须是3个元素的数组 [x, y, z]'
      }
    },
    
    // 心率数据
    heartRate: {
      type: Number,
      min: 30,
      max: 220
    },
    
    // 血氧饱和度 (Pro和Medical设备)
    oxygenSaturation: {
      type: Number,
      min: 70,
      max: 100
    },
    
    // 活动水平
    activityLevel: {
      type: Number,
      min: 0,
      max: 10
    },
    
    // 步数
    steps: {
      type: Number,
      min: 0
    },
    
    // 温度 (Medical设备)
    temperature: {
      type: Number
    },
    
    // 肌电图数据 (Medical设备)
    emg: {
      type: [Number]
    },
    
    // 其他扩展指标
    extendedMetrics: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  
  // 数据处理标志
  processed: {
    type: Boolean,
    default: false
  },
  
  // 数据状态 (pending, confirmed, blockchain_failed, rejected)
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'blockchain_failed', 'rejected'],
    default: 'pending',
    index: true
  },
  
  // 区块链相关信息
  blockchain: {
    // 是否已提交到区块链
    submitted: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // 交易签名
    txSignature: {
      type: String
    },
    
    // 提交时间
    timestamp: {
      type: Date
    },
    
    // 确认数
    confirmations: {
      type: Number,
      default: 0
    },
    
    // 区块槽
    slot: {
      type: Number
    }
  },
  
  // 是否已删除 (用于软删除)
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // 质量评分 (用于数据市场)
  qualityScore: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  collection: 'data'
});

// 索引
DataSchema.index({ user: 1, timestamp: -1 }); // 用户数据时间索引
DataSchema.index({ device: 1, timestamp: -1 }); // 设备数据时间索引
DataSchema.index({ deviceType: 1, timestamp: -1 }); // 设备类型时间索引
DataSchema.index({ 'blockchain.submitted': 1, status: 1 }); // 区块链状态索引

// 虚拟属性：数据年龄（天）
DataSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.timestamp) / (1000 * 60 * 60 * 24));
});

// 预处理：查询中排除已删除的文档
DataSchema.pre('find', function() {
  this.where({ deleted: { $ne: true } });
});

DataSchema.pre('findOne', function() {
  this.where({ deleted: { $ne: true } });
});

DataSchema.pre('countDocuments', function() {
  this.where({ deleted: { $ne: true } });
});

// 创建模型
const Data = mongoose.model('Data', DataSchema);

module.exports = Data; 