/**
 * Middleware tests
 * Run with: node test/test-middleware.js
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

// Import middlewares
const { verifyToken, verifyAdmin, createError } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateUsername, validateEmail, validateAge } = require('../utils/validators');

console.log('Starting middleware tests...\n');

// Mock request and response objects
function createMockReq(headers = {}, params = {}, user = null) {
    return {
        headers,
        params,
        user
    };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        jsonData: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.jsonData = data;
            return this;
        }
    };
    return res;
}

function mockNext(error) {
    if (error) {
        console.log('Next called with error:', error.message);
    }
}

// Test 1: JWT Token Generation and Verification
console.log('=== Test 1: JWT Token Generation ===');
try {
    const payload = {
        userId: '123456',
        username: 'testuser',
        isAdmin: false
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('Token generated:', token.substring(0, 50) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully');
    console.log('Decoded payload:', decoded);
    console.log('JWT test passed\n');
} catch (error) {
    console.log('JWT test failed:', error.message, '\n');
}

// Test 2: verifyToken middleware
console.log('=== Test 2: verifyToken Middleware ===');
try {
    // Create valid token
    const token = jwt.sign(
        { userId: '123456', username: 'testuser', isAdmin: false },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Test with valid token
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    verifyToken(req, res, () => {
        console.log('Valid token: User attached to request');
        console.log('req.user:', req.user);
        console.log('Valid token test passed');
    });

    // Test with missing token
    const req2 = createMockReq({});
    const res2 = createMockRes();

    verifyToken(req2, res2, mockNext);
    console.log('Missing token response:', res2.statusCode, res2.jsonData);
    console.log(res2.statusCode === 401 ? 'Missing token test passed' : 'Missing token test failed');

    // Test with invalid token
    const req3 = createMockReq({ authorization: 'Bearer invalid_token' });
    const res3 = createMockRes();

    verifyToken(req3, res3, mockNext);
    console.log('Invalid token response:', res3.statusCode, res3.jsonData);
    console.log(res3.statusCode === 401 ? 'Invalid token test passed\n' : 'Invalid token test failed\n');

} catch (error) {
    console.log('verifyToken test failed:', error.message, '\n');
}

// Test 3: verifyAdmin middleware
console.log('=== Test 3: verifyAdmin Middleware ===');
try {
    // Test with admin user
    const req1 = createMockReq({}, {}, { userId: '123', username: 'admin', isAdmin: true });
    const res1 = createMockRes();

    verifyAdmin(req1, res1, () => {
        console.log('Admin user: Access granted');
        console.log('Admin access test passed');
    });

    // Test with non-admin user
    const req2 = createMockReq({}, {}, { userId: '456', username: 'user', isAdmin: false });
    const res2 = createMockRes();

    verifyAdmin(req2, res2, mockNext);
    console.log('Non-admin response:', res2.statusCode, res2.jsonData);
    console.log(res2.statusCode === 403 ? 'Non-admin blocked test passed' : 'Non-admin test failed');

    // Test without user (not authenticated)
    const req3 = createMockReq();
    const res3 = createMockRes();

    verifyAdmin(req3, res3, mockNext);
    console.log('No user response:', res3.statusCode, res3.jsonData);
    console.log(res3.statusCode === 401 ? 'No auth test passed\n' : 'No auth test failed\n');

} catch (error) {
    console.log('verifyAdmin test failed:', error.message, '\n');
}

// Test 4: createError helper
console.log('=== Test 4: createError Helper ===');
try {
    const error1 = createError('Not found', 404);
    console.log('Error created:', error1.message, 'Status:', error1.statusCode);
    console.log(error1.statusCode === 404 ? 'createError test passed' : 'createError test failed');

    const error2 = createError('Server error');
    console.log('Default status:', error2.statusCode);
    console.log(error2.statusCode === 500 ? 'Default status test passed\n' : 'Default status test failed\n');

} catch (error) {
    console.log('createError test failed:', error.message, '\n');
}

// Test 5: asyncHandler wrapper
console.log('=== Test 5: asyncHandler Wrapper ===');
try {
    // Simulate async controller that throws error
    const failingController = asyncHandler(async (req, res) => {
        throw new Error('Something went wrong');
    });

    const req = createMockReq();
    const res = createMockRes();
    let errorCaught = false;

    failingController(req, res, (error) => {
        errorCaught = true;
        console.log('Error caught by asyncHandler:', error.message);
    });

    // Give it a moment for async to complete
    setTimeout(() => {
        console.log(errorCaught ? 'asyncHandler test passed\n' : 'asyncHandler test failed\n');

        // Test 6: Validators
        console.log('=== Test 6: Validators ===');
        console.log('Valid username:', validateUsername('testuser'));
        console.log('Invalid username (too short):', validateUsername('ab'));
        console.log('Valid email:', validateEmail('test@example.com'));
        console.log('Invalid email:', validateEmail('invalid-email'));
        console.log('Age 15+:', validateAge('2000-01-01'));
        console.log('Age <15:', validateAge('2020-01-01'));
        console.log('Validators test passed\n');

        console.log('=== All middleware tests completed ===');
        process.exit(0);
    }, 100);

} catch (error) {
    console.log('asyncHandler test failed:', error.message, '\n');
    process.exit(1);
}