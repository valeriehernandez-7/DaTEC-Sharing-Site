/**
 * Authentication Controller
 * Handles user registration and login
 * HU1: User registration and login
 * HU2: Initial admin user (already seeded in setup-mongo.js)
 * 
 * @module controllers/auth.controller
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getMongo } = require('../config/databases');
const { uploadFile } = require('../utils/couchdb-manager');
const { generateUserId, generateAvatarDocId } = require('../utils/id-generators');
const { userRegistrationSchema, userLoginSchema } = require('../utils/validators');
const { validateAge } = require('../utils/validators');
const { createUserNode } = require('../utils/neo4j-relations');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Register new user
 * POST /api/auth/register
 * HU1: User self-registration
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const register = asyncHandler(async (req, res) => {
    const db = getMongo();

    // Validate request body
    const { error, value } = userRegistrationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }

    const { username, email_address, password, full_name, birth_date } = value;

    // Validate age (15+)
    if (!validateAge(birth_date)) {
        return res.status(400).json({
            success: false,
            error: 'User must be at least 15 years old'
        });
    }

    // Check if username already exists
    const existingUsername = await db.collection('users').findOne({ username });
    if (existingUsername) {
        return res.status(409).json({
            success: false,
            error: 'Username already exists'
        });
    }

    // Check if email already exists
    const existingEmail = await db.collection('users').findOne({ email_address });
    if (existingEmail) {
        return res.status(409).json({
            success: false,
            error: 'Email already exists'
        });
    }

    // Generate user ID
    const user_id = generateUserId(username, email_address);

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Upload avatar if provided
    let avatar_ref = null;
    if (req.file) {
        const avatarDocId = generateAvatarDocId(user_id);
        avatar_ref = await uploadFile(avatarDocId, req.file, {
            type: 'user_avatar',
            owner_user_id: user_id
        });
    }

    // Create user document
    const user = {
        user_id,
        username,
        email_address,
        password_hash,
        full_name,
        birth_date: new Date(birth_date),
        avatar_ref,
        is_admin: false,
        created_at: new Date(),
        updated_at: new Date()
    };

    // Insert to MongoDB
    await db.collection('users').insertOne(user);

    // Create user node in Neo4j
    await createUserNode(user_id, username);

    // Generate JWT token
    const token = jwt.sign(
        {
            userId: user_id,
            username: username,
            isAdmin: false
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Return success response
    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
            userId: user_id,
            username,
            fullName: full_name,
            isAdmin: false
        }
    });
});

/**
 * User login
 * POST /api/auth/login
 * HU1: User authentication
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const login = asyncHandler(async (req, res) => {
    const db = getMongo();

    // Validate request body
    const { error, value } = userLoginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }

    const { username, password } = value;

    // Find user by username
    const user = await db.collection('users').findOne({ username });
    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Invalid username or password'
        });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        return res.status(401).json({
            success: false,
            error: 'Invalid username or password'
        });
    }

    // Generate JWT token
    const token = jwt.sign(
        {
            userId: user.user_id,
            username: user.username,
            isAdmin: user.is_admin
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Return success response
    res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
            userId: user.user_id,
            username: user.username,
            fullName: user.full_name,
            isAdmin: user.is_admin,
            avatarUrl: user.avatar_ref
                ? `${process.env.COUCHDB_URL}/datec/${user.avatar_ref.couchdb_document_id}/${user.avatar_ref.file_name}`
                : null
        }
    });
});

/**
 * Get current user info
 * GET /api/auth/me
 * Requires authentication
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getCurrentUser = asyncHandler(async (req, res) => {
    const db = getMongo();

    // Get user from database
    const user = await db.collection('users').findOne({
        user_id: req.user.userId
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }

    // Return user info (without password)
    res.status(200).json({
        success: true,
        user: {
            userId: user.user_id,
            username: user.username,
            email: user.email_address,
            fullName: user.full_name,
            birthDate: user.birth_date,
            isAdmin: user.is_admin,
            avatarUrl: user.avatar_ref
                ? `${process.env.COUCHDB_URL}/datec/${user.avatar_ref.couchdb_document_id}/${user.avatar_ref.file_name}`
                : null,
            createdAt: user.created_at
        }
    });
});

module.exports = {
    register,
    login,
    getCurrentUser
};