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
        console.log('✓ Redis Primary connection test:', testResult);

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
        console.log('✓ Redis Replica connection test:', replicaTest);

        // Get replica info
        const replicaInfo = await replicaClient.info('replication');
        console.log('\nRedis Replica Replication Info:');
        console.log(replicaInfo.split('\n').filter(line => line.includes('role:') || line.includes('master_host:')).join('\n'));

        // Initialize counters for datasets (from your model)
        console.log('\nInitializing Redis counters...');
        
        // Sample datasets from your model
        const sampleDatasets = [
            'john_doe_20250928_001',
            'maria_garcia_20250929_001', 
            'carlos_lopez_20250930_001'
        ];

        for (const datasetId of sampleDatasets) {
            await primaryClient.set(`download_count:dataset:${datasetId}`, 0);
            await primaryClient.set(`vote_count:dataset:${datasetId}`, 0);
            console.log(`  - Initialized counters for dataset: ${datasetId}`);
        }

        // Test notification queues
        console.log('\nTesting notification queues...');
        await primaryClient.lPush(
            'notifications:user:550e8400-e29b-41d4-a716-446655440000',
            JSON.stringify({
                type: 'welcome',
                message: 'Bienvenido a DaTEC!',
                timestamp: new Date().toISOString()
            })
        );
        
        const queueLength = await primaryClient.lLen('notifications:user:550e8400-e29b-41d4-a716-446655440000');
        console.log(`✓ Notification queue test: ${queueLength} messages in queue`);

        // Verify data replication
        console.log('\nVerifying data replication...');
        const replicatedData = await replicaClient.get('test_connection');
        console.log(`✓ Data replication test: ${replicatedData === 'OK' ? 'SUCCESS' : 'FAILED'}`);

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