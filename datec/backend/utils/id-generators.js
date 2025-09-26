/**
 * ID Generator Utilities
 * Generates unique IDs for users, datasets, comments, votes, and messages
 * Based on formats defined in database_modeling.md
 * 
 * @module utils/id-generators
 */

const { v5: uuidv5, v4: uuidv4 } = require('uuid');
const { getMongo } = require('../config/databases');

// Namespace for UUID v5 generation (consistent across application)
const DATEC_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generate user ID using UUID v5
 * Based on username and email for consistency
 * 
 * @param {string} username - Username
 * @param {string} email - Email address
 * @returns {string} UUID v5 string
 */
function generateUserId(username, email) {
    const source = `${username.toLowerCase()}:${email.toLowerCase()}`;
    return uuidv5(source, DATEC_NAMESPACE);
}

/**
 * Generate dataset ID
 * Format: {username}_{YYYYMMDD}_{sequence}
 * Example: john_doe_20250928_001
 * 
 * @param {string} username - Owner username
 * @returns {Promise<string>} Dataset ID
 */
async function generateDatasetId(username) {
    try {
        const db = getMongo();

        // Get current date in YYYYMMDD format
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

        // Find max sequence number for today
        const prefix = `${username}_${dateStr}_`;

        const lastDataset = await db.collection('datasets')
            .find({ dataset_id: { $regex: `^${prefix}` } })
            .sort({ dataset_id: -1 })
            .limit(1)
            .toArray();

        let sequence = 1;

        if (lastDataset.length > 0) {
            const lastId = lastDataset[0].dataset_id;
            const lastSequence = parseInt(lastId.split('_').pop(), 10);
            sequence = lastSequence + 1;
        }

        // Pad sequence to 3 digits
        const sequenceStr = String(sequence).padStart(3, '0');

        return `${prefix}${sequenceStr}`;

    } catch (error) {
        console.error('Generate dataset ID failed:', error.message);
        throw new Error(`Failed to generate dataset ID: ${error.message}`);
    }
}

/**
 * Generate comment ID
 * Format: cmt_{dataset_id}_{timestamp}_{random}
 * Example: cmt_john_doe_20250928_001_1696012800000_a1b2
 * 
 * @param {string} datasetId - Target dataset ID
 * @returns {string} Comment ID
 */
function generateCommentId(datasetId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);

    return `cmt_${datasetId}_${timestamp}_${random}`;
}

/**
 * Generate vote ID
 * Format: vote_{dataset_id}_user_{user_id}
 * Example: vote_john_doe_20250928_001_user_550e8400
 * 
 * @param {string} datasetId - Target dataset ID
 * @param {string} userId - Voter user ID
 * @returns {string} Vote ID
 */
function generateVoteId(datasetId, userId) {
    // Use short version of user ID (first 8 chars)
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);

    return `vote_${datasetId}_user_${userIdShort}`;
}

/**
 * Generate message ID
 * Format: msg_from_{from_user_id}_to_{to_user_id}_{timestamp}_{sequence}
 * Example: msg_from_550e8400_to_449d7344_1696012800000_001
 * 
 * @param {string} fromUserId - Sender user ID
 * @param {string} toUserId - Recipient user ID
 * @returns {string} Message ID
 */
function generateMessageId(fromUserId, toUserId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 5);

    // Use short version of user IDs (first 8 chars)
    const fromIdShort = fromUserId.replace(/-/g, '').substring(0, 8);
    const toIdShort = toUserId.replace(/-/g, '').substring(0, 8);

    return `msg_from_${fromIdShort}_to_${toIdShort}_${timestamp}_${random}`;
}

/**
 * Generate CouchDB document ID for user avatar
 * Format: avatar_{user_id}
 * 
 * @param {string} userId - User ID
 * @returns {string} CouchDB document ID
 */
function generateAvatarDocId(userId) {
    return `avatar_${userId}`;
}

/**
 * Generate CouchDB document ID for dataset file
 * Format: file_{dataset_id}_{sequence}
 * Example: file_john_doe_20250928_001_001
 * 
 * @param {string} datasetId - Dataset ID
 * @param {number} sequence - File sequence number (1-based)
 * @returns {string} CouchDB document ID
 */
function generateDatasetFileDocId(datasetId, sequence) {
    const sequenceStr = String(sequence).padStart(3, '0');
    return `file_${datasetId}_${sequenceStr}`;
}

/**
 * Generate CouchDB document ID for dataset header photo
 * Format: photo_{dataset_id}_header
 * 
 * @param {string} datasetId - Dataset ID
 * @returns {string} CouchDB document ID
 */
function generateHeaderPhotoDocId(datasetId) {
    return `photo_${datasetId}_header`;
}

/**
 * Generate a random UUID v4 (for general purpose)
 * 
 * @returns {string} UUID v4 string
 */
function generateUUID() {
    return uuidv4();
}

/**
 * Validate dataset ID format
 * 
 * @param {string} datasetId - Dataset ID to validate
 * @returns {boolean} True if valid format
 */
function isValidDatasetId(datasetId) {
    const pattern = /^[a-zA-Z0-9_]+_\d{8}_\d{3}$/;
    return pattern.test(datasetId);
}

/**
 * Validate user ID format (UUID)
 * 
 * @param {string} userId - User ID to validate
 * @returns {boolean} True if valid UUID format
 */
function isValidUserId(userId) {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return pattern.test(userId);
}

module.exports = {
    generateUserId,
    generateDatasetId,
    generateCommentId,
    generateVoteId,
    generateMessageId,
    generateAvatarDocId,
    generateDatasetFileDocId,
    generateHeaderPhotoDocId,
    generateUUID,
    isValidDatasetId,
    isValidUserId
};