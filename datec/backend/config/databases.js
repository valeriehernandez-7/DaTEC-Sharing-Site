/**
 * Database Connection Manager
 * Handles connections to MongoDB, Redis, Neo4j, and CouchDB
 * 
 * @module config/databases
 */

const { MongoClient } = require('mongodb');
const redis = require('redis');
const neo4j = require('neo4j-driver');
const nano = require('nano');

// MongoDB Connection
let mongoClient;
let mongoDB;

async function connectMongo() {
    try {
        mongoClient = new MongoClient(process.env.MONGO_URI);

        await mongoClient.connect();
        mongoDB = mongoClient.db('datec');

        // Verify connection
        await mongoDB.command({ ping: 1 });

        console.log('Connected to MongoDB replica set: datecRS');
        return mongoDB;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
}

// Redis Connection
let redisPrimary;
let redisReplica;

async function connectRedis() {
    try {
        redisPrimary = redis.createClient({ url: process.env.REDIS_PRIMARY });
        redisReplica = redis.createClient({ url: process.env.REDIS_REPLICA });

        await redisPrimary.connect();
        await redisReplica.connect();

        // Verify connection
        await redisPrimary.set('connection_test', 'OK');
        const testResult = await redisPrimary.get('connection_test');
        await redisPrimary.del('connection_test');

        if (testResult !== 'OK') {
            throw new Error('Redis primary connection test failed');
        }

        console.log('Connected to Redis primary and replica');
        return { primary: redisPrimary, replica: redisReplica };
    } catch (error) {
        console.error('Redis connection failed:', error.message);
        throw error;
    }
}

// Neo4j Connection
let neo4jDriver;

async function connectNeo4j() {
    try {
        neo4jDriver = neo4j.driver(
            process.env.NEO4J_URI,
            neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
        );

        // Verify connection
        const session = neo4jDriver.session({ database: 'datec' });
        await session.run('RETURN 1');
        await session.close();

        console.log('Connected to Neo4j database: datec');
        return neo4jDriver;
    } catch (error) {
        console.error('Neo4j connection failed:', error.message);
        throw error;
    }
}

// CouchDB Connection
let couchdb;

async function connectCouchDB() {
    try {
        couchdb = nano(process.env.COUCHDB_URL);

        // Verify connection
        await couchdb.db.list();

        console.log('Connected to CouchDB database: datec');
        return couchdb;
    } catch (error) {
        console.error('CouchDB connection failed:', error.message);
        throw error;
    }
}

// Getters for database connections
function getMongo() {
    if (!mongoDB) {
        throw new Error('MongoDB not connected');
    }
    return mongoDB;
}

function getRedis() {
    if (!redisPrimary || !redisReplica) {
        throw new Error('Redis not connected');
    }
    return { primary: redisPrimary, replica: redisReplica };
}

function getNeo4j() {
    if (!neo4jDriver) {
        throw new Error('Neo4j not connected');
    }
    return neo4jDriver;
}

function getCouchDB() {
    if (!couchdb) {
        throw new Error('CouchDB not connected');
    }
    return couchdb;
}

module.exports = {
    connectMongo,
    connectRedis,
    connectNeo4j,
    connectCouchDB,
    getMongo,
    getRedis,
    getNeo4j,
    getCouchDB
};