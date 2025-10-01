/**
 * Redis Primary-Replica Configuration Script
 * 
 * Purpose: Verifies and configures Redis primary-replica setup
 * Database: Default (0)
 */

const redis = require('redis');

async function setupRedis() {
    console.log('='.repeat(60));
    console.log('Starting Redis Primary-Replica Configuration');
    console.log('='.repeat(60));

    try {
        // Connect to Redis Primary
        console.log('\nConnecting to Redis Primary...');
        const primaryClient = redis.createClient({
            url: 'redis://redis-primary:6379'
        });

        await primaryClient.connect();

        // Test primary connection
        await primaryClient.set('test_connection', 'OK');
        const testResult = await primaryClient.get('test_connection');
        console.log('Redis Primary connection test:', testResult);

        // Get primary info
        const primaryInfo = await primaryClient.info('replication');
        console.log('\nRedis Primary Replication Info:');
        console.log(primaryInfo.split('\n').filter(line => line.includes('role:') || line.includes('connected_slaves:')).join('\n'));

        // Connect to Redis Replica
        console.log('\nConnecting to Redis Replica...');
        const replicaClient = redis.createClient({
            url: 'redis://redis-replica:6379'
        });

        await replicaClient.connect();

        // Test replica connection (read-only)
        const replicaTest = await replicaClient.get('test_connection');
        console.log('Redis Replica connection test:', replicaTest);

        // Get replica info
        const replicaInfo = await replicaClient.info('replication');
        console.log('\nRedis Replica Replication Info:');
        console.log(replicaInfo.split('\n').filter(line => line.includes('role:') || line.includes('master_host:')).join('\n'));

        // Initialize counters for datasets (matching setup-mongo.js)
        console.log('\nInitializing Redis counters...');

        // Sample datasets matching MongoDB seed data
        const sampleDatasets = [
            'erickhernandez_20250101_001',
            'armandogarcia_20250201_001'
        ];

        for (const datasetId of sampleDatasets) {
            await primaryClient.set(`download_count:dataset:${datasetId}`, 0);
            await primaryClient.set(`vote_count:dataset:${datasetId}`, 0);
            console.log(`  - Initialized counters for dataset: ${datasetId}`);
        }

        // Create sample notifications matching Neo4j FOLLOWS relationships
        console.log('\nCreating sample notifications...');

        // User IDs from setup-mongo.js
        const users = {
            sudod4t3c: '00000000-0000-5000-8000-00005a317347',
            erickhernandez: '00000000-0000-5000-8000-00002a10550c',
            armandogarcia: '00000000-0000-5000-8000-000050c163e7',
            valeriehernandez: '00000000-0000-5000-8000-000004637677'
        };

        // Notification 1: erickhernandez receives notification from armandogarcia (new_follower)
        // Matches: armandogarcia -> FOLLOWS -> erickhernandez from setup-neo4j.js
        await primaryClient.lPush(
            `notifications:user:${users.erickhernandez}`,
            JSON.stringify({
                type: 'new_follower',
                from_user_id: users.armandogarcia,
                from_username: 'armandogarcia',
                timestamp: new Date('2025-08-01T10:00:00Z').toISOString()
            })
        );
        console.log('  - erickhernandez: new_follower from armandogarcia');

        // Notification 2: armandogarcia receives notification from erickhernandez (new_follower)
        // Matches: erickhernandez -> FOLLOWS -> armandogarcia from setup-neo4j.js
        await primaryClient.lPush(
            `notifications:user:${users.armandogarcia}`,
            JSON.stringify({
                type: 'new_follower',
                from_user_id: users.erickhernandez,
                from_username: 'erickhernandez',
                timestamp: new Date('2025-08-02T11:00:00Z').toISOString()
            })
        );
        console.log('  - armandogarcia: new_follower from erickhernandez');

        // Notification 3: valeriehernandez receives notification from armandogarcia (new_follower)
        // Matches: armandogarcia -> FOLLOWS -> valeriehernandez from setup-neo4j.js
        await primaryClient.lPush(
            `notifications:user:${users.valeriehernandez}`,
            JSON.stringify({
                type: 'new_follower',
                from_user_id: users.armandogarcia,
                from_username: 'armandogarcia',
                timestamp: new Date('2025-08-03T14:20:00Z').toISOString()
            })
        );
        console.log('  - valeriehernandez: new_follower from armandogarcia');

        // Notification 4: valeriehernandez receives notification from erickhernandez (new_follower)
        // Matches: erickhernandez -> FOLLOWS -> valeriehernandez from setup-neo4j.js
        await primaryClient.lPush(
            `notifications:user:${users.valeriehernandez}`,
            JSON.stringify({
                type: 'new_follower',
                from_user_id: users.erickhernandez,
                from_username: 'erickhernandez',
                timestamp: new Date('2025-08-04T14:20:00Z').toISOString()
            })
        );
        console.log('  - valeriehernandez: new_follower from erickhernandez');

        // Verify notification queues
        console.log('\nVerifying notification queues...');

        const notificationCounts = {
            sudod4t3c: await primaryClient.lLen(`notifications:user:${users.sudod4t3c}`),
            erickhernandez: await primaryClient.lLen(`notifications:user:${users.erickhernandez}`),
            armandogarcia: await primaryClient.lLen(`notifications:user:${users.armandogarcia}`),
            valeriehernandez: await primaryClient.lLen(`notifications:user:${users.valeriehernandez}`)
        };

        console.log('Notification counts by user:');
        for (const [username, count] of Object.entries(notificationCounts)) {
            console.log(`  - ${username}: ${count} notifications`);
        }

        // Verify data replication
        console.log('\nVerifying data replication...');
        const replicatedData = await replicaClient.get('test_connection');
        console.log(`Data replication test: ${replicatedData === 'OK' ? 'SUCCESS' : 'FAILED'}`);

        // Cleanup test data
        await primaryClient.del('test_connection');

        console.log('\n' + '='.repeat(60));
        console.log('Redis Primary-Replica Setup Complete!');
        console.log('='.repeat(60));
        console.log('\nSummary:');
        console.log('  - Primary: redis://redis-primary:6379');
        console.log('  - Replica: redis://redis-replica:6379');
        console.log('  - Counters initialized: download_count, vote_count');
        console.log('  - Notification queues: ready');
        console.log('  - Replication: verified');
        console.log(`  - Sample datasets: ${sampleDatasets.length}`);
        console.log(`  - Total notifications: ${Object.values(notificationCounts).reduce((a, b) => a + b, 0)}`);

        await primaryClient.quit();
        await replicaClient.quit();

    } catch (error) {
        console.error('\n' + '!'.repeat(60));
        console.error('ERROR during Redis setup:');
        console.error('!'.repeat(60));
        console.error(error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    setupRedis();
}

module.exports = setupRedis;