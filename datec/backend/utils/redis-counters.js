/**
 * Redis Counter Manager
 * Handles atomic increment/decrement operations for counters
 * Used by: HU13 (downloads), HU17 (votes)
 * 
 * @module utils/redis-counters
 */

const { getRedis } = require('../config/databases');

/**
 * Initialize a counter with a default value
 * 
 * @param {string} key - Counter key (e.g., 'download_count:dataset:xyz')
 * @param {number} value - Initial value (default: 0)
 * @returns {boolean} True if initialized successfully
 * @throws {Error} If initialization fails
 */
async function initCounter(key, value = 0) {
    try {
        const { primary } = getRedis();

        // SET NX - only sets if key doesn't exist
        const result = await primary.set(key, value, { NX: true });

        return result !== null;

    } catch (error) {
        console.error('Redis init counter failed:', error.message);
        throw new Error(`Failed to initialize counter: ${error.message}`);
    }
}

/**
 * Increment a counter atomically
 * 
 * @param {string} key - Counter key
 * @param {number} amount - Amount to increment (default: 1)
 * @returns {number} New counter value after increment
 * @throws {Error} If increment fails
 */
async function incrementCounter(key, amount = 1) {
    try {
        const { primary } = getRedis();

        const newValue = await primary.incrBy(key, amount);

        return newValue;

    } catch (error) {
        console.error('Redis increment failed:', error.message);
        throw new Error(`Failed to increment counter: ${error.message}`);
    }
}

/**
 * Decrement a counter atomically (ensures counter never goes below 0)
 * 
 * @param {string} key - Counter key
 * @param {number} amount - Amount to decrement (default: 1)
 * @returns {number} New counter value after decrement
 * @throws {Error} If decrement fails
 */
async function decrementCounter(key, amount = 1) {
    try {
        const { primary } = getRedis();

        // Get current value
        const currentValue = await getCounter(key);

        // Calculate new value, ensuring it doesn't go below 0
        const newValue = Math.max(0, currentValue - amount);

        // Set the new value
        await primary.set(key, newValue);

        return newValue;

    } catch (error) {
        console.error('Redis decrement failed:', error.message);
        throw new Error(`Failed to decrement counter: ${error.message}`);
    }
}

/**
 * Get current counter value
 * 
 * @param {string} key - Counter key
 * @returns {number} Current counter value (0 if key doesn't exist)
 * @throws {Error} If retrieval fails
 */
async function getCounter(key) {
    try {
        const { replica } = getRedis();

        const value = await replica.get(key);

        // Return 0 if key doesn't exist
        return value ? parseInt(value, 10) : 0;

    } catch (error) {
        console.error('Redis get counter failed:', error.message);
        throw new Error(`Failed to get counter: ${error.message}`);
    }
}

/**
 * Delete a counter
 * 
 * @param {string} key - Counter key to delete
 * @returns {boolean} True if deleted successfully
 * @throws {Error} If deletion fails
 */
async function deleteCounter(key) {
    try {
        const { primary } = getRedis();

        const result = await primary.del(key);

        return result > 0;

    } catch (error) {
        console.error('Redis delete counter failed:', error.message);
        throw new Error(`Failed to delete counter: ${error.message}`);
    }
}

/**
 * Get multiple counters at once
 * 
 * @param {string[]} keys - Array of counter keys
 * @returns {Object} Object with keys and their values
 * @throws {Error} If retrieval fails
 */
async function getMultipleCounters(keys) {
    try {
        const { replica } = getRedis();

        const values = await replica.mGet(keys);

        const result = {};
        keys.forEach((key, index) => {
            result[key] = values[index] ? parseInt(values[index], 10) : 0;
        });

        return result;

    } catch (error) {
        console.error('Redis get multiple counters failed:', error.message);
        throw new Error(`Failed to get multiple counters: ${error.message}`);
    }
}

/**
 * Check if counter exists
 * 
 * @param {string} key - Counter key
 * @returns {boolean} True if counter exists
 * @throws {Error} If check fails
 */
async function counterExists(key) {
    try {
        const { replica } = getRedis();

        const exists = await replica.exists(key);

        return exists === 1;

    } catch (error) {
        console.error('Redis counter exists check failed:', error.message);
        throw new Error(`Failed to check counter existence: ${error.message}`);
    }
}

module.exports = {
    initCounter,
    incrementCounter,
    decrementCounter,
    getCounter,
    deleteCounter,
    getMultipleCounters,
    counterExists
};