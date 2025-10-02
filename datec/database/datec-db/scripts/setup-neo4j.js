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
        // Create datec database
        console.log('\nCreating datec database...');
        const systemSession = driver.session({ database: 'system' });

        try {
            await systemSession.run('CREATE DATABASE datec IF NOT EXISTS');
            console.log('Database "datec" created or already exists');
        } catch (e) {
            console.log('Using default database "neo4j" (multi-db not supported)');
        } finally {
            await systemSession.close();
        }

        // Wait for database to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Connect to datec database
        let session;
        try {
            session = driver.session({ database: 'datec' });
            await session.run('RETURN 1');
        } catch (e) {
            console.log('Falling back to default database "neo4j"');
            session = driver.session({ database: 'neo4j' });
        }

        // 1. Create constraints
        console.log('\nCreating constraints...');

        await session.run(`
            CREATE CONSTRAINT user_id_unique IF NOT EXISTS
            FOR (u:User) REQUIRE u.user_id IS UNIQUE
        `);
        console.log('User constraint created');

        await session.run(`
            CREATE CONSTRAINT dataset_id_unique IF NOT EXISTS
            FOR (d:Dataset) REQUIRE d.dataset_id IS UNIQUE
        `);
        console.log('Dataset constraint created');

        // 2. Create indexes
        console.log('\nCreating indexes...');

        await session.run(`
            CREATE INDEX user_username IF NOT EXISTS
            FOR (u:User) ON (u.username)
        `);
        console.log('User username index created');

        await session.run(`
            CREATE INDEX dataset_name IF NOT EXISTS
            FOR (d:Dataset) ON (d.dataset_name)
        `);
        console.log('Dataset name index created');

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
            console.log(`User created: ${user.username}`);
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
        console.log('Dataset 1 created');

        await session.run(`
            MERGE (d:Dataset {
                dataset_id: $datasetId,
                dataset_name: $datasetName
            })
        `, {
            datasetId: 'armandogarcia_20250201_001',
            datasetName: 'Climate Change Indicators'
        });
        console.log('Dataset 2 created');

        // 5. Create FOLLOWS relationships
        console.log('\nCreating FOLLOWS relationships...');

        // armandogarcia follows erickhernandez
        await session.run(`
            MATCH (follower:User {username: $followerUsername})
            MATCH (followee:User {username: $followeeUsername})
            MERGE (follower)-[r:FOLLOWS {followed_at: $timestamp}]->(followee)
            RETURN r
        `, {
            followerUsername: 'armandogarcia',
            followeeUsername: 'erickhernandez',
            timestamp: new Date('2025-05-01T10:00:00Z').toISOString()
        });
        console.log('armandogarcia -> FOLLOWS -> erickhernandez');

        // erickhernandez follows armandogarcia (mutual follow)
        await session.run(`
            MATCH (follower:User {username: $followerUsername})
            MATCH (followee:User {username: $followeeUsername})
            MERGE (follower)-[r:FOLLOWS {followed_at: $timestamp}]->(followee)
            RETURN r
        `, {
            followerUsername: 'erickhernandez',
            followeeUsername: 'armandogarcia',
            timestamp: new Date('2025-05-02T11:00:00Z').toISOString()
        });
        console.log('erickhernandez -> FOLLOWS -> armandogarcia');

        // armandogarcia follows valeriehernandez
        await session.run(`
            MATCH (follower:User {username: $followerUsername})
            MATCH (followee:User {username: $followeeUsername})
            MERGE (follower)-[r:FOLLOWS {followed_at: $timestamp}]->(followee)
            RETURN r
        `, {
            followerUsername: 'armandogarcia',
            followeeUsername: 'valeriehernandez',
            timestamp: new Date('2025-05-03T14:20:00Z').toISOString()
        });
        console.log('armandogarcia -> FOLLOWS -> valeriehernandez');

        // erickhernandez follows valeriehernandez
        await session.run(`
            MATCH (follower:User {username: $followerUsername})
            MATCH (followee:User {username: $followeeUsername})
            MERGE (follower)-[r:FOLLOWS {followed_at: $timestamp}]->(followee)
            RETURN r
        `, {
            followerUsername: 'erickhernandez',
            followeeUsername: 'valeriehernandez',
            timestamp: new Date('2025-05-04T14:20:00Z').toISOString()
        });
        console.log('erickhernandez -> FOLLOWS -> valeriehernandez');

        // 6. Verification
        console.log('\nVerifying setup...');

        const userCountResult = await session.run('MATCH (u:User) RETURN count(u) AS count');
        const userCount = userCountResult.records[0].get('count').toNumber();

        const datasetCountResult = await session.run('MATCH (d:Dataset) RETURN count(d) AS count');
        const datasetCount = datasetCountResult.records[0].get('count').toNumber();

        const followsCountResult = await session.run('MATCH ()-[r:FOLLOWS]->() RETURN count(r) AS count');
        const followsCount = followsCountResult.records[0].get('count').toNumber();

        // Get followers count for each user
        console.log('\nFollowers summary:');

        for (const user of sampleUsers) {
            const followersResult = await session.run(`
                MATCH (follower:User)-[:FOLLOWS]->(u:User {username: $username})
                RETURN count(follower) AS followers
            `, { username: user.username });

            const followingResult = await session.run(`
                MATCH (u:User {username: $username})-[:FOLLOWS]->(following:User)
                RETURN count(following) AS following
            `, { username: user.username });

            const followers = followersResult.records[0].get('followers').toNumber();
            const following = followingResult.records[0].get('following').toNumber();

            console.log(`${user.username}: ${followers} followers, ${following} following`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('Neo4j Setup Complete!');
        console.log('='.repeat(60));
        console.log(`Database: datec`);
        console.log(`Users created: ${userCount}`);
        console.log(`Datasets created: ${datasetCount}`);
        console.log(`FOLLOWS relationships: ${followsCount}`);
        console.log('='.repeat(60));

        await session.close();
        await driver.close();

    } catch (error) {
        console.error('\nSetup failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

setupNeo4j()
    .then(() => {
        console.log('\nSetup script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\nSetup script failed:', error.message);
        process.exit(1);
    });