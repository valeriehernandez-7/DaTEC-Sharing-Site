/**
 * Neo4j Relationship Manager
 * Handles graph relationships and queries
 * Used by: HU13 (DOWNLOADED), HU19 (FOLLOWS), HU20 (followers/following)
 * 
 * @module utils/neo4j-relations
 */

const { getNeo4j } = require('../config/databases');

/**
 * Create a relationship between two nodes
 * 
 * @param {string} fromId - Source node ID (user_id)
 * @param {string} toId - Target node ID (user_id or dataset_id)
 * @param {string} relType - Relationship type ('FOLLOWS' or 'DOWNLOADED')
 * @param {Object} properties - Additional properties for the relationship
 * @returns {boolean} True if relationship created successfully
 * @throws {Error} If creation fails
 */
async function createRelationship(fromId, toId, relType, properties = {}) {
    const driver = getNeo4j();
    const session = driver.session({ database: 'datec' });

    try {
        // Validate relationship type
        const validTypes = ['FOLLOWS', 'DOWNLOADED'];
        if (!validTypes.includes(relType)) {
            throw new Error(`Invalid relationship type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Build properties string for Cypher query
        const propsString = Object.keys(properties).length > 0
            ? `{${Object.keys(properties).map(key => `${key}: $${key}`).join(', ')}}`
            : '';

        // Determine node types based on relationship
        const fromLabel = 'User';
        const toLabel = relType === 'FOLLOWS' ? 'User' : 'Dataset';

        const query = `
            MATCH (a:${fromLabel} {${fromLabel === 'User' ? 'user_id' : 'dataset_id'}: $fromId})
            MATCH (b:${toLabel} {${toLabel === 'User' ? 'user_id' : 'dataset_id'}: $toId})
            MERGE (a)-[r:${relType} ${propsString}]->(b)
            RETURN r
        `;

        const params = {
            fromId,
            toId,
            ...properties
        };

        const result = await session.run(query, params);

        return result.records.length > 0;

    } catch (error) {
        console.error('Neo4j create relationship failed:', error.message);
        throw new Error(`Failed to create relationship: ${error.message}`);
    } finally {
        await session.close();
    }
}

/**
 * Delete a relationship between two nodes
 * 
 * @param {string} fromId - Source node ID
 * @param {string} toId - Target node ID
 * @param {string} relType - Relationship type ('FOLLOWS' or 'DOWNLOADED')
 * @returns {boolean} True if relationship deleted successfully
 * @throws {Error} If deletion fails
 */
async function deleteRelationship(fromId, toId, relType) {
    const driver = getNeo4j();
    const session = driver.session({ database: 'datec' });

    try {
        // Determine node types based on relationship
        const fromLabel = 'User';
        const toLabel = relType === 'FOLLOWS' ? 'User' : 'Dataset';

        const query = `
            MATCH (a:${fromLabel} {${fromLabel === 'User' ? 'user_id' : 'dataset_id'}: $fromId})
            -[r:${relType}]->
            (b:${toLabel} {${toLabel === 'User' ? 'user_id' : 'dataset_id'}: $toId})
            DELETE r
            RETURN count(r) as deleted
        `;

        const result = await session.run(query, { fromId, toId });

        const deletedCount = result.records[0]?.get('deleted').toNumber() || 0;
        return deletedCount > 0;

    } catch (error) {
        console.error('Neo4j delete relationship failed:', error.message);
        throw new Error(`Failed to delete relationship: ${error.message}`);
    } finally {
        await session.close();
    }
}

/**
 * Get all relationships for a node
 * 
 * @param {string} nodeId - Node ID (user_id or dataset_id)
 * @param {string} relType - Relationship type
 * @param {string} direction - 'outgoing', 'incoming', or 'both'
 * @returns {Array} Array of related nodes with relationship properties
 * @throws {Error} If query fails
 */
async function getRelationships(nodeId, relType, direction = 'outgoing') {
    const driver = getNeo4j();
    const session = driver.session({ database: 'datec' });

    try {
        let query;
        const nodeLabel = relType === 'FOLLOWS' ? 'User' :
            direction === 'incoming' ? 'Dataset' : 'User';
        const relatedLabel = relType === 'FOLLOWS' ? 'User' : 'Dataset';

        if (direction === 'outgoing') {
            query = `
                MATCH (n:${nodeLabel} {${nodeLabel === 'User' ? 'user_id' : 'dataset_id'}: $nodeId})
                -[r:${relType}]->(related:${relatedLabel})
                RETURN related, r
            `;
        } else if (direction === 'incoming') {
            query = `
                MATCH (related:${relatedLabel})
                -[r:${relType}]->
                (n:${nodeLabel} {${nodeLabel === 'User' ? 'user_id' : 'dataset_id'}: $nodeId})
                RETURN related, r
            `;
        } else { // both
            query = `
                MATCH (n:${nodeLabel} {${nodeLabel === 'User' ? 'user_id' : 'dataset_id'}: $nodeId})
                -[r:${relType}]-(related:${relatedLabel})
                RETURN related, r
            `;
        }

        const result = await session.run(query, { nodeId });

        return result.records.map(record => {
            const relatedNode = record.get('related').properties;
            const relationship = record.get('r').properties;
            return {
                node: relatedNode,
                relationship: relationship
            };
        });

    } catch (error) {
        console.error('Neo4j get relationships failed:', error.message);
        throw new Error(`Failed to get relationships: ${error.message}`);
    } finally {
        await session.close();
    }
}

/**
 * Check if a relationship exists between two nodes
 * 
 * @param {string} fromId - Source node ID
 * @param {string} toId - Target node ID
 * @param {string} relType - Relationship type
 * @returns {boolean} True if relationship exists
 * @throws {Error} If query fails
 */
async function relationshipExists(fromId, toId, relType) {
    const driver = getNeo4j();
    const session = driver.session({ database: 'datec' });

    try {
        const fromLabel = 'User';
        const toLabel = relType === 'FOLLOWS' ? 'User' : 'Dataset';

        const query = `
            MATCH (a:${fromLabel} {${fromLabel === 'User' ? 'user_id' : 'dataset_id'}: $fromId})
            -[r:${relType}]->
            (b:${toLabel} {${toLabel === 'User' ? 'user_id' : 'dataset_id'}: $toId})
            RETURN count(r) > 0 as exists
        `;

        const result = await session.run(query, { fromId, toId });

        return result.records[0]?.get('exists') || false;

    } catch (error) {
        console.error('Neo4j relationship exists check failed:', error.message);
        throw new Error(`Failed to check relationship existence: ${error.message}`);
    } finally {
        await session.close();
    }
}

/**
 * Count relationships for a node
 * 
 * @param {string} nodeId - Node ID
 * @param {string} relType - Relationship type
 * @param {string} direction - 'outgoing' or 'incoming'
 * @returns {number} Count of relationships
 * @throws {Error} If query fails
 */
async function countRelationships(nodeId, relType, direction = 'outgoing') {
    const driver = getNeo4j();
    const session = driver.session({ database: 'datec' });

    try {
        const nodeLabel = relType === 'FOLLOWS' ? 'User' :
            direction === 'incoming' ? 'Dataset' : 'User';
        const relatedLabel = relType === 'FOLLOWS' ? 'User' : 'Dataset';

        let query;
        if (direction === 'outgoing') {
            query = `
                MATCH (n:${nodeLabel} {${nodeLabel === 'User' ? 'user_id' : 'dataset_id'}: $nodeId})
                -[r:${relType}]->(related:${relatedLabel})
                RETURN count(r) as count
            `;
        } else {
            query = `
                MATCH (related:${relatedLabel})
                -[r:${relType}]->
                (n:${nodeLabel} {${nodeLabel === 'User' ? 'user_id' : 'dataset_id'}: $nodeId})
                RETURN count(r) as count
            `;
        }

        const result = await session.run(query, { nodeId });

        return result.records[0]?.get('count').toNumber() || 0;

    } catch (error) {
        console.error('Neo4j count relationships failed:', error.message);
        throw new Error(`Failed to count relationships: ${error.message}`);
    } finally {
        await session.close();
    }
}

/**
 * Create a User node in Neo4j
 * 
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @returns {boolean} True if node created successfully
 * @throws {Error} If creation fails
 */
async function createUserNode(userId, username) {
    const driver = getNeo4j();
    const session = driver.session({ database: 'datec' });

    try {
        const query = `
            MERGE (u:User {user_id: $userId})
            ON CREATE SET u.username = $username
            RETURN u
        `;

        const result = await session.run(query, { userId, username });

        return result.records.length > 0;

    } catch (error) {
        console.error('Neo4j create user node failed:', error.message);
        throw new Error(`Failed to create user node: ${error.message}`);
    } finally {
        await session.close();
    }
}

/**
 * Create a Dataset node in Neo4j
 * 
 * @param {string} datasetId - Dataset ID
 * @param {string} datasetName - Dataset name
 * @returns {boolean} True if node created successfully
 * @throws {Error} If creation fails
 */
async function createDatasetNode(datasetId, datasetName) {
    const driver = getNeo4j();
    const session = driver.session({ database: 'datec' });

    try {
        const query = `
            MERGE (d:Dataset {dataset_id: $datasetId})
            ON CREATE SET d.dataset_name = $datasetName
            RETURN d
        `;

        const result = await session.run(query, { datasetId, datasetName });

        return result.records.length > 0;

    } catch (error) {
        console.error('Neo4j create dataset node failed:', error.message);
        throw new Error(`Failed to create dataset node: ${error.message}`);
    } finally {
        await session.close();
    }
}

/**
 * Delete a node and all its relationships
 * 
 * @param {string} nodeId - Node ID
 * @param {string} nodeType - 'User' or 'Dataset'
 * @returns {boolean} True if node deleted successfully
 * @throws {Error} If deletion fails
 */
async function deleteNode(nodeId, nodeType) {
    const driver = getNeo4j();
    const session = driver.session({ database: 'datec' });

    try {
        const idField = nodeType === 'User' ? 'user_id' : 'dataset_id';

        const query = `
            MATCH (n:${nodeType} {${idField}: $nodeId})
            DETACH DELETE n
            RETURN count(n) as deleted
        `;

        const result = await session.run(query, { nodeId });

        const deletedCount = result.records[0]?.get('deleted').toNumber() || 0;
        return deletedCount > 0;

    } catch (error) {
        console.error('Neo4j delete node failed:', error.message);
        throw new Error(`Failed to delete node: ${error.message}`);
    } finally {
        await session.close();
    }
}

module.exports = {
    createRelationship,
    deleteRelationship,
    getRelationships,
    relationshipExists,
    countRelationships,
    createUserNode,
    createDatasetNode,
    deleteNode
};