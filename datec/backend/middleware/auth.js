/**
 * Authentication Middleware
 * Handles JWT token verification and authorization
 * Used by: All protected routes
 * 
 * @module middleware/auth
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from Authorization header
 * Attaches user data to req.user if valid
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function verifyToken(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided'
            });
        }

        // Extract token (format: "Bearer TOKEN")
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. Invalid token format'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user data to request
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            isAdmin: decoded.isAdmin || false
        };

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
}

/**
 * Verify user is an administrator
 * Must be used after verifyToken middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function verifyAdmin(req, res, next) {
    try {
        // Check if user data exists (verifyToken should run first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Check if user is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Administrator privileges required'
            });
        }

        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Authorization failed'
        });
    }
}

/**
 * Verify user owns the resource
 * Checks if req.user.username matches req.params.username
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function verifyOwnership(req, res, next) {
    try {
        // Check if user data exists
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Check if username matches (allow admins to bypass)
        if (req.user.username !== req.params.username && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only access your own resources'
            });
        }

        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Authorization failed'
        });
    }
}

/**
 * Optional authentication
 * Attaches user data if token is present, but doesn't require it
 * Useful for endpoints that work both with and without authentication
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            // No token provided, continue without user data
            return next();
        }

        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        if (!token) {
            return next();
        }

        // Try to verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            isAdmin: decoded.isAdmin || false
        };

        next();

    } catch (error) {
        // Invalid token, but continue without user data
        next();
    }
}

module.exports = {
    verifyToken,
    verifyAdmin,
    verifyOwnership,
    optionalAuth
};