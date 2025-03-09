/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default status code and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;
  
  // Log error
  console.error(`[ERROR] ${req.method} ${req.originalUrl}: ${err.stack}`);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (err.code === 11000) {
    // Mongoose duplicate key error
    statusCode = 409;
    message = 'Duplicate key error';
    
    const field = err.message.match(/index:\s+(\w+)_/);
    if (field) {
      message = `${field[1].charAt(0).toUpperCase() + field[1].slice(1)} already exists`;
    }
  }
  
  // Send consistent error response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler; 