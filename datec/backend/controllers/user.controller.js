/**
 * User Controller
 * Handles user profile operations, admin promotion, search, and social features
 * 
 * @module controllers/user.controller
 * 
 * Dependencies:
 * - MongoDB: User data storage
 * - CouchDB: Avatar file storage
 * - Neo4j: Follow relationships
 * - Redis: Notifications
 */

const { getMongo } = require('../config/databases');
const { uploadFile, deleteFile, getFileUrl } = require('../utils/couchdb-manager');
const {
    createRelationship,
    deleteRelationship,
    relationshipExists,
    getRelatedNodes
} = require('../utils/neo4j-relations');
const { sendNotification } = require('../utils/notifications');

/**
 * HU14 - Search users by username or full name
 * GET /api/users/search?q=searchterm
 */
async function searchUsers(req, res) {
    try {
        const db = getMongo();
        const query = req.query.q;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Query parameter required' });
        }

        // Use regex for partial matching on username and full_name
        // Case-insensitive search
        const searchRegex = new RegExp(query, 'i');

        const users = await db.collection('users').find({
            $or: [
                { username: searchRegex },
                { full_name: searchRegex }
            ]
        }).limit(20).toArray();

        res.json({
            success: true,
            count: users.length,
            users: users.map(u => ({
                userId: u.user_id,
                username: u.username,
                fullName: u.full_name,
                avatarUrl: u.avatar_ref
                    ? getFileUrl(u.avatar_ref.couchdb_document_id, u.avatar_ref.file_name)
                    : null,
                isAdmin: u.is_admin,
                createdAt: u.created_at
            }))
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * List all users (admin only)
 * GET /api/users
 */
async function listAllUsers(req, res) {
    try {
        const db = getMongo();

        const users = await db.collection('users').find({})
            .sort({ created_at: -1 })
            .toArray();

        res.json({
            success: true,
            count: users.length,
            users: users.map(u => ({
                userId: u.user_id,
                username: u.username,
                fullName: u.full_name,
                avatarUrl: u.avatar_ref
                    ? getFileUrl(u.avatar_ref.couchdb_document_id, u.avatar_ref.file_name)
                    : null,
                isAdmin: u.is_admin,
                createdAt: u.created_at
            }))
        });
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get user profile by username
 * GET /api/users/:username
 */
async function getUser(req, res) {
    try {
        const db = getMongo();
        const user = await db.collection('users').findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                userId: user.user_id,
                username: user.username,
                fullName: user.full_name,
                birthDate: user.birth_date,
                emailAddress: user.email_address,
                avatarUrl: user.avatar_ref
                    ? getFileUrl(user.avatar_ref.couchdb_document_id, user.avatar_ref.file_name)
                    : null,
                isAdmin: user.is_admin,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * HU4 - Edit user profile
 * PUT /api/users/:username
 * Requires authentication (user can only edit their own profile)
 * Body: full_name, birth_date, email_address (optional)
 * File: avatar (optional)
 */
async function updateUser(req, res) {
    try {
        const db = getMongo();

        // Verify user can only edit their own profile
        if (req.user.username !== req.params.username) {
            return res.status(403).json({ error: 'Forbidden: You can only edit your own profile' });
        }

        const user = await db.collection('users').findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent username update
        if (req.body.username) {
            return res.status(400).json({
                success: false,
                error: 'Username cannot be changed'
            });
        }

        const updates = {};

        // Update basic info if provided
        if (req.body.full_name) {
            updates.full_name = req.body.full_name.trim();
        }

        if (req.body.birth_date) {
            updates.birth_date = new Date(req.body.birth_date);
        }

        if (req.body.email_address) {
            // Check if email is already in use by another user
            const existingEmail = await db.collection('users').findOne({
                email_address: req.body.email_address,
                username: { $ne: req.params.username }
            });

            if (existingEmail) {
                return res.status(409).json({ error: 'Email already in use' });
            }

            updates.email_address = req.body.email_address.trim().toLowerCase();
        }

        // Handle avatar upload if new file provided
        if (req.file) {
            // Delete old avatar from CouchDB if exists
            if (user.avatar_ref) {
                try {
                    await deleteFile(user.avatar_ref.couchdb_document_id);
                } catch (error) {
                    console.warn('Failed to delete old avatar:', error.message);
                }
            }

            // Upload new avatar to CouchDB
            const avatarRef = await uploadFile(
                `avatar_${user.user_id}`,
                req.file,
                {
                    type: 'user_avatar',
                    owner_user_id: user.user_id,
                    uploaded_at: new Date().toISOString()
                }
            );

            updates.avatar_ref = avatarRef;
        }

        // Always update the timestamp
        updates.updated_at = new Date();

        // Perform the update
        await db.collection('users').updateOne(
            { username: req.params.username },
            { $set: updates }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * HU3 - Promote/demote user to/from admin
 * PATCH /api/users/:username/promote
 * Requires admin authentication
 */
async function promoteUser(req, res) {
    try {
        const db = getMongo();

        // Verify requester is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
        }

        const user = await db.collection('users').findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Cannot demote yourself
        if (req.user.username === req.params.username && user.is_admin) {
            return res.status(400).json({ error: 'Cannot demote yourself' });
        }

        // Toggle admin status
        const newStatus = !user.is_admin;

        await db.collection('users').updateOne(
            { username: req.params.username },
            {
                $set: {
                    is_admin: newStatus,
                    updated_at: new Date()
                }
            }
        );

        res.json({
            success: true,
            isAdmin: newStatus,
            message: `User ${newStatus ? 'promoted to' : 'demoted from'} admin`
        });
    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * HU19 - Follow a user
 * POST /api/users/:username/follow
 * Requires authentication
 */
async function followUser(req, res) {
    try {
        const db = getMongo();
        const targetUsername = req.params.username;
        const followerId = req.user.userId;

        // Cannot follow yourself
        if (req.user.username === targetUsername) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        // Get target user
        const targetUser = await db.collection('users').findOne({ username: targetUsername });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already following
        const alreadyFollowing = await relationshipExists(
            followerId,
            targetUser.user_id,
            'FOLLOWS'
        );

        if (alreadyFollowing) {
            return res.status(409).json({ error: 'Already following this user' });
        }

        // Create FOLLOWS relationship in Neo4j
        await createRelationship(
            followerId,
            targetUser.user_id,
            'FOLLOWS',
            { followed_at: new Date().toISOString() }
        );

        // Send notification to target user via Redis
        await sendNotification(targetUser.user_id, {
            type: 'new_follower',
            message: `${req.user.username} started following you`,
            from_user: req.user.username,
            from_user_id: followerId,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Now following ${targetUsername}`
        });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * HU19 - Unfollow a user
 * DELETE /api/users/:username/follow
 * Requires authentication
 */
async function unfollowUser(req, res) {
    try {
        const db = getMongo();
        const targetUsername = req.params.username;
        const followerId = req.user.userId;

        // Get target user
        const targetUser = await db.collection('users').findOne({ username: targetUsername });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if actually following
        const isFollowing = await relationshipExists(
            followerId,
            targetUser.user_id,
            'FOLLOWS'
        );

        if (!isFollowing) {
            return res.status(404).json({ error: 'Not following this user' });
        }

        // Delete FOLLOWS relationship from Neo4j
        await deleteRelationship(followerId, targetUser.user_id, 'FOLLOWS');

        res.json({
            success: true,
            message: `Unfollowed ${targetUsername}`
        });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * HU20 - Get user's followers
 * GET /api/users/:username/followers
 */
async function getFollowers(req, res) {
    try {
        const db = getMongo();
        const user = await db.collection('users').findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get all users who follow this user (incoming FOLLOWS relationships)
        const followerIds = await getRelatedNodes(user.user_id, 'FOLLOWS', 'incoming');

        // Get user details from MongoDB
        const followers = await db.collection('users').find({
            user_id: { $in: followerIds }
        }).toArray();

        res.json({
            success: true,
            count: followers.length,
            followers: followers.map(f => ({
                userId: f.user_id,
                username: f.username,
                fullName: f.full_name,
                avatarUrl: f.avatar_ref
                    ? getFileUrl(f.avatar_ref.couchdb_document_id, f.avatar_ref.file_name)
                    : null
            }))
        });
    } catch (error) {
        console.error('Error getting followers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * HU20 - Get users that this user follows
 * GET /api/users/:username/following
 */
async function getFollowing(req, res) {
    try {
        const db = getMongo();
        const user = await db.collection('users').findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get all users this user follows (outgoing FOLLOWS relationships)
        const followingIds = await getRelatedNodes(user.user_id, 'FOLLOWS', 'outgoing');

        // Get user details from MongoDB
        const following = await db.collection('users').find({
            user_id: { $in: followingIds }
        }).toArray();

        res.json({
            success: true,
            count: following.length,
            following: following.map(f => ({
                userId: f.user_id,
                username: f.username,
                fullName: f.full_name,
                avatarUrl: f.avatar_ref
                    ? getFileUrl(f.avatar_ref.couchdb_document_id, f.avatar_ref.file_name)
                    : null
            }))
        });
    } catch (error) {
        console.error('Error getting following:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    searchUsers,      // HU14
    listAllUsers,
    getUser,
    updateUser,       // HU4
    promoteUser,      // HU3
    followUser,       // HU19
    unfollowUser,     // HU19
    getFollowers,     // HU20
    getFollowing      // HU20
};