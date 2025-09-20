/**
 * Neo4j Setup Script
 * 
 * Purpose: Creates constraints, indexes, and seed data
 * Database: datec
 */

const neo4j = require('neo4j-driver');

async function setupNeo4j() {
    console.log('='.repeat(60));
    console.log('Starting Neo4j Configuration');
    console.log('='.repeat(60));

    const driver = neo4j.driver(
        'bolt://localhost:7687',
        neo4j.auth.basic('neo4j', 'datec_master_4dmin')
    );

    const session = driver.session({ database: 'datec' });

    try {
        // 1. Create constraints
        console.log('\nCreating constraints...');

        await session.run(`
            CREATE CONSTRAINT user_id_unique IF NOT EXISTS
            FOR (u:User) REQUIRE u.user_id IS UNIQUE
        `);
        console.log('✓ User constraint created');

        await session.run(`
            CREATE CONSTRAINT dataset_id_unique IF NOT EXISTS
            FOR (d:Dataset) REQUIRE d.dataset_id IS UNIQUE
        `);
        console.log('✓ Dataset constraint created');

        // 2. Create indexes
        console.log('\nCreating indexes...');

        await session.run(`
            CREATE INDEX user_username IF NOT EXISTS
            FOR (u:User) ON (u.username)
        `);
        console.log('✓ User username index created');

        await session.run(`
            CREATE INDEX dataset_name IF NOT EXISTS
            FOR (d:Dataset) ON (d.dataset_name)
        `);
        console.log('✓ Dataset name index created');

        // 3. Seed users (matching MongoDB)
        console.log('\nCreating sample users...');

        await session.run(`
            MERGE (u:User {
                user_id: $userId,
                username: $username
            })
        `, {
            userId: '550e8400-e29b-41d4-a716-446655440000',
            username: 'datec_master'
        });
        console.log('✓ Admin user created');

        // 4. Seed datasets (matching MongoDB)
        console.log('\nCreating sample datasets...');

        await session.run(`
            MERGE (d:Dataset {
                dataset_id: $datasetId,
                dataset_name: $datasetName
            })
        `, {
            datasetId: 'john_doe_20250928_001',
            datasetName: 'Global Sales Analysis 2024'
        });
        console.log('✓ Dataset 1 created');

        await session.run(`
            MERGE (d:Dataset {
                dataset_id: $datasetId,
                dataset_name: $datasetName
            })
        `, {
            datasetId: 'maria_garcia_20250929_001',
            datasetName: 'Climate Change Indicators'
        });
        console.log('✓ Dataset 2 created');

        // 5. Verification
        console.log('\nVerifying setup...');

        const userCountResult = await session.run('MATCH (u:User) RETURN count(u) AS count');
        const userCount = userCountResult.records[0].get('count').toNumber();

        const datasetCountResult = await session.run('MATCH (d:Dataset) RETURN count(d) AS count');
        const datasetCount = datasetCountResult.records[0].get('count').toNumber();

        console.log('\n' + '='.repeat(60));
        console.log('Neo4j Setup Complete!');
        console.log('='.repeat(60));
        console.log('\nSummary:');
        console.log('  - URL: bolt://localhost:7687');
        console.log('  - Database: datec');
        console.log('  - Constraints: 2 (User, Dataset)');
        console.log('  - Indexes: 2 (username, dataset_name)');
        console.log(`  - Users: ${userCount}`);
        console.log(`  - Datasets: ${datasetCount}`);
        console.log('  - Ready for relationship tracking');

    } catch (error) {
        console.error('\n' + '!'.repeat(60));
        console.error('ERROR during Neo4j setup:');
        console.error('!'.repeat(60));
        console.error(error);
        throw error;
    } finally {
        await session.close();
        await driver.close();
    }
}

// Run if called directly
if (require.main === module) {
    setupNeo4j();
}

module.exports = setupNeo4j;