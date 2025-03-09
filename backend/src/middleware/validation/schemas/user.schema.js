/**
 * User validation schemas
 */
const Joi = require('joi');

// Common schema elements
const email = Joi.string().email().required().messages({
  'string.email': 'Please provide a valid email address',
  'any.required': 'Email is required'
});

const password = Joi.string()
  .min(8)
  .required()
  .pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required'
  });

const name = Joi.string().min(2).max(50).required().messages({
  'string.min': 'Name must be at least 2 characters',
  'string.max': 'Name cannot exceed 50 characters',
  'any.required': 'Name is required'
});

// Validation schemas
const registerSchema = {
  body: Joi.object({
    email,
    password,
    name,
    username: Joi.string().alphanum().min(3).max(30).required().messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    })
  })
};

const loginSchema = {
  body: Joi.object({
    email: Joi.alternatives().try(
      email,
      Joi.string().alphanum().min(3).max(30).required()
    ).required(),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  })
};

const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(50).messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters'
    }),
    bio: Joi.string().max(500).allow('', null),
    avatar: Joi.string().uri().allow('', null).messages({
      'string.uri': 'Avatar must be a valid URL'
    }),
    preferences: Joi.object(),
    phoneNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/).allow('', null).messages({
      'string.pattern.base': 'Phone number must be in valid format (8-15 digits)'
    })
  })
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required'
    }),
    newPassword: password,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
  })
};

const forgotPasswordSchema = {
  body: Joi.object({
    email
  })
};

const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required'
    }),
    password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
  })
};

const confirmEmailSchema = {
  body: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Confirmation token is required'
    })
  })
};

const getUserByIdSchema = {
  params: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
  })
};

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  confirmEmailSchema,
  getUserByIdSchema
}; 