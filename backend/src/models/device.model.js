const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * BodyDFi设备模型
 * 用于存储用户注册的设备信息
 */
const DeviceSchema = new Schema({
  // 关联的用户
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 设备唯一标识符
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  
  // 设备显示名称
  deviceName: {
    type: String,
    required: true,
    trim: true
  },
  
  // 设备类型 (basic, pro, medical)
  deviceType: {
    type: String,
    required: true,
    enum: ['basic', 'pro', 'medical'],
    default: 'basic',
    index: true
  },
  
  // 设备状态 (active, inactive, lost)
  status: {
    type: String,
    enum: ['active', 'inactive', 'lost'],
    default: 'active',
    index: true
  },
  
  // 设备注册时间
  registeredAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 最后连接时间
  lastConnected: {
    type: Date,
    default: null
  },
  
  // 固件版本
  firmwareVersion: {
    type: String,
    default: '1.0.0'
  },
  
  // 设备配置
  config: {
    // 采样率 (Hz)
    samplingRate: {
      type: Number,
      default: 50,
      min: 1,
      max: 200
    },
    
    // 数据模式 (0: 原始数据, 1: 处理数据, 2: 全部数据)
    dataMode: {
      type: Number,
      default: 1,
      enum: [0, 1, 2]
    },
    
    // 功率节能模式
    powerSaving: {
      type: Boolean,
      default: true
    },
    
    // 自动数据上传
    autoUpload: {
      type: Boolean,
      default: true
    },
    
    // 自定义配置参数
    customParams: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    }
  },
  
  // 数据共享设置
  dataSharingEnabled: {
    type: Boolean,
    default: false
  },
  
  // 设备元数据
  metadata: {
    // MAC地址
    macAddress: {
      type: String
    },
    
    // 硬件版本
    hardwareVersion: {
      type: String
    },
    
    // 设备能力
    capabilities: {
      hasAccelerometer: { type: Boolean, default: true },
      hasGyroscope: { type: Boolean, default: true },
      hasHeartRate: { type: Boolean, default: false },
      hasOxygenSaturation: { type: Boolean, default: false },
      hasEMG: { type: Boolean, default: false },
      hasTemperature: { type: Boolean, default: false },
      hasPressure: { type: Boolean, default: false }
    },
    
    // 设备最大采样率
    maxSamplingRate: {
      type: Number,
      default: 50
    },
    
    // 制造商信息
    manufacturer: {
      type: String,
      default: 'BodyDFi Inc.'
    },
    
    // 设备序列号
    serialNumber: {
      type: String
    }
  },
  
  // 设备统计信息
  stats: {
    // 总数据点数
    totalDataPoints: {
      type: Number,
      default: 0
    },
    
    // 总使用时间（分钟）
    totalUsageMinutes: {
      type: Number,
      default: 0
    },
    
    // 电池状态 (0-100)
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    
    // 存储使用率 (0-100)
    storageUsage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // 验证状态
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verificationMethod: {
      type: String,
      enum: ['manual', 'blockchain', 'manufacturer', null],
      default: null
    }
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  collection: 'devices'
});

// 索引
DeviceSchema.index({ user: 1, deviceType: 1 }); // 用户设备类型索引
DeviceSchema.index({ deviceId: 1, user: 1 }, { unique: true }); // 设备ID用户唯一索引

// 虚拟属性：设备年龄（天）
DeviceSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.registeredAt) / (1000 * 60 * 60 * 24));
});

// 静态方法：查找用户的活跃设备
DeviceSchema.statics.findActiveDevices = function(userId) {
  return this.find({ user: userId, status: 'active' });
};

// 实例方法：更新设备连接状态
DeviceSchema.methods.updateConnectionStatus = function() {
  this.lastConnected = Date.now();
  return this.save();
};

// 创建模型
const Device = mongoose.model('Device', DeviceSchema);

module.exports = Device; 