/**
 * Request validation middleware using Joi
 */
const Joi = require('joi');

/**
 * Generates a validation middleware for request data
 * @param {Object} schema - Joi validation schema with req parts to validate
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false,  // Include all errors
      allowUnknown: true, // Ignore unknown props
      stripUnknown: true  // Remove unknown props
    };
    
    // Validate request parts defined in schema
    const validatePart = (part, source) => {
      if (schema[part]) {
        const { error, value } = schema[part].validate(source, validationOptions);
        if (error) {
          const errors = error.details.map(detail => ({
            message: detail.message,
            path: detail.path
          }));
          
          return { error: errors };
        }
        return { value };
      }
      return { value: source };
    };
    
    // Validate each request part (body, query, params)
    const bodyResult = validatePart('body', req.body);
    const queryResult = validatePart('query', req.query);
    const paramsResult = validatePart('params', req.params);
    
    // Check for validation errors
    if (bodyResult.error || queryResult.error || paramsResult.error) {
      const errors = [
        ...(bodyResult.error || []),
        ...(queryResult.error || []),
        ...(paramsResult.error || [])
      ];
      
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors
      });
    }
    
    // Replace req objects with validated data
    req.body = bodyResult.value;
    req.query = queryResult.value;
    req.params = paramsResult.value;
    
    next();
  };
};

module.exports = validate; 