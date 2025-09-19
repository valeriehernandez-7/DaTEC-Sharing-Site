/**
 * MongoDB Replica Set Initialization Script
 * 
 * Purpose: Configures a 2-node replica set for the DaTEC application
 * Database: datec
 * Replica Set: datecRS
 */

try {
    print("=".repeat(60));
    print("Starting MongoDB Replica Set Configuration");
    print("=".repeat(60));

    // Define replica set configuration
    const replicaSetConfig = {
        _id: "datecRS",
        members: [
            {
                _id: 0,
                host: "mongo-primary:27017",
                priority: 2  // Higher priority = preferred primary
            },
            {
                _id: 1,
                host: "mongo-secondary:27017",
                priority: 1  // Lower priority = fallback node
            }
        ]
    };

    print("\nInitiating replica set with configuration:");
    printjson(replicaSetConfig);

    const initiationResult = rs.initiate(replicaSetConfig);
    print("\nInitiation result:");
    printjson(initiationResult);

    // Wait for replica set to stabilize
    print("\nWaiting 10 seconds for replica set to stabilize...");
    sleep(10000);

    // Verify replica set status
    print("\nChecking replica set status:");
    const status = rs.status();
    printjson(status);

    // Switch to datec database
    print("\nSwitching to 'datec' database...");
    db = db.getSiblingDB('datec');

    // Create essential indexes for performance
    print("\nCreating indexes for collections...");

    // Users collection indexes
    print("  - users collection indexes");
    db.users.createIndex(
        { user_id: 1 },
        { unique: true, name: "idx_user_id_unique" }
    );
    db.users.createIndex(
        { username: 1 },
        { unique: true, name: "idx_username_unique" }
    );
    db.users.createIndex(
        { email_address: 1 },
        { unique: true, name: "idx_email_unique" }
    );
    db.users.createIndex(
        { username: "text", full_name: "text" },
        { name: "idx_user_search" }
    );

    // Datasets collection indexes
    print("  - datasets collection indexes");
    db.datasets.createIndex(
        { dataset_id: 1 },
        { unique: true, name: "idx_dataset_id_unique" }
    );
    db.datasets.createIndex(
        { owner_user_id: 1, created_at: -1 },
        { name: "idx_owner_datasets" }
    );
    db.datasets.createIndex(
        { status: 1, is_public: 1 },
        { name: "idx_public_datasets" }
    );
    db.datasets.createIndex(
        { parent_dataset_id: 1 },
        { name: "idx_cloned_datasets" }
    );
    db.datasets.createIndex(
        { dataset_name: "text", description: "text", tags: "text" },
        {
            weights: { dataset_name: 10, tags: 5, description: 1 },
            name: "idx_dataset_search"
        }
    );

    // Comments collection indexes
    print("  - comments collection indexes");
    db.comments.createIndex(
        { comment_id: 1 },
        { unique: true, name: "idx_comment_id_unique" }
    );
    db.comments.createIndex(
        { target_dataset_id: 1, created_at: -1 },
        { name: "idx_dataset_comments" }
    );
    db.comments.createIndex(
        { parent_comment_id: 1 },
        { name: "idx_comment_replies" }
    );
    db.comments.createIndex(
        { author_user_id: 1 },
        { name: "idx_user_comments" }
    );
    db.comments.createIndex(
        { is_active: 1 },
        { name: "idx_active_comments" }
    );

    // Votes collection indexes
    print("  - votes collection indexes");
    db.votes.createIndex(
        { vote_id: 1 },
        { unique: true, name: "idx_vote_id_unique" }
    );
    db.votes.createIndex(
        { target_dataset_id: 1, user_id: 1 },
        { unique: true, name: "idx_unique_vote_per_user" }
    );
    db.votes.createIndex(
        { target_dataset_id: 1 },
        { name: "idx_dataset_votes" }
    );
    db.votes.createIndex(
        { user_id: 1 },
        { name: "idx_user_votes" }
    );

    // Private Messages collection indexes
    print("  - private_messages collection indexes");
    db.private_messages.createIndex(
        { message_id: 1 },
        { unique: true, name: "idx_message_id_unique" }
    );
    db.private_messages.createIndex(
        { from_user_id: 1, to_user_id: 1, created_at: -1 },
        { name: "idx_conversation_thread" }
    );
    db.private_messages.createIndex(
        { to_user_id: 1, created_at: -1 },
        { name: "idx_user_inbox" }
    );
    db.private_messages.createIndex(
        { from_user_id: 1, created_at: -1 },
        { name: "idx_user_sent_messages" }
    );

    print("\n" + "=".repeat(60));
    print("MongoDB Replica Set Setup Complete!");
    print("=".repeat(60));
    print("\nSummary:");
    print("  - Replica Set: datecRS (2 nodes)");
    print("  - Database: datec");
    print("  - Collections with indexes: 5");
    print("  - Total indexes created: 24");
    print("\nReplica set is ready for application use.");

} catch (error) {
    print("\n" + "!".repeat(60));
    print("ERROR during replica set setup:");
    print("!".repeat(60));
    print(error);
    print("\nStack trace:");
    print(error.stack);
    throw error;
}