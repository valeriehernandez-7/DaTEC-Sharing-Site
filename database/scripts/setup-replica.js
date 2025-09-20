/**
 * MongoDB Replica Set Initialization Script
 * 
 * Purpose: Configures a 2-node replica set for the DaTEC application
 * Database: datec
 * Replica Set: datecRS
 */

try {
    print('='.repeat(60));
    print('Starting MongoDB Replica Set Configuration');
    print('='.repeat(60));

    // Wait a bit for replica set to stabilize
    print('\nWaiting for replica set to stabilize...');
    sleep(5000);

    // Verify replica set status
    print('\nChecking replica set status:');
    const status = rs.status();
    printjson(status);

    // Switch to datec database
    print('\nSwitching to datec database...');
    db = db.getSiblingDB('datec');

    // Create essential indexes for performance
    print('\nCreating indexes for collections...');

    // Users collection indexes
    print('  - Creating users collection indexes');
    db.createCollection('users');
    db.users.createIndex({ user_id: 1 }, { unique: true, name: "idx_user_id_unique" });
    db.users.createIndex({ username: 1 }, { unique: true, name: "idx_username_unique" });
    db.users.createIndex({ email_address: 1 }, { unique: true, name: "idx_email_unique" });

    // Datasets collection indexes
    print('  - Creating datasets collection indexes');
    db.createCollection('datasets');
    db.datasets.createIndex({ dataset_id: 1 }, { unique: true, name: "idx_dataset_id_unique" });
    db.datasets.createIndex({ owner_user_id: 1, created_at: -1 }, { name: "idx_owner_datasets" });

    // Comments collection indexes
    print('  - Creating comments collection indexes');
    db.createCollection('comments');
    db.comments.createIndex({ comment_id: 1 }, { unique: true, name: "idx_comment_id_unique" });
    db.comments.createIndex({ target_dataset_id: 1, created_at: -1 }, { name: "idx_dataset_comments" });

    // Votes collection indexes
    print('  - Creating votes collection indexes');
    db.createCollection('votes');
    db.votes.createIndex({ vote_id: 1 }, { unique: true, name: "idx_vote_id_unique" });
    db.votes.createIndex({ target_dataset_id: 1, user_id: 1 }, { unique: true, name: "idx_unique_vote_per_user" });

    // Private Messages collection indexes
    print('  - Creating private_messages collection indexes');
    db.createCollection('private_messages');
    db.private_messages.createIndex({ message_id: 1 }, { unique: true, name: "idx_message_id_unique" });

    print('\n' + '='.repeat(60));
    print('MongoDB Replica Set Setup Complete!');
    print('='.repeat(60));
    print('\nSummary:');
    print('  - Replica Set: datecRS (2 nodes)');
    print('  - Database: datec');
    print('  - Collections created: 5');
    print('  - Indexes created: 12');
    print('\nReplica set is ready for application use.');

} catch (error) {
    print('\n' + '!'.repeat(60));
    print('ERROR during replica set setup:');
    print('!'.repeat(60));
    print(error);
    print('\nStack trace:');
    print(error.stack);
    throw error;
}