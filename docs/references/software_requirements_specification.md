# DaTEC Software Requirements Specification

## Document Information
- **Project**: DaTEC (Dataset Sharing Platform)
- **Course**: IC4302 - Bases de Datos II
- **Document Type**: Software Requirements Specification (SRS)
- **Version**: 2.0
- **Date**: September 18, 2025

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Database Naming Conventions](#database-naming-conventions)
4. [Database Architecture](#database-architecture)
5. [Data Models](#data-models)
6. [User Stories Implementation](#user-stories-implementation)
7. [Database Operations](#database-operations)
8. [Technical Requirements](#technical-requirements)
9. [Implementation Timeline](#implementation-timeline)
10. [Acceptance Criteria](#acceptance-criteria)

---

## Executive Summary

DaTEC is an academic dataset sharing platform implementing **21 core user stories** plus **2 additional features** (tags system and comment likes). The system uses a multi-database architecture with MongoDB and Redis in Docker containers, plus Neo4j and CouchDB running locally.

### Key Features
- Multi-database architecture for optimal performance
- Social networking (follow users, private messaging)
- Dataset approval workflow with admin moderation
- Real-time notifications and counters
- Enhanced search with tags
- Secure authentication with bcrypt

---

## System Overview

### Stakeholder Roles
- **Students**: Upload and download datasets for academic projects
- **Researchers**: Share research data and collaborate with peers
- **Administrators**: Manage platform content and user permissions
- **Visitors**: Browse public datasets

### Technical Stack
- **Frontend**: React.js
- **Backend**: Node.js with Express.js
- **Databases**: 
  - MongoDB (Docker) - Structured data
  - Redis (Docker) - Caching and notifications
  - Neo4j (Local) - Social graph
  - CouchDB (Local) - Binary files

---

## Database Naming Conventions

### General Principles
- **Case**: Lowercase with underscores (snake_case)
- **Clarity**: Descriptive names indicating purpose
- **Consistency**: Uniform patterns across databases
- **Simplicity**: Avoid abbreviations

### Collection Names
```
users                    # User accounts
datasets                 # Dataset metadata
comments                 # User comments
comment_likes            # Comment reactions (additional feature)
votes                    # Dataset votes
private_messages         # Direct messages
```

### Identifier Formats

**User ID (user_id)**
```
Format: UUID v4
Example: "550e8400-e29b-41d4-a716-446655440000"
```

**Dataset ID (dataset_id)**
```
Format: {username}_{YYYYMMDD}_{sequence}
Example: "john_doe_20250928_001"
```

**Comment ID (comment_id)**
```
Format: cmt_{dataset_id}_{timestamp}_{sequence}
Example: "cmt_john_doe_20250928_001_20250928143022_001"
```

### Administrative Credentials
```
Username: datec_admin
Password: datec_m4ster-p1n
Email: admin@datec.cr
```

---

## Database Architecture

### Database Selection Rationale

#### MongoDB - Operational Data & Simple Relationships
**Purpose**: Core structured data and simple many-to-many relationships

**Why MongoDB:**
- Document model fits operational data
- Simple relationships (votes, likes) require only lookups, no graph traversal
- Unique constraint support prevents duplicates
- Text search capabilities
- Flexible schema

**Collections**: users, datasets, comments, votes, comment_likes, private_messages

#### Neo4j - Social Graph & Download Analytics
**Purpose**: Complex relationships requiring graph traversal

**Why Neo4j:**
- Optimized for social relationship queries
- Efficient follower/following traversal
- Download pattern analysis across user networks
- Future analytics capabilities

**Relationships**: FOLLOWS, DOWNLOADED

#### Redis - Real-time Operations
**Purpose**: Caching and real-time counters

**Why Redis:**
- In-memory sub-millisecond performance
- Atomic increment operations
- Notification queues with LPUSH/LPOP
- Session storage with TTL

**Data Types**: Counters, lists, hashes

#### CouchDB - Binary File Storage
**Purpose**: Binary attachments

**Why CouchDB:**
- Optimized for large binary files
- Built-in HTTP access
- Replication capabilities
- Better than GridFS for large files

**Document Types**: user_avatars, dataset_files, header_photos, tutorial_videos

---

## Data Models

### MongoDB Schemas

#### Users Collection

```javascript
{
  // Identification
  user_id: "550e8400-e29b-41d4-a716-446655440000",     // PK: UUID v4
  username: "john_doe",                                 // Unique username
  email_address: "john@datec.cr",                       // Unique email
  
  // Authentication (HU1)
  password_hash: "$2b$12$...",                          // Bcrypt hash
  password_salt: "random_salt_string",                  // Unique salt
  
  // Profile information
  full_name: "John Doe",                                // Display name
  birth_date: ISODate("1995-03-15"),                    // Birth date (min age 13)
  avatar_couchdb_id: "avatar_550e8400...",              // CouchDB reference
  
  // Permissions
  is_admin: false,                                      // Admin flag (HU2, HU3)
  
  // Timestamps
  created_at: ISODate("2025-09-28T10:00:00Z"),
  updated_at: ISODate("2025-09-28T10:00:00Z")
}

// Indexes
db.users.createIndex({ user_id: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email_address: 1 }, { unique: true })
```

#### Datasets Collection

```javascript
{
  // Identification
  dataset_id: "john_doe_20250928_001",                  // PK: {username}_{date}_{seq}
  owner_user_id: "550e8400-e29b-41d4-a716-446655440000", // FK to users.user_id
  parent_dataset_id: null,                              // FK to datasets.dataset_id (HU18: cloning)
  
  // Metadata
  dataset_name: "Global Sales Analysis 2024",           // Display name
  description: "Comprehensive analysis...",             // Searchable description
  tags: ["sales", "analytics", "business"],             // Additional feature: searchable tags
  
  // Approval workflow (HU6, HU8)
  status: "pending",                                    // pending | approved | rejected
  reviewed_at: null,                                    // Last review timestamp
  admin_review: null,                                   // Admin comments (approval/rejection notes)
  
  // Privacy control (HU7)
  is_public: false,                                     // Only applies if status === "approved"
  
  // File references - CouchDB (HU5)
  file_references: [
    {
      file_name: "sales_q1.csv",                        // Original filename
      couchdb_document_id: "file_john_doe_20250928_001_001",
      file_size_bytes: 15728640,                        // 15 MB - for display (HU10)
      mime_type: "text/csv",
      uploaded_at: ISODate("2025-09-28T10:30:00Z")
    }
  ],
  
  // Optional media - CouchDB
  header_photo_ref: {                                   // Optional header photo (HU5)
    couchdb_document_id: "photo_john_doe_20250928_001_header",
    file_name: "header.jpg",
    file_size_bytes: 2048000,                           // 2 MB
    mime_type: "image/jpeg"
  },
  
  tutorial_video_ref: {                                 // Optional tutorial video (HU11)
    couchdb_document_id: "video_john_doe_20250928_001_tutorial",
    file_name: "tutorial.mp4",
    file_size_bytes: 52428800,                          // 50 MB
    mime_type: "video/mp4",
    duration_seconds: 180
  },
  
  // Denormalized counters - synced from Redis/aggregations
  download_count: 0,                                    // From Neo4j/Redis (HU13)
  vote_count: 0,                                        // From MongoDB votes collection (HU17)
  comment_count: 0,                                     // From MongoDB comments collection (HU15)
  
  // Timestamps
  created_at: ISODate("2025-09-28T10:00:00Z"),
  updated_at: ISODate("2025-09-28T10:00:00Z")
}

// Indexes
db.datasets.createIndex({ dataset_id: 1 }, { unique: true })
db.datasets.createIndex({ owner_user_id: 1, created_at: -1 })  // User's datasets (HU12)
db.datasets.createIndex({ parent_dataset_id: 1 })              // Find clones of a dataset (HU18)
db.datasets.createIndex({ status: 1 })                          // Admin approval queue
db.datasets.createIndex({ status: 1, is_public: 1 })           // Public dataset queries
db.datasets.createIndex({                                       // Full-text search (HU9)
  dataset_name: "text",
  description: "text",
  tags: "text"
}, {
  weights: { dataset_name: 10, tags: 5, description: 1 }
})
```

#### Comments Collection

```javascript
{
  // Identification
  comment_id: "cmt_john_doe_20250928_001_20250928143022_001",  // PK
  
  // Relationships
  target_dataset_id: "john_doe_20250928_001",          // FK to datasets.dataset_id
  author_user_id: "550e8400-e29b-41d4-a716-446655440000", // FK to users.user_id
  parent_comment_id: null,                             // FK to comments.comment_id (null = top-level)
  
  // Content
  content: "This dataset provides excellent insights...", // Comment text
  
  // Moderation (HU16)
  is_active: true,                                     // false = hidden by admin
  
  // Engagement (additional feature)
  like_count: 0,                                       // Denormalized from comment_likes
  
  // Timestamps
  created_at: ISODate("2025-09-28T16:20:00Z"),
  updated_at: ISODate("2025-09-28T16:20:00Z")
}

// Indexes
db.comments.createIndex({ comment_id: 1 }, { unique: true })
db.comments.createIndex({ target_dataset_id: 1, created_at: -1 })  // Dataset comments
db.comments.createIndex({ parent_comment_id: 1 })                   // Nested replies
db.comments.createIndex({ author_user_id: 1 })                      // User's comments
```

#### Comment Likes Collection (Additional Feature)

```javascript
{
  // Identification
  like_id: "like_cmt_john_doe_20250928_001_20250928143022_001_user_550e8400",
  
  // Relationships
  comment_id: "cmt_john_doe_20250928_001_20250928143022_001",  // FK to comments.comment_id
  user_id: "550e8400-e29b-41d4-a716-446655440000",             // FK to users.user_id
  
  // Timestamp
  created_at: ISODate("2025-09-28T16:25:00Z")
}

// Indexes
db.comment_likes.createIndex({ like_id: 1 }, { unique: true })
db.comment_likes.createIndex({ comment_id: 1, user_id: 1 }, { unique: true })  // Prevent duplicates
db.comment_likes.createIndex({ comment_id: 1 })                                 // Count likes
db.comment_likes.createIndex({ user_id: 1 })                                    // User's likes
```

#### Votes Collection

```javascript
{
  // Identification
  vote_id: "vote_john_doe_20250928_001_user_550e8400",  // PK
  
  // Relationships
  target_dataset_id: "john_doe_20250928_001",           // FK to datasets.dataset_id
  user_id: "550e8400-e29b-41d4-a716-446655440000",      // FK to users.user_id
  
  // Timestamp
  created_at: ISODate("2025-09-28T16:30:00Z")
}

// Indexes
db.votes.createIndex({ vote_id: 1 }, { unique: true })
db.votes.createIndex({ target_dataset_id: 1, user_id: 1 }, { unique: true })  // Prevent duplicates (HU17)
db.votes.createIndex({ target_dataset_id: 1 })                                 // Count votes
db.votes.createIndex({ user_id: 1 })                                           // User's voting history
```

#### Private Messages Collection

```javascript
{
  // Identification
  message_id: "msg_from_550e8400_to_449d7344_20250928_001",  // PK
  
  // Relationships
  from_user_id: "550e8400-e29b-41d4-a716-446655440000",      // FK to users.user_id (sender)
  to_user_id: "449d7344-e29b-41d4-a716-446655440001",        // FK to users.user_id (recipient)
  
  // Content
  content: "Hi! I have questions about your dataset...",     // Message text
  
  // Timestamp
  created_at: ISODate("2025-09-28T17:00:00Z")
}

// Indexes
db.private_messages.createIndex({ message_id: 1 }, { unique: true })
db.private_messages.createIndex({ from_user_id: 1, to_user_id: 1, created_at: -1 })  // Conversations
db.private_messages.createIndex({ to_user_id: 1, created_at: -1 })                    // Inbox
db.private_messages.createIndex({ from_user_id: 1, created_at: -1 })                  // Sent messages
```

---

### Neo4j Schemas

#### User and Dataset Nodes

```cypher
// User node
CREATE (u:User {
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  username: "john_doe"
})

// Dataset node
CREATE (d:Dataset {
  dataset_id: "john_doe_20250928_001",
  dataset_name: "Global Sales Analysis 2024"
})
```

#### FOLLOWS Relationship (HU19, HU20)

```cypher
// Follow relationship
CREATE (follower:User {user_id: "follower_uuid"})
-[:FOLLOWS {
  followed_at: datetime("2025-09-28T16:00:00Z"),       // When follow occurred
  notifications_enabled: true                           // Notification preference
}]->
(followed:User {user_id: "followed_uuid"})

// Query: Get all followers
MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
RETURN follower.user_id, follower.username
ORDER BY follower.username

// Query: Get all following
MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(followed:User)
RETURN followed.user_id, followed.username
ORDER BY followed.username
```

#### DOWNLOADED Relationship (HU13)

```cypher
// Download relationship
CREATE (user:User {user_id: "maria_garcia_uuid"})
-[:DOWNLOADED {
  downloaded_at: datetime("2025-09-28T16:30:00Z"),     // Download timestamp
  download_source: "web_interface"                      // Source: web_interface, api, mobile
}]->
(dataset:Dataset {dataset_id: "john_doe_20250928_001"})

// Query: Get all users who downloaded a dataset
MATCH (user:User)-[d:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
RETURN user.user_id, user.username, d.downloaded_at
ORDER BY d.downloaded_at DESC

// Query: Download statistics over time
MATCH (user:User)-[d:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
WHERE d.downloaded_at >= datetime($start_date) 
  AND d.downloaded_at <= datetime($end_date)
RETURN date(d.downloaded_at) AS download_date, count(*) AS download_count
ORDER BY download_date
```

---

### Redis Data Structures

```javascript
// Download counters (HU13)
SET download_count:dataset:john_doe_20250928_001 156
INCR download_count:dataset:john_doe_20250928_001

// Vote counters (HU17)
SET vote_count:dataset:john_doe_20250928_001 42
INCR vote_count:dataset:john_doe_20250928_001

// Notification queues (HU19) - FIFO lists
LPUSH notifications:user:550e8400-e29b-41d4-a716-446655440000 {
  "type": "new_dataset",
  "from_user_id": "followed_uuid",
  "dataset_id": "new_dataset_id",
  "timestamp": "2025-09-28T17:00:00Z"
}
LRANGE notifications:user:550e8400-e29b-41d4-a716-446655440000 0 9  // Get 10 most recent

// User sessions - Hash with TTL
HSET session:abc123xyz user_id "550e8400-e29b-41d4-a716-446655440000"
HSET session:abc123xyz username "john_doe"
EXPIRE session:abc123xyz 3600  // 1 hour

// Cache frequently accessed data
SET cache:dataset:john_doe_20250928_001 {json_data}
EXPIRE cache:dataset:john_doe_20250928_001 300  // 5 minutes
```

---

### CouchDB Schemas

```javascript
// User avatar document
{
  "_id": "avatar_550e8400-e29b-41d4-a716-446655440000",
  "type": "user_avatar",
  "owner_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "uploaded_at": "2025-09-28T10:00:00Z",
  "_attachments": {
    "profile.jpg": {
      "content_type": "image/jpeg",
      "length": 204800                              // 200 KB
    }
  }
}

// Dataset file document
{
  "_id": "file_john_doe_20250928_001_001",
  "type": "dataset_file",
  "owner_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_id": "john_doe_20250928_001",
  "uploaded_at": "2025-09-28T10:30:00Z",
  "_attachments": {
    "sales_q1.csv": {
      "content_type": "text/csv",
      "length": 15728640                            // 15 MB
    }
  }
}

// Header photo document
{
  "_id": "photo_john_doe_20250928_001_header",
  "type": "header_photo",
  "owner_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_id": "john_doe_20250928_001",
  "uploaded_at": "2025-09-28T10:15:00Z",
  "_attachments": {
    "header.jpg": {
      "content_type": "image/jpeg",
      "length": 2048000                             // 2 MB
    }
  }
}

// Tutorial video document
{
  "_id": "video_john_doe_20250928_001_tutorial",
  "type": "tutorial_video",
  "owner_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_id": "john_doe_20250928_001",
  "uploaded_at": "2025-09-28T10:20:00Z",
  "_attachments": {
    "tutorial.mp4": {
      "content_type": "video/mp4",
      "length": 52428800                            // 50 MB
    }
  }
}
```

---

## User Stories Implementation

### Authentication (HU1-HU4)

**HU1: User Self-Registration**
- Create account with username, encrypted password, profile picture
- UUID generation for user_id
- Bcrypt password hashing with unique salt
- Birth date validation (minimum age 13)
- Avatar upload to CouchDB

**HU2: Initial Administrator Account**
- Default admin created during installation
- Credentials: datec_admin / datec_m4ster-p1n

**HU3: Administrator Privilege Assignment**
- Admins can grant admin privileges to other users
- Update `is_admin` flag in users collection

**HU4: User Profile Management**
- Edit personal information, change password, update avatar
- Delete account functionality

---

### Dataset Management (HU5-HU8)

**HU5: Dataset Creation**
- Upload multiple data files, one header photo, one tutorial video
- Files stored in CouchDB, metadata in MongoDB
- Automatic `status: "pending"` for admin approval

**HU6: Dataset Approval Request**
- Automatic submission when created (no explicit action needed)

**HU7: Dataset Privacy and Deletion**
- Owner can toggle `is_public` (only if approved)
- Owner or admin can delete dataset

**HU8: Dataset Approval Process**

**Workflow:**
```
CREATE → pending → ADMIN REVIEWS → approved/rejected → OWNER MAKES PUBLIC
```

**States:**
- **pending**: Awaiting admin review
- **approved**: Admin approved, still private until owner sets public
- **rejected**: Admin rejected with comments in `admin_review`

**Admin Actions:**
```javascript
// Approve
POST /api/admin/datasets/:dataset_id/approve
Body: { admin_review: "Optional notes" }

// Reject
POST /api/admin/datasets/:dataset_id/reject
Body: { admin_review: "Reason for rejection" }
```

**User Actions After Rejection:**
```javascript
// Edit and resubmit
PUT /api/datasets/:dataset_id
POST /api/datasets/:dataset_id/resubmit
// Returns to pending, clears reviewed_at and admin_review
```

---

### Search & Discovery (HU9-HU12)

**HU9: Dataset Search**
- Full-text search by name, description, tags
- Only approved and public datasets visible
- MongoDB text indexes with relevance scoring

**HU10: Dataset Detailed View**
- Complete metadata display including file sizes
- Download statistics and votes
- Comments section

**HU11: Video Content Integration**
- One tutorial video per dataset
- Embedded video player

**HU12: User Dataset Portfolio**
- View all public datasets by a specific user
- User statistics (datasets, downloads, votes, followers, followed)

---

### Analytics (HU13)

**HU13: Download Analytics**
- Track who downloaded datasets (Neo4j DOWNLOADED relationships)
- Download timestamps and statistics
- Real-time counters in Redis

---

### Social Interaction (HU14-HU18)

**HU14: User Discovery**
- Search users by username and name
- View user profiles and public datasets

**HU15: Comment System with Reactions**
- Comment on datasets with threaded replies
- Like comments (additional feature)
- Admin moderation via `is_active` flag

**HU16: Comment Moderation**
- Admins can hide comments (set `is_active: false`)

**HU17: Dataset Voting System**
- Upvote datasets (toggle on/off)
- Track voting history
- Unique constraint prevents duplicate votes

**HU18: Dataset Cloning**
- Clone existing public datasets with new name
- Cloned dataset starts in pending status

---

### Advanced Social Features (HU19-HU21)

**HU19: User Following System**
- Follow other users (Neo4j FOLLOWS relationship)
- Receive notifications when followed users publish datasets

**HU20: Follower Management**
- View who follows you
- View who you follow

**HU21: Private Messaging**
- Send direct messages to other users
- Time-ordered message threads

---

## Database Operations

### Complete Dataset Lifecycle

```javascript
// 1. Create dataset
async function createDataset(userId, datasetData, files) {
  // Upload to CouchDB
  const fileRefs = await uploadFiles(files);
  
  // Create in MongoDB
  const dataset = {
    dataset_id: generateDatasetId(username),
    owner_user_id: userId,
    dataset_name: datasetData.name,
    description: datasetData.description,
    tags: datasetData.tags,
    status: "pending",
    is_public: false,
    reviewed_at: null,
    admin_review: null,
    file_references: fileRefs,
    download_count: 0,
    vote_count: 0,
    comment_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  await mongodb.datasets.insertOne(dataset);
  
  // Initialize Redis counters
  await redis.set(`download_count:dataset:${dataset.dataset_id}`, 0);
  await redis.set(`vote_count:dataset:${dataset.dataset_id}`, 0);
  
  // Create Neo4j node
  await neo4j.run(`
    CREATE (d:Dataset {dataset_id: $id, dataset_name: $name})
  `, { id: dataset.dataset_id, name: dataset.dataset_name });
  
  return dataset;
}

// 2. Admin approves
async function approveDataset(datasetId, adminReview) {
  await mongodb.datasets.updateOne(
    { dataset_id: datasetId, status: "pending" },
    {
      $set: {
        status: "approved",
        is_public: false,
        reviewed_at: new Date(),
        admin_review: adminReview || null
      }
    }
  );
  
  // Notify owner via Redis
  const dataset = await mongodb.datasets.findOne({ dataset_id: datasetId });
  await redis.lpush(`notifications:user:${dataset.owner_user_id}`, 
    JSON.stringify({
      type: "dataset_approved",
      dataset_id: datasetId,
      timestamp: new Date().toISOString()
    })
  );
}

// 3. Admin rejects
async function rejectDataset(datasetId, adminReview) {
  await mongodb.datasets.updateOne(
    { dataset_id: datasetId, status: "pending" },
    {
      $set: {
        status: "rejected",
        reviewed_at: new Date(),
        admin_review: adminReview
      }
    }
  );
  
  // Notify owner
  const dataset = await mongodb.datasets.findOne({ dataset_id: datasetId });
  await redis.lpush(`notifications:user:${dataset.owner_user_id}`, 
    JSON.stringify({
      type: "dataset_rejected",
      dataset_id: datasetId,
      admin_review: adminReview,
      timestamp: new Date().toISOString()
    })
  );
}

// 4. Owner resubmits
async function resubmitDataset(userId, datasetId) {
  await mongodb.datasets.updateOne(
    { dataset_id: datasetId, owner_user_id: userId, status: "rejected" },
    {
      $set: {
        status: "pending",
        reviewed_at: null,
        admin_review: null,
        updated_at: new Date()
      }
    }
  );
}

// 5. Owner makes public
async function makeDatasetPublic(userId, datasetId) {
  const dataset = await mongodb.datasets.findOne({ 
    dataset_id: datasetId,
    owner_user_id: userId,
    status: "approved"
  });
  
  if (!dataset) throw new Error("Dataset must be approved first");
  
  await mongodb.datasets.updateOne(
    { dataset_id: datasetId },
    { $set: { is_public: true, updated_at: new Date() } }
  );
  
  // Notify followers
  const followers = await neo4j.run(`
    MATCH (f:User)-[:FOLLOWS]->(o:User {user_id: $owner_id})
    RETURN f.user_id
  `, { owner_id: userId });
  
  for (const follower of followers.records) {
    await redis.lpush(`notifications:user:${follower.get('f.user_id')}`, 
      JSON.stringify({
        type: "new_dataset",
        from_user_id: userId,
        dataset_id: datasetId,
        timestamp: new Date().toISOString()
      })
    );
  }
}

// 6. User downloads dataset
async function downloadDataset(userId, datasetId, fileId) {
  // Verify public and approved
  const dataset = await mongodb.datasets.findOne({
    dataset_id: datasetId,
    status: "approved",
    is_public: true
  });
  
  if (!dataset) throw new Error("Dataset not available");
  
  // Get file from CouchDB
  const file = await couchdb.attachment.get('datec_files', fileId, filename);
  
  // Record in Neo4j
  await neo4j.run(`
    MATCH (u:User {user_id: $userId}), (d:Dataset {dataset_id: $datasetId})
    CREATE (u)-[:DOWNLOADED {
      downloaded_at: datetime(),
      download_source: 'web_interface'
    }]->(d)
  `, { userId, datasetId });
  
  // Increment Redis counter
  await redis.incr(`download_count:dataset:${datasetId}`);
  
  // Sync to MongoDB (async)
  const count = await redis.get(`download_count:dataset:${datasetId}`);
  await mongodb.datasets.updateOne(
    { dataset_id: datasetId },
    { $set: { download_count: parseInt(count) } }
  );
  
  return file;
}

// 7. User votes on dataset
async function toggleVote(userId, datasetId) {
  const existingVote = await mongodb.votes.findOne({
    target_dataset_id: datasetId,
    user_id: userId
  });
  
  if (existingVote) {
    // Remove vote
    await mongodb.votes.deleteOne({ vote_id: existingVote.vote_id });
    await redis.decr(`vote_count:dataset:${datasetId}`);
  } else {
    // Add vote
    await mongodb.votes.insertOne({
      vote_id: `vote_${datasetId}_${userId}`,
      target_dataset_id: datasetId,
      user_id: userId,
      created_at: new Date()
    });
    await redis.incr(`vote_count:dataset:${datasetId}`);
  }
  
  // Sync to MongoDB
  const count = await redis.get(`vote_count:dataset:${datasetId}`);
  await mongodb.datasets.updateOne(
    { dataset_id: datasetId },
    { $set: { vote_count: parseInt(count) } }
  );
}

// 9. User clones dataset (HU18)
async function cloneDataset(userId, sourceDatasetId, newName) {
  // Get source dataset
  const sourceDataset = await mongodb.datasets.findOne({
    dataset_id: sourceDatasetId,
    status: "approved",
    is_public: true
  });
  
  if (!sourceDataset) throw new Error("Dataset must be approved and public to clone");
  
  // Clone files in CouchDB
  const clonedFileRefs = await Promise.all(
    sourceDataset.file_references.map(async (fileRef) => {
      const newFileId = generateCouchDBId(userId, newName);
      await couchdb.copy(fileRef.couchdb_document_id, newFileId);
      return {
        ...fileRef,
        couchdb_document_id: newFileId
      };
    })
  );
  
  // Clone photos and videos if exist
  let clonedPhotoRef = null;
  if (sourceDataset.header_photo_ref) {
    const newPhotoId = generateCouchDBId(userId, newName, 'photo');
    await couchdb.copy(sourceDataset.header_photo_ref.couchdb_document_id, newPhotoId);
    clonedPhotoRef = {
      ...sourceDataset.header_photo_ref,
      couchdb_document_id: newPhotoId
    };
  }
  
  let clonedVideoRef = null;
  if (sourceDataset.tutorial_video_ref) {
    const newVideoId = generateCouchDBId(userId, newName, 'video');
    await couchdb.copy(sourceDataset.tutorial_video_ref.couchdb_document_id, newVideoId);
    clonedVideoRef = {
      ...sourceDataset.tutorial_video_ref,
      couchdb_document_id: newVideoId
    };
  }
  
  // Create cloned dataset
  const clonedDataset = {
    dataset_id: generateDatasetId(username),
    owner_user_id: userId,
    parent_dataset_id: sourceDatasetId,              // Attribution to original
    dataset_name: newName,
    description: sourceDataset.description,
    tags: sourceDataset.tags,
    status: "pending",                                // Must be approved again
    is_public: false,
    reviewed_at: null,
    admin_review: null,
    file_references: clonedFileRefs,
    header_photo_ref: clonedPhotoRef,
    tutorial_video_ref: clonedVideoRef,
    download_count: 0,
    vote_count: 0,
    comment_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  await mongodb.datasets.insertOne(clonedDataset);
  
  // Initialize Redis counters
  await redis.set(`download_count:dataset:${clonedDataset.dataset_id}`, 0);
  await redis.set(`vote_count:dataset:${clonedDataset.dataset_id}`, 0);
  
  // Create Neo4j node
  await neo4j.run(`
    CREATE (d:Dataset {dataset_id: $id, dataset_name: $name})
  `, { id: clonedDataset.dataset_id, name: clonedDataset.dataset_name });
  
  return clonedDataset;
}

// 10. User follows another user (HU19)
async function followUser(followerId, followedId) {
  // Verify both users exist
  const follower = await mongodb.users.findOne({ user_id: followerId });
  const followed = await mongodb.users.findOne({ user_id: followedId });
  
  if (!follower || !followed) throw new Error("User not found");
  if (followerId === followedId) throw new Error("Cannot follow yourself");
  
  // Check if already following
  const existing = await neo4j.run(`
    MATCH (follower:User {user_id: $followerId})-[r:FOLLOWS]->(followed:User {user_id: $followedId})
    RETURN r
  `, { followerId, followedId });
  
  if (existing.records.length > 0) throw new Error("Already following this user");
  
  // Create FOLLOWS relationship in Neo4j
  await neo4j.run(`
    MATCH (follower:User {user_id: $followerId}), 
          (followed:User {user_id: $followedId})
    CREATE (follower)-[:FOLLOWS {
      followed_at: datetime(),
      notifications_enabled: true
    }]->(followed)
  `, { followerId, followedId });
  
  // Notify followed user via Redis
  await redis.lpush(`notifications:user:${followedId}`, 
    JSON.stringify({
      type: "new_follower",
      from_user_id: followerId,
      from_username: follower.username,
      timestamp: new Date().toISOString()
    })
  );
}

// 11. User unfollows another user (HU19)
async function unfollowUser(followerId, followedId) {
  await neo4j.run(`
    MATCH (follower:User {user_id: $followerId})-[r:FOLLOWS]->(followed:User {user_id: $followedId})
    DELETE r
  `, { followerId, followedId });
}

// 12. Get user's followers (HU20)
async function getFollowers(userId) {
  const result = await neo4j.run(`
    MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $userId})
    RETURN follower.user_id AS user_id, follower.username AS username
    ORDER BY follower.username
  `, { userId });
  
  return result.records.map(record => ({
    user_id: record.get('user_id'),
    username: record.get('username')
  }));
}

// 13. Get users that user follows (HU19)
async function getFollowing(userId) {
  const result = await neo4j.run(`
    MATCH (user:User {user_id: $userId})-[:FOLLOWS]->(followed:User)
    RETURN followed.user_id AS user_id, followed.username AS username
    ORDER BY followed.username
  `, { userId });
  
  return result.records.map(record => ({
    user_id: record.get('user_id'),
    username: record.get('username')
  }));
}
```

### Data Synchronization

```javascript
// Background job: Sync Redis counters to MongoDB (runs every 5 minutes)
async function syncCounters() {
  const datasets = await mongodb.datasets.find({}, { dataset_id: 1 }).toArray();
  
  for (const { dataset_id } of datasets) {
    const downloadCount = await redis.get(`download_count:dataset:${dataset_id}`);
    const voteCount = await redis.get(`vote_count:dataset:${dataset_id}`);
    
    await mongodb.datasets.updateOne(
      { dataset_id: dataset_id },
      { 
        $set: { 
          download_count: parseInt(downloadCount) || 0,
          vote_count: parseInt(voteCount) || 0
        } 
      }
    );
  }
}
```

---

## Technical Requirements

### Functional Requirements

**FR1: Authentication System**
- User registration with bcrypt (cost factor 12)
- Unique salt per user
- Session management via Redis (1-hour TTL)
- Profile picture upload to CouchDB

**FR2: Dataset Management**
- Multi-file upload support
- Single header photo (optional)
- Single tutorial video (optional)
- Automatic dataset_id generation
- Privacy controls

**FR3: Search and Discovery**
- Full-text search with MongoDB text indexes
- Tag-based filtering
- Results limited to approved and public datasets

**FR4: Social Features**
- User following via Neo4j
- Notification system via Redis
- Comment threading with likes
- Private messaging
- Dataset voting

**FR5: Administrative Functions**
- Dataset approval workflow
- Admin privilege assignment
- Comment moderation
- Download analytics

### Non-Functional Requirements

**NFR1: Performance**
- Page load time under 2 seconds (95% of requests)
- Search results within 1 second
- Database queries under 100ms (90% of operations)
- File upload up to 1GB per file
- Video upload up to 500MB

**NFR2: Security**
- Bcrypt password hashing (cost factor 12)
- Unique salt per user
- HTTPS encryption
- File upload validation
- Session timeout (1 hour)

**NFR3: Reliability**
- 99% uptime target
- Daily automated backups
- MongoDB replica set for redundancy
- Redis persistence (RDB + AOF)
- Error handling with graceful degradation

**NFR4: Usability**
- Responsive design (mobile and desktop)
- Intuitive interface
- Clear error messages
- Loading indicators
- Consistent navigation

**NFR5: Scalability**
- MongoDB replica set handles read distribution
- Redis replication for high availability
- Connection pooling across all databases
- Horizontal scaling capability for web servers

---

## Implementation Timeline

**Day 1-2**: Database Setup & Authentication
- Docker setup for MongoDB and Redis
- Local installation of Neo4j and CouchDB
- User registration and login
- Admin account creation

**Day 3-4**: Dataset CRUD & File Storage
- Dataset creation with file uploads
- CouchDB integration
- Dataset approval workflow
- Privacy controls

**Day 5**: Search & Admin Features
- Full-text search implementation
- Tag filtering
- Admin approval interface
- Comment moderation

**Day 6**: Social Features
- User following (Neo4j)
- Comment system with likes
- Private messaging
- Dataset voting
- Notifications

**Day 7**: Testing & Documentation
- Integration testing
- Cross-database operation validation
- Performance testing
- Final documentation

---

## Acceptance Criteria

### Core Requirements
✅ All 21 user stories implemented and tested
✅ Multi-database architecture operational
✅ Docker containers stable (MongoDB, Redis)
✅ Local databases integrated (Neo4j, CouchDB)
✅ Dataset approval workflow functional
✅ Search with tags operational

### Additional Features
✅ Tag-based search system
✅ Comment like functionality
✅ Enhanced user experience

### Quality Assurance
✅ Unit tests for critical business logic
✅ Integration tests for cross-database operations
✅ Security validation
✅ Performance testing meets requirements

### Database Distribution
✅ MongoDB: Operational data and simple relationships
✅ Redis: Real-time counters and notifications
✅ Neo4j: Social graph (follows, downloads)
✅ CouchDB: Binary file storage

---

## Conclusion

This specification provides a complete, implementable plan for the DaTEC platform. The simplified approval workflow, clean schema organization, and clear database separation of concerns make this achievable within the 7-day timeline while meeting all assignment requirements and demonstrating advanced multi-database architecture skills.