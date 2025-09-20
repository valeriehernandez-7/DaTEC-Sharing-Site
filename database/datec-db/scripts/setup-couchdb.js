/**
 * CouchDB Setup Script
 * 
 * Purpose: Creates database and configures admin user
 * Database: datec
 */

const nano = require('nano');

async function setupCouchDB() {
    console.log('='.repeat(60));
    console.log('Starting CouchDB Configuration');
    console.log('='.repeat(60));

    try {
        // Connect as admin
        console.log('\nConnecting to CouchDB...');
        const couchdb = nano('http://sudod4t3c:dat3c_master_4dmin@localhost:5984');

        // Verify connection
        try {
            const serverInfo = await couchdb.db.list();
            console.log(`✓ Connected to CouchDB successfully`);
        } catch (e) {
            console.error('✗ Failed to connect. Is CouchDB running on localhost:5984?');
            throw e;
        }

        // Create datec database
        console.log('\nCreating datec database...');
        try {
            await couchdb.db.create('datec');
            console.log('✓ Database "datec" created');
        } catch (e) {
            if (e.statusCode === 412) {
                console.log('✓ Database "datec" already exists');
            } else {
                throw e;
            }
        }

        // Get database instance
        const datecDB = couchdb.db.use('datec');

        // Create design document for user avatars
        console.log('\nCreating design documents...');
        try {
            await datecDB.insert({
                _id: '_design/users',
                views: {
                    by_user_id: {
                        map: function (doc) {
                            if (doc.type === 'user_avatar') {
                                emit(doc.owner_user_id, doc);
                            }
                        }.toString()
                    }
                }
            });
            console.log('✓ Created design document for user avatars');
        } catch (e) {
            if (e.statusCode === 409) {
                console.log('✓ Design document "users" already exists');
            } else {
                throw e;
            }
        }

        // Create design document for datasets
        try {
            await datecDB.insert({
                _id: '_design/datasets',
                views: {
                    by_dataset_id: {
                        map: function (doc) {
                            if (doc.type === 'dataset_file' || doc.type === 'header_photo') {
                                emit(doc.dataset_id, doc);
                            }
                        }.toString()
                    },
                    by_owner: {
                        map: function (doc) {
                            if (doc.type === 'dataset_file' || doc.type === 'header_photo') {
                                emit(doc.owner_user_id, doc);
                            }
                        }.toString()
                    }
                }
            });
            console.log('✓ Created design document for dataset files');
        } catch (e) {
            if (e.statusCode === 409) {
                console.log('✓ Design document "datasets" already exists');
            } else {
                throw e;
            }
        }

        // Verify configuration
        console.log('\nVerifying CouchDB setup...');
        const dbInfo = await datecDB.info();

        // Count design documents
        const designDocs = await datecDB.list({
            startkey: '_design/',
            endkey: '_design0'
        });

        console.log('\n' + '='.repeat(60));
        console.log('CouchDB Setup Complete!');
        console.log('='.repeat(60));
        console.log('\nSummary:');
        console.log('  - URL: http://localhost:5984');
        console.log('  - Database: datec');
        console.log('  - Admin: sudod4t3c');
        console.log(`  - Design documents: ${designDocs.rows.length}`);
        console.log(`  - Total documents: ${dbInfo.doc_count}`);
        console.log(`  - Deleted documents: ${dbInfo.doc_del_count}`);
        console.log('  - Ready for file uploads');
        console.log('\nNote: Binary attachments will be added via application');

    } catch (error) {
        console.error('\n' + '!'.repeat(60));
        console.error('ERROR during CouchDB setup:');
        console.error('!'.repeat(60));
        console.error(error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    setupCouchDB();
}

module.exports = setupCouchDB;