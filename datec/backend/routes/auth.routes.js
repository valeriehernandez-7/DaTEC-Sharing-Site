/**
 * Authentication Routes
 * Handles user registration and login endpoints
 * 
 * @module routes/auth.routes
 * 
 * Routes:
 * - POST /api/auth/register - Register new user (HU1)
 * - POST /api/auth/login - User login (HU1)
 * - GET /api/auth/me - User login (HU1)
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { uploadAvatar } = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register new user
 * Body: username, email_address, password, full_name, birth_date
 * File: avatar (optional)
 */
router.post('/register', uploadAvatar, controller.register);

/**
 * POST /api/auth/login
 * User login
 * Body: username, password
 */
router.post('/login', controller.login);

/**
 * GET /api/auth/me
 * Get current user info
 * Requires: Authentication
 */
router.get('/me', verifyToken, controller.getCurrentUser);

module.exports = router;