/**
 * Message Controller
 * Handles private messaging between users
 * 
 * @module controllers/message.controller
 * 
 * Dependencies:
 * - MongoDB: Store and retrieve messages
 * 
 * HU21: Private Messages
 * - Users can send direct messages to other users
 * - Users can view conversation threads
 */

const { getMongo } = require('../config/databases');

/**
 * HU21 - Send a private message
 * POST /api/messages/:fromUsername/:toUser
 * 
 * Allows authenticated user to send a message to another user
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params.fromUsername - Sender username (must match authenticated user)
 * @param {Object} req.params.toUser - Recipient username
 * @param {Object} req.body.content - Message content (1-5000 chars)
 * @param {Object} res - Express response object
 */
async function sendMessage(req, res) {
    try {
        const db = getMongo();
        const { content } = req.body;
        const fromUserId = req.user.userId;
        const fromUsername = req.params.fromUsername;
        const toUsername = req.params.toUser;

        // VALIDATION 1: Content must be between 1-5000 characters
        if (!content || content.trim().length < 1 || content.length > 5000) {
            return res.status(400).json({
                success: false,
                error: 'Message content must be between 1 and 5000 characters'
            });
        }

        // VALIDATION 2: Verify authenticated user is the sender
        if (req.user.username !== fromUsername) {
            return res.status(403).json({
                success: false,
                error: 'Cannot send messages as another user'
            });
        }

        // VALIDATION 3: Get recipient user
        const toUser = await db.collection('users').findOne({
            username: toUsername
        });

        if (!toUser) {
            return res.status(404).json({
                success: false,
                error: 'Recipient user not found'
            });
        }

        // VALIDATION 4: Cannot message yourself
        if (fromUserId === toUser.user_id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot send messages to yourself'
            });
        }

        // Generate unique message_id
        const timestamp = Date.now();
        const message_id = `msg_from_${fromUserId}_to_${toUser.user_id}_${timestamp}`;

        // Create message document
        const message = {
            message_id: message_id,
            from_user_id: fromUserId,
            to_user_id: toUser.user_id,
            content: content.trim(),
            created_at: new Date()
        };

        // Insert message into MongoDB
        await db.collection('private_messages').insertOne(message);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: {
                message_id: message_id,
                from: fromUsername,
                to: toUsername,
                content: message.content,
                created_at: message.created_at
            }
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * HU21 - Get conversation thread between two users
 * GET /api/messages/:fromUsername/:toUser
 * 
 * Returns all messages between two users in chronological order
 * Only the two participants can view their conversation
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params.fromUsername - First user's username
 * @param {Object} req.params.toUser - Second user's username
 * @param {Object} res - Express response object
 */
async function getThread(req, res) {
    try {
        const db = getMongo();
        const currentUserId = req.user.userId;
        const currentUsername = req.user.username;
        const fromUsername = req.params.fromUsername;
        const toUsername = req.params.toUser;

        // VALIDATION 1: User must be part of the conversation
        // Privacy: only participants can view the thread
        if (currentUsername !== fromUsername && currentUsername !== toUsername) {
            return res.status(403).json({
                success: false,
                error: 'You can only view conversations you are part of'
            });
        }

        // VALIDATION 2: Get both users
        const [fromUser, toUser] = await Promise.all([
            db.collection('users').findOne({ username: fromUsername }),
            db.collection('users').findOne({ username: toUsername })
        ]);

        if (!fromUser || !toUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // QUERY: Get all messages between these two users (bidirectional)
        // This query captures messages in BOTH directions:
        // - fromUser → toUser
        // - toUser → fromUser
        const messages = await db.collection('private_messages').find({
            $or: [
                // Messages from A to B
                {
                    from_user_id: fromUser.user_id,
                    to_user_id: toUser.user_id
                },
                // Messages from B to A
                {
                    from_user_id: toUser.user_id,
                    to_user_id: fromUser.user_id
                }
            ]
        })
            .sort({ created_at: 1 })  // Chronological order (oldest first)
            .toArray();

        // Enrich messages with sender information
        const enrichedMessages = await Promise.all(
            messages.map(async (msg) => {
                const sender = await db.collection('users').findOne(
                    { user_id: msg.from_user_id },
                    { projection: { username: 1, full_name: 1 } }
                );

                return {
                    message_id: msg.message_id,
                    from: {
                        user_id: msg.from_user_id,
                        username: sender?.username || 'Unknown',
                        full_name: sender?.full_name || 'Unknown User'
                    },
                    to_user_id: msg.to_user_id,
                    content: msg.content,
                    created_at: msg.created_at,
                    // Helper flag to identify if current user sent this message
                    is_own_message: msg.from_user_id === currentUserId
                };
            })
        );

        res.json({
            success: true,
            conversation: {
                participant_1: fromUsername,
                participant_2: toUsername,
                message_count: enrichedMessages.length
            },
            messages: enrichedMessages
        });

    } catch (error) {
        console.error('Error getting conversation thread:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    sendMessage,    // HU21 - Send message
    getThread       // HU21 - Get conversation
};