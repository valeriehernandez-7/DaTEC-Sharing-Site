/**
 * User Routes
 * Defines all user-related endpoints for profile management and social features
 * 
 * @module routes/user.routes
 * 
 * Routes:
 * - GET    /api/users/search          - Search users by name/username (HU14)
 * - GET    /api/users/:username       - Get user profile (public)
 * - PUT    /api/users/:username       - Update user profile (HU4)
 * - PATCH  /api/users/:username/promote - Promote/demote admin (HU3)
 * - POST   /api/users/:username/follow - Follow user (HU19)
 * - DELETE /api/users/:username/follow - Unfollow user (HU19)
 * - GET    /api/users/:username/followers - Get user followers (HU20)
 * - GET    /api/users/:username/following - Get users being followed (HU20)
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/user.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

/**
 * Public Routes
 * No authentication required
 */

/**
 * GET /api/users/search
 * Search users by username or full name
 * Query params: q (search term, required)
 * 
 * Response: { success, count, users[] }
 * 
 * Example: /api/users/search?q=john
 */
router.get('/search', controller.searchUsers);

/**
 * GET /api/users
 * List all users (admin only)
 * Requires: Admin privileges
 */
router.get('/', controller.listAllUsers);

/**
 * GET /api/users/:username
 * Get public profile information for a user
 * 
 * Response: { success, user }
 */
router.get('/:username', controller.getUser);

/**
 * GET /api/users/:username/followers
 * Get list of users following this user
 * 
 * Response: { success, count, followers[] }
 */
router.get('/:username/followers', controller.getFollowers);

/**
 * GET /api/users/:username/following
 * Get list of users this user is following
 * 
 * Response: { success, count, following[] }
 */
router.get('/:username/following', controller.getFollowing);

/**
 * Protected Routes
 * Require authentication via JWT token
 */

/**
 * PUT /api/users/:username
 * Update user profile information
 * Requires: User must be updating their own profile
 * 
 * Body (all optional):
 *   - full_name: string
 *   - birth_date: ISO date string
 *   - email_address: string
 * 
 * File (optional):
 *   - avatar: image file (jpeg, png, gif)
 * 
 * Response: { success, message }
 */
router.put(
    '/:username',
    verifyToken,
    uploadAvatar,
    controller.updateUser
);

/**
 * POST /api/users/:username/follow
 * Follow a user
 * Requires: Authenticated user
 * 
 * Response: { success, message }
 * 
 * Side effects:
 *   - Creates FOLLOWS relationship in Neo4j
 *   - Sends notification to target user via Redis
 */
router.post(
    '/:username/follow',
    verifyToken,
    controller.followUser
);

/**
 * DELETE /api/users/:username/follow
 * Unfollow a user
 * Requires: Authenticated user
 * 
 * Response: { success, message }
 * 
 * Side effects:
 *   - Removes FOLLOWS relationship from Neo4j
 */
router.delete(
    '/:username/follow',
    verifyToken,
    controller.unfollowUser
);

/**
 * Admin-Only Routes
 * Require admin privileges
 */

/**
 * PATCH /api/users/:username/promote
 * Promote or demote user admin status
 * Requires: Admin privileges
 * 
 * Response: { success, isAdmin, message }
 * 
 * Note: Cannot demote yourself
 */
router.patch(
    '/:username/promote',
    verifyToken,
    verifyAdmin,
    controller.promoteUser
);

module.exports = router;