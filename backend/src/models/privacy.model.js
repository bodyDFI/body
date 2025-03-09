/**
 * Privacy Model
 * Handles user privacy settings and data access controls
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Privacy Settings Schema
 * Stores user privacy preferences and data sharing settings
 */
const PrivacySettingsSchema = new Schema({
  // Reference to the user who owns these settings
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Data sharing preferences
  dataSharing: {
    // General data sharing setting
    enabled: {
      type: Boolean,
      default: false
    },

    // Specific data type sharing settings
    sensorData: {
      type: Boolean,
      default: false
    },
    healthMetrics: {
      type: Boolean,
      default: false
    },
    activityData: {
      type: Boolean,
      default: false
    },
    sleepData: {
      type: Boolean,
      default: false
    },
    demographicData: {
      type: Boolean,
      default: false
    }
  },

  // Profile visibility settings
  profileVisibility: {
    // Profile visibility level
    level: {
      type: String,
      enum: ['PUBLIC', 'REGISTERED_USERS', 'CONNECTIONS', 'PRIVATE'],
      default: 'REGISTERED_USERS'
    },

    // Specific profile elements visibility
    name: {
      type: Boolean,
      default: true
    },
    bio: {
      type: Boolean,
      default: true
    },
    avatar: {
      type: Boolean,
      default: true
    },
    activityStats: {
      type: Boolean,
      default: true
    },
    achievements: {
      type: Boolean,
      default: true
    },
    tokenBalance: {
      type: Boolean,
      default: false
    }
  },

  // Marketplace settings
  marketplace: {
    // List as data provider
    listAsProvider: {
      type: Boolean,
      default: false
    },

    // Show as verified provider
    showAsVerified: {
      type: Boolean,
      default: true
    },

    // Show provider reputation
    showReputation: {
      type: Boolean,
      default: true
    }
  },

  // Specific user permissions
  userPermissions: [{
    // User who is granted permissions
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Relationship with the user
    relationship: {
      type: String,
      enum: ['TRAINER', 'DOCTOR', 'RESEARCHER', 'FRIEND', 'FAMILY', 'OTHER'],
      default: 'OTHER'
    },

    // Specific data access permissions
    permissions: {
      sensorData: {
        type: Boolean,
        default: false
      },
      healthMetrics: {
        type: Boolean,
        default: false
      },
      activityData: {
        type: Boolean,
        default: false
      },
      sleepData: {
        type: Boolean,
        default: false
      },
      demographicData: {
        type: Boolean,
        default: false
      }
    },

    // Date until which permissions are granted (null = indefinite)
    expiresAt: {
      type: Date
    }
  }],

  // Data anonymization settings
  anonymization: {
    // Enable data anonymization
    enabled: {
      type: Boolean,
      default: true
    },
    
    // Fields to anonymize (e.g., "name", "location", "age")
    anonymizeFields: [{
      type: String
    }],
    
    // Anonymization level
    level: {
      type: String,
      enum: ['BASIC', 'MODERATE', 'STRICT'],
      default: 'MODERATE'
    }
  },

  // Notification settings
  notifications: {
    // Notify on data access
    dataAccess: {
      type: Boolean,
      default: true
    },
    
    // Notify on marketplace activities
    marketplaceActivity: {
      type: Boolean,
      default: true
    },
    
    // Notify on permission changes
    permissionChanges: {
      type: Boolean,
      default: true
    }
  },

  // User's encryption key info (for end-to-end encryption)
  encryption: {
    // Indicator if user has set up encryption
    enabled: {
      type: Boolean,
      default: false
    },
    
    // Encrypted master key (encrypted with user's password)
    encryptedMasterKey: {
      type: String
    },
    
    // Hint for recovering the encryption key
    recoveryHint: {
      type: String
    },
    
    // Date when encryption was last updated
    lastUpdated: {
      type: Date
    }
  },

  // GDPR and data rights settings
  dataRetention: {
    // Automatic data deletion period (in days, null = no automatic deletion)
    automaticDeletionPeriod: {
      type: Number,
      min: 30
    },
    
    // Data export format preference
    exportFormat: {
      type: String,
      enum: ['JSON', 'CSV', 'XML'],
      default: 'JSON'
    }
  }
}, {
  timestamps: true
});

/**
 * Data Access Log Schema
 * Records all instances of data access for audit purposes
 */
const DataAccessLogSchema = new Schema({
  // User whose data was accessed
  dataOwner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // User or service that accessed the data
  accessedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // If accessed by a service or API
  accessedByService: {
    type: String
  },

  // Type of data that was accessed
  dataType: {
    type: String,
    enum: ['SENSOR_DATA', 'HEALTH_METRICS', 'ACTIVITY_DATA', 'SLEEP_DATA', 'DEMOGRAPHIC_DATA', 'USER_PROFILE', 'ALL'],
    required: true
  },

  // Access operation performed
  operation: {
    type: String,
    enum: ['READ', 'WRITE', 'EXPORT', 'DELETE', 'MARKETPLACE_PURCHASE'],
    required: true
  },

  // Purpose of the access
  purpose: {
    type: String
  },

  // Access timestamp
  accessedAt: {
    type: Date,
    default: Date.now
  },

  // Whether access was authorized
  isAuthorized: {
    type: Boolean,
    required: true
  },

  // Reference to the specific data object accessed
  dataReference: {
    type: Schema.Types.ObjectId,
    refPath: 'dataReferenceModel'
  },

  // Type of referenced data
  dataReferenceModel: {
    type: String,
    enum: ['Data', 'User', 'DataListing', 'DataPurchase', 'HealthMetric']
  },

  // Additional context about the access
  accessContext: {
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    location: {
      country: String,
      region: String,
      city: String
    }
  }
});

/**
 * Data Deletion Request Schema
 * Handles user requests for data deletion (GDPR right to be forgotten)
 */
const DataDeletionRequestSchema = new Schema({
  // User who requested deletion
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Specific data types to delete (empty = all data)
  dataTypes: [{
    type: String,
    enum: ['SENSOR_DATA', 'HEALTH_METRICS', 'ACTIVITY_DATA', 'SLEEP_DATA', 'DEMOGRAPHIC_DATA', 'USER_PROFILE', 'ALL']
  }],

  // Reason for deletion request
  reason: {
    type: String
  },

  // Request status
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },

  // Admin notes about the request
  adminNotes: {
    type: String
  },

  // Completion timestamp
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

/**
 * Authorized Device Schema
 * Manages devices authorized to access user data
 */
const AuthorizedDeviceSchema = new Schema({
  // User who authorized the device
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Device identifier
  deviceId: {
    type: String,
    required: true
  },

  // Device name
  deviceName: {
    type: String,
    required: true
  },

  // Device type
  deviceType: {
    type: String,
    enum: ['MOBILE', 'TABLET', 'DESKTOP', 'WEARABLE', 'OTHER'],
    default: 'OTHER'
  },

  // Device information
  deviceInfo: {
    osName: String,
    osVersion: String,
    browser: String,
    appVersion: String
  },

  // Last login from this device
  lastActive: {
    type: Date,
    default: Date.now
  },

  // Whether this device is currently trusted
  isActive: {
    type: Boolean,
    default: true
  },

  // Date after which the authorization expires
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create compound index for user and deviceId
AuthorizedDeviceSchema.index({ user: 1, deviceId: 1 }, { unique: true });

// Create and export the models
const PrivacySettings = mongoose.model('PrivacySettings', PrivacySettingsSchema);
const DataAccessLog = mongoose.model('DataAccessLog', DataAccessLogSchema);
const DataDeletionRequest = mongoose.model('DataDeletionRequest', DataDeletionRequestSchema);
const AuthorizedDevice = mongoose.model('AuthorizedDevice', AuthorizedDeviceSchema);

module.exports = {
  PrivacySettings,
  DataAccessLog,
  DataDeletionRequest,
  AuthorizedDevice
}; 