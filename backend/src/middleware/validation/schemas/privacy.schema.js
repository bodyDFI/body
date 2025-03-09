/**
 * Privacy validation schemas
 */
const Joi = require('joi');

// Schema for updating privacy settings
const updatePrivacySettingsSchema = {
  body: Joi.object({
    dataSharing: Joi.object({
      enabled: Joi.boolean(),
      sensorData: Joi.boolean(),
      healthMetrics: Joi.boolean(),
      activityData: Joi.boolean(),
      sleepData: Joi.boolean(),
      demographicData: Joi.boolean()
    }),
    profileVisibility: Joi.object({
      level: Joi.string().valid('PUBLIC', 'REGISTERED_USERS', 'CONNECTIONS', 'PRIVATE'),
      name: Joi.boolean(),
      bio: Joi.boolean(),
      avatar: Joi.boolean(),
      activityStats: Joi.boolean(),
      achievements: Joi.boolean(),
      tokenBalance: Joi.boolean()
    }),
    marketplace: Joi.object({
      listAsProvider: Joi.boolean(),
      showAsVerified: Joi.boolean(),
      showReputation: Joi.boolean()
    }),
    userPermissions: Joi.array().items(
      Joi.object({
        user: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
          'string.pattern.base': 'Invalid user ID format',
          'any.required': 'User ID is required'
        }),
        relationship: Joi.string().valid('TRAINER', 'DOCTOR', 'RESEARCHER', 'FRIEND', 'FAMILY', 'OTHER'),
        permissions: Joi.object({
          sensorData: Joi.boolean(),
          healthMetrics: Joi.boolean(),
          activityData: Joi.boolean(),
          sleepData: Joi.boolean(),
          demographicData: Joi.boolean()
        }),
        expiresAt: Joi.date().allow(null)
      })
    ),
    anonymization: Joi.object({
      enabled: Joi.boolean(),
      anonymizeFields: Joi.array().items(Joi.string()),
      level: Joi.string().valid('BASIC', 'MODERATE', 'STRICT')
    }),
    notifications: Joi.object({
      dataAccess: Joi.boolean(),
      marketplaceActivity: Joi.boolean(),
      permissionChanges: Joi.boolean()
    }),
    dataRetention: Joi.object({
      automaticDeletionPeriod: Joi.number().min(30),
      exportFormat: Joi.string().valid('JSON', 'CSV', 'XML')
    })
  }).min(1).messages({
    'object.min': 'At least one setting must be provided for update'
  })
};

// Schema for getting access logs
const getAccessLogsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    dataType: Joi.string().valid('SENSOR_DATA', 'HEALTH_METRICS', 'ACTIVITY_DATA', 
                                 'SLEEP_DATA', 'DEMOGRAPHIC_DATA', 'USER_PROFILE', 'ALL'),
    operation: Joi.string().valid('READ', 'WRITE', 'EXPORT', 'DELETE', 'MARKETPLACE_PURCHASE'),
    isAuthorized: Joi.boolean(),
    accessedBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    sort: Joi.string().valid('date_asc', 'date_desc').default('date_desc')
  })
};

// Schema for data deletion request
const deletionRequestSchema = {
  body: Joi.object({
    dataTypes: Joi.array().items(
      Joi.string().valid('SENSOR_DATA', 'HEALTH_METRICS', 'ACTIVITY_DATA', 
                         'SLEEP_DATA', 'DEMOGRAPHIC_DATA', 'USER_PROFILE', 'ALL')
    ).min(1).required().messages({
      'array.min': 'At least one data type must be selected',
      'any.required': 'Data types are required'
    }),
    reason: Joi.string().max(500).allow('', null).messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
  })
};

// Schema for setting encryption key
const setEncryptionKeySchema = {
  body: Joi.object({
    masterKey: Joi.string().required().messages({
      'any.required': 'Master key is required'
    }),
    recoveryHint: Joi.string().max(200).required().messages({
      'string.max': 'Recovery hint cannot exceed 200 characters',
      'any.required': 'Recovery hint is required'
    })
  })
};

// Schema for device authorization
const deviceAuthorizationSchema = {
  body: Joi.object({
    deviceId: Joi.string().required().messages({
      'any.required': 'Device ID is required'
    }),
    deviceName: Joi.string().required().messages({
      'any.required': 'Device name is required'
    }),
    deviceType: Joi.string().valid('MOBILE', 'TABLET', 'DESKTOP', 'WEARABLE', 'OTHER'),
    deviceInfo: Joi.object({
      osName: Joi.string(),
      osVersion: Joi.string(),
      browser: Joi.string(),
      appVersion: Joi.string()
    }),
    expiresAt: Joi.date().allow(null)
  })
};

// Schema for device ID parameter
const deviceIdParamSchema = {
  params: Joi.object({
    deviceId: Joi.string().required().messages({
      'any.required': 'Device ID is required'
    })
  })
};

module.exports = {
  updatePrivacySettingsSchema,
  getAccessLogsSchema,
  deletionRequestSchema,
  setEncryptionKeySchema,
  deviceAuthorizationSchema,
  deviceIdParamSchema
}; 