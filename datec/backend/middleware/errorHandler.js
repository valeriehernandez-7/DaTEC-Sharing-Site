/**
 * Error Handler Middleware
 * Centralized error handling for the application
 * Must be the last middleware in the chain
 * 
 * @module middleware/errorHandler
 */

/**
 * Global error handler
 * Catches all errors thrown in the application
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
    // Log error for debugging
    console.error('Error occurred:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Default error status and message
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';

    // Handle specific error types

    // MongoDB errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        if (err.code === 11000) {
            // Duplicate key error
            const field = Object.keys(err.keyPattern)[0];
            statusCode = 409;
            message = `${field} already exists`;
        } else {
            statusCode = 500;
            message = 'Database operation failed';
        }
    }

    // Validation errors (from Joi)
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.details ? err.details[0].message : 'Validation failed';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication token expired';
    }

    // Cast errors (invalid ObjectId, etc.)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
    }

    // Multer errors (should be handled by upload middleware, but just in case)
    if (err.name === 'MulterError') {
        statusCode = 400;
        message = `File upload error: ${err.message}`;
    }

    // Neo4j errors
    if (err.name === 'Neo4jError') {
        statusCode = 500;
        message = 'Graph database operation failed';
    }

    // Redis errors
    if (err.name === 'RedisError' || err.name === 'ReplyError') {
        statusCode = 500;
        message = 'Cache operation failed';
    }

    // CouchDB errors
    if (err.statusCode === 404 && err.error === 'not_found') {
        statusCode = 404;
        message = 'Resource not found';
    }

    if (err.statusCode === 409 && err.error === 'conflict') {
        statusCode = 409;
        message = 'Resource conflict';
    }

    // Send error response
    const errorResponse = {
        success: false,
        error: message
    };

    // Include stack trace in development mode
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err;
    }

    res.status(statusCode).json(errorResponse);
}

/**
 * Not found handler
 * Handles 404 errors for routes that don't exist
 * Should be placed before the error handler
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * Eliminates need for try-catch in every controller
 * 
 * Usage: router.get('/path', asyncHandler(controller.method))
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Create custom error
 * Helper function to create errors with status codes
 * 
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Error object with statusCode property
 */
function createError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    createError
};