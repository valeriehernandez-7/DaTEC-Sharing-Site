/**
 * Quick utility tests
 * Run with: node test-utilities.js
 */

require('dotenv').config();
const {
    connectMongo,
    connectRedis,
    connectNeo4j,
    connectCouchDB
} = require('../config/databases');

// Import utilities
const { generateUserId, generateDatasetId, generateCommentId } = require('../utils/id-generators');
const { validateAge, validateUsername, validateEmail } = require('../utils/validators');
const { initCounter, incrementCounter, getCounter } = require('../utils/redis-counters');

async function testUtilities() {
    console.log('Starting utility tests...\n');

    try {
        // Connect to databases
        await connectMongo();
        await connectRedis();
        await connectNeo4j();
        await connectCouchDB();

        console.log('=== Testing ID Generators ===');
        const userId = generateUserId('testuser', 'test@example.com');
        console.log('User ID:', userId);

        const datasetId = await generateDatasetId('testuser');
        console.log('Dataset ID:', datasetId);

        const commentId = generateCommentId(datasetId);
        console.log('Comment ID:', commentId);

        console.log('\n=== Testing Validators ===');
        console.log('Valid username (testuser):', validateUsername('testuser'));
        console.log('Invalid username (ab):', validateUsername('ab'));
        console.log('Valid email:', validateEmail('test@example.com'));
        console.log('Age 15+ (2000-01-01):', validateAge('2000-01-01'));
        console.log('Age <15 (2020-01-01):', validateAge('2020-01-01'));

        console.log('\n=== Testing Redis Counters ===');
        const testKey = 'test:counter:' + Date.now();
        await initCounter(testKey, 0);
        console.log('Initial counter:', await getCounter(testKey));

        await incrementCounter(testKey);
        console.log('After increment:', await getCounter(testKey));

        await incrementCounter(testKey, 5);
        console.log('After increment by 5:', await getCounter(testKey));

        console.log('\nAll utility tests passed!');

    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

testUtilities();