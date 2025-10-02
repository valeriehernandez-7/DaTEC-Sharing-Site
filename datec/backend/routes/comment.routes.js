/**
 * Comment Routes
 * Handles dataset comment endpoints
 * 
 * @module routes/comment.routes
 * 
 * Routes:
 * - GET  /api/datasets/:datasetId/comments - Get comment tree (HU15)
 * - POST /api/datasets/:datasetId/comments - Add comment/reply (HU15)
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/comment.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/datasets/:datasetId/comments
 * Get all comments for a dataset as a tree structure
 * 
 * Authentication: Optional (logged-in users can see if they're comment authors)
 * 
 * Response: { success, dataset_id, comment_count, comments[] }
 * 
 * Comments structure:
 * - Top-level comments (parent_comment_id = null)
 * - Each comment has a replies[] array with nested comments
 * - Replies can be nested up to 5 levels deep
 * - Chronologically sorted at each level
 * 
 * Privacy:
 * - Regular users only see active comments (is_active = true)
 * - Admins see all comments including disabled ones
 * 
 * Example response:
 * {
 *   "success": true,
 *   "comment_count": 5,
 *   "comments": [
 *     {
 *       "comment_id": "cmt_...",
 *       "content": "Great dataset!",
 *       "author": { "username": "john", ... },
 *       "replies": [
 *         {
 *           "comment_id": "cmt_...",
 *           "content": "Thanks!",
 *           "author": { "username": "jane", ... },
 *           "replies": []
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.get('/datasets/:datasetId/comments', optionalAuth, controller.getComments);

/**
 * POST /api/datasets/:datasetId/comments
 * Add a new comment or reply to a dataset
 * Requires: Authentication
 * 
 * Body (JSON):
 *   - content: string (required, 1-2000 chars)
 *   - parent_comment_id: string (optional, null for top-level comment)
 * 
 * Response: { success, message, comment }
 * 
 * Validations (HU15):
 *   - Dataset must be approved and public (or user is owner/admin)
 *   - If replying, parent comment must exist and be active
 *   - If replying, parent must belong to same dataset
 *   - Maximum nesting depth: 5 levels
 *   - Content: 1-2000 characters
 * 
 * Side effects:
 *   - Increments dataset.comment_count in MongoDB
 * 
 * Example: Add top-level comment
 * POST /api/datasets/john_doe_20250928_001/comments
 * { "content": "Excellent work on this dataset!" }
 * 
 * Example: Reply to a comment
 * POST /api/datasets/john_doe_20250928_001/comments
 * {
 *   "content": "Thank you!",
 *   "parent_comment_id": "cmt_john_doe_20250928_001_1727540000000_001"
 * }
 */
router.post('/datasets/:datasetId/comments', verifyToken, controller.addComment);

module.exports = router;