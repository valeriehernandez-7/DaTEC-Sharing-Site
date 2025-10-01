/**
 * MongoDB Replica Set Setup Script
 * 
 * Purpose: Configures replica set with sample data and validation
 */

try {
    print('='.repeat(60));
    print('Starting MongoDB Replica Set Configuration');
    print('='.repeat(60));

    // Wait longer for MongoDB nodes to be ready
    print('\nWaiting for MongoDB nodes to be ready...');
    sleep(30000);

    // Initialize replica set
    print('Attempting to initialize replica set...');

    try {
        const status = rs.status();
        if (status.ok === 1 && status.set) {
            print('✓ Replica set already initialized: ' + status.set);
        }
    } catch (e) {
        if (e.code === 94 || e.codeName === 'NotYetInitialized') {
            print('Initializing new replica set...');
            const config = {
                _id: "datecRS",
                members: [
                    { _id: 0, host: "mongo-primary:27017", priority: 2 },
                    { _id: 1, host: "mongo-secondary:27017", priority: 1 }
                ]
            };

            rs.initiate(config);
            print('Replica set initiation command sent');

            print('Waiting for replica set to stabilize (40 seconds)...');
            sleep(40000);

            const newStatus = rs.status();
            if (newStatus.ok === 1) {
                print('✓ Replica set initialization complete: ' + newStatus.set);
            } else {
                throw new Error('Replica set failed to initialize properly');
            }
        } else {
            throw e;
        }
    }

    // Switch to datec database
    db = db.getSiblingDB('datec');
    print('\nUsing database: datec');

    // Create collections with validation
    print('\nCreating collections with validation...');

    // 1. Users Collection
    if (!db.getCollectionNames().includes('users')) {
        db.createCollection('users', {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["user_id", "username", "email_address", "password_hash", "full_name", "birth_date", "is_admin", "created_at", "updated_at"],
                    properties: {
                        user_id: { bsonType: "string", description: "UUID required" },
                        username: {
                            bsonType: "string",
                            minLength: 3,
                            maxLength: 30,
                            pattern: "^[a-zA-Z0-9_]+$",
                            description: "3-30 chars, alphanumeric + underscore only"
                        },
                        email_address: {
                            bsonType: "string",
                            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                            description: "Valid email format required"
                        },
                        password_hash: { bsonType: "string", description: "Bcrypt hash required" },
                        full_name: { bsonType: "string", minLength: 1, description: "Full name required" },
                        birth_date: { bsonType: "date", description: "Birth date required" },
                        avatar_ref: {
                            anyOf: [
                                { bsonType: "null" },
                                {
                                    bsonType: "object",
                                    required: ["couchdb_document_id", "file_name", "file_size_bytes", "mime_type"],
                                    properties: {
                                        couchdb_document_id: { bsonType: "string" },
                                        file_name: { bsonType: "string" },
                                        file_size_bytes: { bsonType: "int" },
                                        mime_type: { bsonType: "string" }
                                    }
                                }
                            ],
                            description: "Optional avatar reference to CouchDB"
                        },
                        is_admin: { bsonType: "bool" },
                        created_at: { bsonType: "date" },
                        updated_at: { bsonType: "date" }
                    }
                }
            }
        });
        print('✓ Created users collection with validation');
    }

    // 2. Datasets Collection
    if (!db.getCollectionNames().includes('datasets')) {
        db.createCollection('datasets', {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["dataset_id", "owner_user_id", "dataset_name", "description", "file_references", "status", "is_public", "created_at", "updated_at"],
                    properties: {
                        dataset_id: { bsonType: "string" },
                        owner_user_id: { bsonType: "string" },
                        parent_dataset_id: {
                            anyOf: [
                                { bsonType: "null" },
                                { bsonType: "string" }
                            ],
                            description: "References original dataset_id if cloned, null otherwise"
                        },
                        dataset_name: {
                            bsonType: "string",
                            minLength: 3,
                            maxLength: 100,
                            description: "Dataset name 3-100 chars required"
                        },
                        description: {
                            bsonType: "string",
                            minLength: 10,
                            maxLength: 5000,
                            description: "Description 10-5000 chars required"
                        },
                        tags: {
                            bsonType: "array",
                            description: "Optional array for search, can be empty"
                        },
                        status: {
                            enum: ["pending", "approved", "rejected"],
                            description: "Status must be pending, approved, or rejected"
                        },
                        reviewed_at: {
                            anyOf: [
                                { bsonType: "null" },
                                { bsonType: "date" }
                            ],
                            description: "Timestamp when admin reviewed, null if not reviewed"
                        },
                        admin_review: {
                            anyOf: [
                                { bsonType: "null" },
                                { bsonType: "string" }
                            ],
                            description: "Admin review comment, null if not reviewed"
                        },
                        is_public: { bsonType: "bool" },
                        file_references: {
                            bsonType: "array",
                            minItems: 1,
                            description: "At least one file reference required",
                            items: {
                                bsonType: "object",
                                required: ["couchdb_document_id", "file_name", "file_size_bytes", "mime_type", "uploaded_at"],
                                properties: {
                                    couchdb_document_id: { bsonType: "string" },
                                    file_name: { bsonType: "string" },
                                    file_size_bytes: { bsonType: "int" },
                                    mime_type: { bsonType: "string" },
                                    uploaded_at: { bsonType: "date" }
                                }
                            }
                        },
                        header_photo_ref: {
                            anyOf: [
                                { bsonType: "null" },
                                {
                                    bsonType: "object",
                                    required: ["couchdb_document_id", "file_name", "file_size_bytes", "mime_type"],
                                    properties: {
                                        couchdb_document_id: { bsonType: "string" },
                                        file_name: { bsonType: "string" },
                                        file_size_bytes: { bsonType: "int" },
                                        mime_type: { bsonType: "string" }
                                    }
                                }
                            ],
                            description: "Optional header photo reference to CouchDB"
                        },
                        tutorial_video_ref: {
                            anyOf: [
                                { bsonType: "null" },
                                {
                                    bsonType: "object",
                                    required: ["url", "platform"],
                                    properties: {
                                        url: { bsonType: "string" },
                                        platform: {
                                            enum: ["youtube", "vimeo"],
                                            description: "Must be youtube or vimeo"
                                        }
                                    }
                                }
                            ],
                            description: "Optional tutorial video reference"
                        },
                        download_count: { bsonType: "int" },
                        vote_count: { bsonType: "int" },
                        comment_count: { bsonType: "int" },
                        created_at: { bsonType: "date" },
                        updated_at: { bsonType: "date" }
                    }
                }
            }
        });
        print('✓ Created datasets collection with validation');
    }

    // 3. Comments Collection
    if (!db.getCollectionNames().includes('comments')) {
        db.createCollection('comments', {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["comment_id", "target_dataset_id", "author_user_id", "content", "is_active", "created_at"],
                    properties: {
                        comment_id: { bsonType: "string" },
                        target_dataset_id: { bsonType: "string" },
                        author_user_id: { bsonType: "string" },
                        parent_comment_id: {
                            anyOf: [
                                { bsonType: "null" },
                                { bsonType: "string" }
                            ],
                            description: "References parent comment_id, null if top-level"
                        },
                        content: {
                            bsonType: "string",
                            minLength: 1,
                            maxLength: 2000,
                            description: "Content 1-2000 chars required"
                        },
                        is_active: { bsonType: "bool" },
                        created_at: { bsonType: "date" }
                    }
                }
            }
        });
        print('✓ Created comments collection with validation');
    }

    // 4. Votes Collection
    if (!db.getCollectionNames().includes('votes')) {
        db.createCollection('votes', {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["vote_id", "target_dataset_id", "voter_user_id", "rating", "created_at", "updated_at"],
                    properties: {
                        vote_id: { bsonType: "string" },
                        target_dataset_id: { bsonType: "string" },
                        voter_user_id: { bsonType: "string" },
                        rating: {
                            bsonType: "int",
                            minimum: 1,
                            maximum: 5,
                            description: "Rating must be integer between 1 and 5"
                        },
                        created_at: { bsonType: "date" },
                        updated_at: { bsonType: "date" }
                    }
                }
            }
        });
        print('✓ Created votes collection with validation');
    }

    // 5. Private Messages Collection
    if (!db.getCollectionNames().includes('private_messages')) {
        db.createCollection('private_messages', {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["message_id", "from_user_id", "to_user_id", "content", "created_at"],
                    properties: {
                        message_id: { bsonType: "string" },
                        from_user_id: { bsonType: "string" },
                        to_user_id: { bsonType: "string" },
                        content: {
                            bsonType: "string",
                            minLength: 1,
                            maxLength: 5000,
                            description: "Content 1-5000 chars required"
                        },
                        created_at: { bsonType: "date" }
                    }
                }
            }
        });
        print('✓ Created private_messages collection with validation');
    }

    // Create indexes
    print('\nCreating indexes...');

    // Users indexes
    db.users.createIndex({ "user_id": 1 }, { unique: true, name: "user_id_unique" });
    db.users.createIndex({ "username": 1 }, { unique: true, name: "username_unique" });
    db.users.createIndex({ "email_address": 1 }, { unique: true, name: "email_unique" });
    db.users.createIndex({ "username": "text", "full_name": "text" }, { name: "user_search_text" });
    print('✓ Created users indexes');

    // Datasets indexes
    db.datasets.createIndex({ "dataset_id": 1 }, { unique: true, name: "dataset_id_unique" });
    db.datasets.createIndex({ "owner_user_id": 1, "created_at": -1 }, { name: "owner_datasets_index" });
    db.datasets.createIndex({ "parent_dataset_id": 1 }, { name: "parent_dataset_index" });
    db.datasets.createIndex({ "status": 1, "is_public": 1 }, { name: "status_public_index" });
    db.datasets.createIndex({ "status": 1 }, { name: "status_index" });
    db.datasets.createIndex(
        { "dataset_name": "text", "description": "text", "tags": "text" },
        {
            name: "dataset_search_text",
            weights: { "dataset_name": 10, "tags": 5, "description": 1 }
        }
    );
    print('✓ Created datasets indexes');

    // Comments indexes
    db.comments.createIndex({ "comment_id": 1 }, { unique: true, name: "comment_id_unique" });
    db.comments.createIndex({ "target_dataset_id": 1, "created_at": -1 }, { name: "dataset_comments_index" });
    db.comments.createIndex({ "parent_comment_id": 1 }, { name: "parent_comment_index" });
    db.comments.createIndex({ "author_user_id": 1 }, { name: "author_comments_index" });
    db.comments.createIndex({ "is_active": 1 }, { name: "active_comments_index" });
    print('✓ Created comments indexes');

    // Votes indexes
    db.votes.createIndex({ "vote_id": 1 }, { unique: true, name: "vote_id_unique" });
    db.votes.createIndex(
        { "target_dataset_id": 1, "voter_user_id": 1 },
        { unique: true, name: "vote_unique_index" }
    );
    db.votes.createIndex({ "target_dataset_id": 1 }, { name: "dataset_votes_index" });
    db.votes.createIndex({ "voter_user_id": 1 }, { name: "user_votes_index" });
    print('✓ Created votes indexes');

    // Private Messages indexes
    db.private_messages.createIndex({ "message_id": 1 }, { unique: true, name: "message_id_unique" });
    db.private_messages.createIndex(
        { "from_user_id": 1, "to_user_id": 1, "created_at": -1 },
        { name: "conversation_thread_index" }
    );
    db.private_messages.createIndex({ "to_user_id": 1, "created_at": -1 }, { name: "user_inbox_index" });
    db.private_messages.createIndex({ "from_user_id": 1, "created_at": -1 }, { name: "user_sent_index" });
    print('✓ Created private_messages indexes');

    // Insert sample users
    print('\nCreating sample users...');
    const sampleUsers = [
        {
            user_id: "00000000-0000-5000-8000-00005a317347",
            username: "sudod4t3c",
            email_address: "sudo@datec.com",
            password_hash: "$2a$12$V2xmRSFncBkDwmWkOmgtdemlUr8THwep2TlrbkHq1o1IyAFW0KUBm",
            full_name: "DaTEC System Administrator",
            birth_date: new Date("1999-09-09"),
            avatar_ref: null,
            is_admin: true,
            created_at: new Date('2020-01-01'),
            updated_at: new Date('2020-01-01')
        },
        {
            user_id: "00000000-0000-5000-8000-000004637677",
            username: "valeriehernandez",
            email_address: "valeriehernandez@estudiantec.cr",
            password_hash: "$2y$12$FG91QJcTF7eWXQu1PinWH.A0kBYaF2w9Hpuch3Ko1xPV/Y6IX.MLK",
            full_name: "Valerie Hernandez Fernandez",
            birth_date: new Date("2005-05-07"),
            avatar_ref: null,
            is_admin: true,
            created_at: new Date('2025-05-01'),
            updated_at: new Date('2025-05-01')
        },
        {
            user_id: "00000000-0000-5000-8000-00002a10550c",
            username: "erickhernandez",
            email_address: "erick.hernandez@itcr.ac.cr",
            password_hash: "$2y$12$sSYn37rv0ODJfCTnVw/6u.78qFogXPAF5nvrrqhmBiUv6edswRsD.",
            full_name: "Erick Hernandez Bonilla",
            birth_date: new Date("1985-01-01"),
            avatar_ref: null,
            is_admin: false,
            created_at: new Date('2025-02-01'),
            updated_at: new Date('2025-02-01')
        },
        {
            user_id: "00000000-0000-5000-8000-000050c163e7",
            username: "armandogarcia",
            email_address: "armandgp07@estudiantec.cr",
            password_hash: "$2y$12$f8KquSeU7EBctWKFOJvnqugivQjpohyte.ZxzEiKmEs7DOgcb2GJW",
            full_name: "Armando Garcia Paniagua",
            birth_date: new Date("2005-07-01"),
            avatar_ref: null,
            is_admin: false,
            created_at: new Date('2025-03-01'),
            updated_at: new Date('2025-03-01')
        },
        {
            user_id: "00000000-0000-5000-8000-0000087b63e3",
            username: "dhodgkin",
            email_address: "dhodgkin@datec.cr",
            password_hash: "$2y$12$vLEAzK3sDi59O5LTFKVJtuxt/Q1TbUf7dwcKozmqKoT5lnebz.EQi",
            full_name: "Dorothy Crowfoot Hodgkin",
            birth_date: new Date("2010-05-12"),
            avatar_ref: null,
            is_admin: false,
            created_at: new Date('2025-07-01'),
            updated_at: new Date('2025-07-01')
        },
        {
            user_id: "00000000-0000-5000-8000-0000160ecd67",
            username: "einst3in",
            email_address: "einst3in@datec.cr",
            password_hash: "$2y$12$zfJTy5c3KvkAs5u9tsRXBumJpTIvYxaZZ9umhr/3gcu/sNK6mc/m2",
            full_name: "Albert Einstein",
            birth_date: new Date("1979-03-14"),
            avatar_ref: null,
            is_admin: false,
            created_at: new Date('2025-07-02'),
            updated_at: new Date('2025-07-02')
        }
    ];

    for (const user of sampleUsers) {
        try {
            db.users.insertOne(user);
            print(`✓ Sample user created: ${user.username}`);
        } catch (e) {
            if (e.code === 11000) {
                print(`✓ User already exists: ${user.username}`);
            } else {
                throw e;
            }
        }
    }

    // Verify everything
    print('\nVerifying setup...');
    const collectionNames = db.getCollectionNames();
    let totalIndexes = 0;

    for (const collectionName of collectionNames) {
        const indexes = db[collectionName].getIndexes();
        totalIndexes += indexes.length;
        print(`  - ${collectionName}: ${indexes.length} indexes`);
    }

    const userCount = db.users.countDocuments();
    const datasetCount = db.datasets.countDocuments();

    print('\n' + '='.repeat(60));
    print('MongoDB Setup Complete!');
    print('='.repeat(60));
    print('\nSummary:');
    print(`  - Replica Set: ${rs.status().set}`);
    print(`  - Database: datec`);
    print(`  - Collections: ${collectionNames.length}`);
    print(`  - Indexes: ${totalIndexes}`);
    print(`  - Users: ${userCount}`);
    print(`  - Datasets: ${datasetCount}`);
    print(`  - Validation: Enabled for all collections`);
    print('\nReady for DaTEC application development!');

} catch (error) {
    print('\nERROR during setup:');
    print('Error code: ' + error.code);
    print('Error name: ' + error.codeName);
    print('Error message: ' + error.message);
    print(error.stack);
    throw error;
}