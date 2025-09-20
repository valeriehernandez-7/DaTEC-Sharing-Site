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
        neo4j.auth.basic('neo4j', 'dat3c_master_4dmin')
    );

    try {
        // Primero, conectar a la DB system para crear datec
        console.log('\nCreating datec database...');
        const systemSession = driver.session({ database: 'system' });

        try {
            await systemSession.run('CREATE DATABASE datec IF NOT EXISTS');
            console.log('✓ Database "datec" created or already exists');
        } catch (e) {
            // Si la versión de Neo4j no soporta múltiples DB, usar default
            console.log('⚠ Using default database "neo4j" (multi-db not supported)');
        } finally {
            await systemSession.close();
        }

        // Esperar un momento para que la DB esté lista
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Ahora conectar a la DB datec (o neo4j si datec no existe)
        let session;
        try {
            session = driver.session({ database: 'datec' });
            // Test connection
            await session.run('RETURN 1');
        } catch (e) {
            console.log('⚠ Falling back to default database "neo4j"');
            session = driver.session({ database: 'neo4j' });
        }

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

        const sampleUsers = [
            { userId: '00000000-0000-5000-8000-00005a317347', username: 'sudod4t3c' },
            { userId: '00000000-0000-5000-8000-00002a10550c', username: 'erickhernandez' },
            { userId: '00000000-0000-5000-8000-000050c163e7', username: 'armandogarcia' },
            { userId: '00000000-0000-5000-8000-000004637677', username: 'valeriehernandez' }
        ];

        for (const user of sampleUsers) {
            await session.run(`
                MERGE (u:User {
                    user_id: $userId,
                    username: $username
                })`, user);
            console.log(`✓ User created: ${user.username}`);
        }

        // 4. Seed datasets (matching MongoDB)
        console.log('\nCreating sample datasets...');

        await session.run(`
            MERGE (d:Dataset {
                dataset_id: $datasetId,
                dataset_name: $datasetName
            })
        `, {
            datasetId: 'erickhernandez_20250101_001',
            datasetName: 'Global Sales Analysis 2024'
        });
        console.log('✓ Dataset 1 created');

        await session.run(`
            MERGE (d:Dataset {
                dataset_id: $datasetId,
                dataset_name: $datasetName
            })
        `, {
            datasetId: 'armandogarcia_20250201_001',
            datasetName: 'Climate Change Indicators'
        });
        console.log('✓ Dataset 2 created');

        // 5. Verification
        console.log('\nVerifying setup...');

        const userCountResult = await session.run('MATCH (u:User) RETURN count(u) AS count');
        const userCount = userCountResult.records[0].get('count').toNumber();

        const datasetCountResult = await session.run('MATCH (d:Dataset) RETURN count(d) AS count');
        const datasetCount = datasetCountResult.records[0].get('count').toNumber();

        const dbNameResult = await session.run('CALL db.info()');
        const dbName = dbNameResult.records[0].get('name');

        console.log('\n' + '='.repeat(60));
        console.log('Neo4j Setup Complete!');
        console.log('='.repeat(60));
        console.log('\nSummary:');
        console.log('  - URL: bolt://localhost:7687');
        console.log(`  - Database: ${dbName}`);
        console.log('  - Constraints: 2 (User, Dataset)');
        console.log('  - Indexes: 2 (username, dataset_name)');
        console.log(`  - Users: ${userCount}`);
        console.log(`  - Datasets: ${datasetCount}`);
        console.log('  - Ready for relationship tracking');

        await session.close();

    } catch (error) {
        console.error('\n' + '!'.repeat(60));
        console.error('ERROR during Neo4j setup:');
        console.error('!'.repeat(60));
        console.error(error);
        throw error;
    } finally {
        await driver.close();
    }
}

// Run if called directly
if (require.main === module) {
    setupNeo4j();
}

module.exports = setupNeo4j;