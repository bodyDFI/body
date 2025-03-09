/**
 * Marketplace validation schemas
 */
const Joi = require('joi');

// Schema for creating a new data listing
const createListingSchema = {
  body: Joi.object({
    title: Joi.string().min(5).max(100).required().messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),
    description: Joi.string().min(20).max(5000).required().messages({
      'string.min': 'Description must be at least 20 characters',
      'string.max': 'Description cannot exceed 5000 characters',
      'any.required': 'Description is required'
    }),
    dataTypes: Joi.array().items(
      Joi.string().valid(
        'MOTION', 'BIOMETRIC', 'POSITION', 'TRAINING', 'SLEEP', 'HEALTH', 'DEMOGRAPHIC'
      )
    ).min(1).required().messages({
      'array.min': 'At least one data type must be selected',
      'any.required': 'Data types are required'
    }),
    price: Joi.number().min(0).required().messages({
      'number.min': 'Price cannot be negative',
      'any.required': 'Price is required'
    }),
    accessPeriod: Joi.number().integer().min(1).max(365).required().messages({
      'number.min': 'Access period must be at least 1 day',
      'number.max': 'Access period cannot exceed 365 days',
      'any.required': 'Access period is required'
    }),
    sampleData: Joi.string().allow('', null),
    tags: Joi.array().items(Joi.string().max(30)).max(10).messages({
      'array.max': 'Cannot exceed 10 tags'
    }),
    isPublic: Joi.boolean().default(true),
    license: Joi.string().valid(
      'CC0', 'CC_BY', 'CC_BY_SA', 'CC_BY_NC', 'CC_BY_NC_SA', 'PROPRIETARY'
    ).required().messages({
      'any.required': 'License type is required',
      'any.only': 'Invalid license type'
    })
  })
};

// Schema for updating a data listing
const updateListingSchema = {
  params: Joi.object({
    listingId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid listing ID format',
      'any.required': 'Listing ID is required'
    })
  }),
  body: Joi.object({
    title: Joi.string().min(5).max(100).messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 100 characters'
    }),
    description: Joi.string().min(20).max(5000).messages({
      'string.min': 'Description must be at least 20 characters',
      'string.max': 'Description cannot exceed 5000 characters'
    }),
    dataTypes: Joi.array().items(
      Joi.string().valid(
        'MOTION', 'BIOMETRIC', 'POSITION', 'TRAINING', 'SLEEP', 'HEALTH', 'DEMOGRAPHIC'
      )
    ).min(1).messages({
      'array.min': 'At least one data type must be selected'
    }),
    price: Joi.number().min(0).messages({
      'number.min': 'Price cannot be negative'
    }),
    accessPeriod: Joi.number().integer().min(1).max(365).messages({
      'number.min': 'Access period must be at least 1 day',
      'number.max': 'Access period cannot exceed 365 days'
    }),
    sampleData: Joi.string().allow('', null),
    tags: Joi.array().items(Joi.string().max(30)).max(10).messages({
      'array.max': 'Cannot exceed 10 tags'
    }),
    isPublic: Joi.boolean(),
    license: Joi.string().valid(
      'CC0', 'CC_BY', 'CC_BY_SA', 'CC_BY_NC', 'CC_BY_NC_SA', 'PROPRIETARY'
    ).messages({
      'any.only': 'Invalid license type'
    }),
    status: Joi.string().valid('ACTIVE', 'PAUSED', 'DRAFT').messages({
      'any.only': 'Invalid status'
    })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

// Schema for searching listings
const searchListingsSchema = {
  query: Joi.object({
    query: Joi.string().max(200).allow('', null),
    dataTypes: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ),
    priceMin: Joi.number().min(0),
    priceMax: Joi.number().greater(Joi.ref('priceMin')),
    tags: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ),
    provider: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    status: Joi.string().valid('ACTIVE', 'PAUSED', 'DRAFT'),
    sort: Joi.string().valid('price_asc', 'price_desc', 'date_asc', 'date_desc', 'popular'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

// Schema for purchasing data
const purchaseDataSchema = {
  body: Joi.object({
    listingId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid listing ID format',
      'any.required': 'Listing ID is required'
    }),
    paymentMethod: Joi.string().valid('TOKEN', 'FIAT').required().messages({
      'any.required': 'Payment method is required',
      'any.only': 'Invalid payment method'
    }),
    customAccessPeriod: Joi.number().integer().min(1).max(365).messages({
      'number.min': 'Custom access period must be at least 1 day',
      'number.max': 'Custom access period cannot exceed 365 days'
    }),
    notes: Joi.string().max(500).allow('', null),
    acceptTerms: Joi.boolean().valid(true).required().messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Acceptance of terms is required'
    })
  })
};

// Schema for rating a data purchase
const rateDataSchema = {
  params: Joi.object({
    purchaseId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid purchase ID format',
      'any.required': 'Purchase ID is required'
    })
  }),
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
      'any.required': 'Rating is required'
    }),
    review: Joi.string().max(1000).allow('', null).messages({
      'string.max': 'Review cannot exceed 1000 characters'
    })
  })
};

// Schema for getting marketplace settings
const getMarketplaceSettingsSchema = {};

// Schema for updating marketplace settings (admin only)
const updateMarketplaceSettingsSchema = {
  body: Joi.object({
    platformFeePercentage: Joi.number().min(0).max(50).messages({
      'number.min': 'Platform fee percentage cannot be negative',
      'number.max': 'Platform fee percentage cannot exceed 50%'
    }),
    tokenHolderFeePercentage: Joi.number().min(0).max(50).messages({
      'number.min': 'Token holder fee percentage cannot be negative',
      'number.max': 'Token holder fee percentage cannot exceed 50%'
    }),
    providerFeePercentage: Joi.number().min(50).max(100).messages({
      'number.min': 'Provider fee percentage must be at least 50%',
      'number.max': 'Provider fee percentage cannot exceed 100%'
    }),
    minListingPrice: Joi.number().min(0).messages({
      'number.min': 'Minimum listing price cannot be negative'
    }),
    maxListingPrice: Joi.number().greater(Joi.ref('minListingPrice')).messages({
      'number.greater': 'Maximum listing price must be greater than minimum listing price'
    }),
    featuredListingCost: Joi.number().min(0).messages({
      'number.min': 'Featured listing cost cannot be negative'
    }),
    maxPurchasesPerDay: Joi.number().integer().min(1).messages({
      'number.min': 'Maximum purchases per day must be at least 1'
    })
  })
};

module.exports = {
  createListingSchema,
  updateListingSchema,
  searchListingsSchema,
  purchaseDataSchema,
  rateDataSchema,
  getMarketplaceSettingsSchema,
  updateMarketplaceSettingsSchema
}; 