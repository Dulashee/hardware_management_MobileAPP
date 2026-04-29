const asyncHandler = require('express-async-handler');

/**
 * Custom Error class that extends built-in Error
 * Includes HTTP status code and operational flag
 * 
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
  /**
   * Creates an AppError instance
   * 
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Handles both operational and programming errors
 * Sends appropriate error response based on environment
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    // Development: Send detailed error information
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Production: Send sanitized error information
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // Programming or unknown error: don't leak details
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
      });
    }
  }
};

/**
 * Middleware for handling 404 - Resource Not Found
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Wrapper function to catch async route errors and pass them to error handler
 * Eliminates need for try-catch blocks in async route handlers
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  globalErrorHandler,
  notFound,
  catchAsync,
};
