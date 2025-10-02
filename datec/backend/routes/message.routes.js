/**
 * Message Routes
 * Handles private messaging endpoints
 * 
 * @module routes/message.routes
 * 
 * Routes:
 * - POST /api/messages/:fromUsername/:toUser  - Send message (HU21)
 * - GET  /api/messages/:fromUsername/:toUser  - Get conversation thread (HU21)
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/message.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * All message routes require authentication
 */
router.use(verifyToken);

/**
 * GET /api/messages/:fromUsername/:toUser
 * Get conversation thread between two users
 * Requires: Authentication (user must be one of the participants)
 * 
 * Response: { success, conversation, messages[] }
 * 
 * Privacy: Only the two participants can view their conversation
 * 
 * Example: GET /api/messages/john_doe/jane_doe
 * Returns all messages between john_doe and jane_doe (both directions)
 */
router.get('/:fromUsername/:toUser', controller.getThread);

/**
 * POST /api/messages/:fromUsername/:toUser
 * Send a private message to another user
 * Requires: Authentication (fromUsername must match authenticated user)
 * 
 * Body (JSON):
 *   - content: string (required, 1-5000 chars)
 * 
 * Response: { success, message, data }
 * 
 * Validations:
 *   - Cannot send message as another user
 *   - Cannot message yourself
 *   - Recipient must exist
 * 
 * Example: POST /api/messages/john_doe/jane_doe
 * Body: { "content": "Hi! Want to collaborate?" }
 */
router.post('/:fromUsername/:toUser', controller.sendMessage);

module.exports = router;