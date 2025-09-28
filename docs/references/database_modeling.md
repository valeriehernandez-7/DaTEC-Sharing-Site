# DaTEC - Database Schemas & Models

## Document Information

- **Project**: DaTEC (Dataset Sharing Platform)
- **Version**: 3.0
- **Date**: September 20, 2025
- **Databases**: MongoDB, Redis, Neo4j, CouchDB

---

## Table of Contents

1. [MongoDB Schemas](#mongodb-schemas)
2. [Neo4j Graph Model](#neo4j-graph-model)
3. [Redis Data Structures](#redis-data-structures)
4. [CouchDB Document Types](#couchdb-document-types)
5. [Database Distribution Summary](#database-distribution-summary)

---

## MongoDB Schemas

### Database Configuration

```javascript
Database: datec
Connection: mongodb://sudod4t3c:dat3c_master_4dmin@localhost:27017/datec?authSource=admin&replicaSet=datecRS
```

---

### 1. Users Collection

**Purpose**: Store user accounts and authentication data (HU1, HU2, HU3, HU4)

```javascript
{
  // Primary Key
  _id: ObjectId("507f1f77bcf86cd799439011"),

  // Unique Identifier (HU1)
  user_id: "00000000-0000-5000-8000-00005a317347",  // UUID v5 - Used across all databases

  // Authentication (HU1)
  username: "john_doe",                               // Unique username, 3-30 chars, alphanumeric + underscore
  email_address: "john@datec.com",                     // Unique email address
  password_hash: "$2b$12$KZXvH8QjWZ...",              // Bcrypt hash with cost factor 12 (salt included)

  // Profile Information (HU1, HU4)
  full_name: "John Doe",                              // User's full display name
  birth_date: ISODate("1995-03-15T00:00:00Z"),        // Birth date (user must be 15+ years old)

  // Avatar Reference - CouchDB (HU1)
  avatar_ref: {
    couchdb_document_id: "avatar_00000000-0000-5000-8000-00005a317347",
    file_name: "profile.jpg",
    file_size_bytes: 204800,                          // 200 KB - for HU10 display
    mime_type: "image/jpeg"
  },  // Optional: can be null, uses default avatar

  // Permissions (HU2, HU3)
  is_admin: false,                                    // Admin flag - default false, only admins can set to true

  // Timestamps
  created_at: ISODate("2025-09-28T10:00:00Z"),        // Account creation timestamp
  updated_at: ISODate("2025-09-28T10:00:00Z")         // Last profile update timestamp (HU4)
}
```

**Indexes:**

```javascript
db.users.createIndex({ user_id: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email_address: 1 }, { unique: true });
db.users.createIndex({ username: "text", full_name: "text" });  // HU14 - User search
```

**Validation Rules:**

- username: 3-30 characters, alphanumeric + underscore only
- password: Minimum 8 characters (enforced before hashing)
- birth_date: User must be at least 15 years old at registration
- email_address: Must be valid email format
- avatar_ref: Optional (null allowed, default avatar used)

---

### 2. Datasets Collection

**Purpose**: Store dataset metadata and file references (HU5-HU13, HU18)

```javascript
{
  // Primary Key
  _id: ObjectId("507f1f77bcf86cd799439012"),

  // Unique Identifier (HU5)
  dataset_id: "john_doe_20250928_001",                // Format: {username}_{YYYYMMDD}_{sequence}

  // Ownership (HU5)
  owner_user_id: "00000000-0000-5000-8000-00005a317347",  // FK to users.user_id

  // Cloning Reference (HU18)
  parent_dataset_id: null,                             // If cloned, references original dataset_id, otherwise null
  
  // HU18 - Clone Strategy:
  // When cloning a dataset:
  // 1. Duplicate ALL files in CouchDB (new document IDs)
  // 2. Create new MongoDB dataset with parent_dataset_id reference
  // 3. Create new Neo4j Dataset node
  // 4. Initialize new Redis counters at 0
  // 5. Set status='pending' (must be approved independently)
  // 6. If parent is deleted, clone continues working independently

  // Basic Metadata (HU5, HU9)
  dataset_name: "Global Sales Analysis 2024",          // Dataset title, 3-100 chars
  description: "Comprehensive analysis of global sales patterns...",  // Dataset description, 10-5000 chars
  tags: ["sales", "analytics", "business", "2024"],    // Optional array for HU9 search, can be empty

  // Approval Workflow (HU6, HU8)
  status: "pending",                                   // "pending" | "approved" | "rejected"
  reviewed_at: null,                                   // ISODate when admin reviewed, null if not reviewed
  admin_review: null,                                  // Admin's review comment (approval/rejection reason)

  // Privacy Control (HU7)
  is_public: false,                                    // User controls visibility, only applies if status="approved"
  
  // HU7 - Dataset Visibility & Deletion:
  // "Desactivar" = set is_public=false (dataset exists but hidden from public)
  // "Eliminar" = hard delete (complete removal):
  //   1. Delete MongoDB document (datasets.deleteOne)
  //   2. Delete all CouchDB files (file_references + header_photo_ref)
  //   3. Delete Neo4j Dataset node and all relationships
  //   4. Delete Redis counters (download_count, vote_count)
  //   5. Clones keep parent_dataset_id but show "Original deleted" message

  // Data Files References - CouchDB (HU5)
  file_references: [
    {
      couchdb_document_id: "file_john_doe_20250928_001_001",
      file_name: "sales_q1.csv",
      file_size_bytes: 15728640,                       // 15 MB - displayed in HU10
      mime_type: "text/csv",
      uploaded_at: ISODate("2025-09-28T10:30:00Z")
    },
    {
      couchdb_document_id: "file_john_doe_20250928_001_002",
      file_name: "sales_q2.xlsx",
      file_size_bytes: 8388608,                        // 8 MB
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      uploaded_at: ISODate("2025-09-28T10:31:00Z")
    }
  ],  // At least 1 file required

  // Header Photo Reference - CouchDB (HU5)
  header_photo_ref: {
    couchdb_document_id: "photo_john_doe_20250928_001_header",
    file_name: "header.jpg",
    file_size_bytes: 2048000,                          // 2 MB max
    mime_type: "image/jpeg"
  },  // Optional: can be null, uses default image

  // Tutorial Video Reference (HU5, HU11)
  tutorial_video_ref: {
    url: "https://youtube.com/watch?v=abc123",
    platform: "youtube"                                // "youtube" | "vimeo"
  },  // Optional: can be null if no video provided

  // Denormalized Counters (synced from Redis/aggregations)
  download_count: 156,                                 // From Neo4j DOWNLOADED relationships (HU13)
  vote_count: 42,                                      // From votes collection (HU17)
  comment_count: 8,                                    // From comments collection (HU15)
  
  // Note: clone_count calculated on-demand via query to avoid sync complexity

  // Timestamps
  created_at: ISODate("2025-09-28T10:00:00Z"),        // Dataset creation timestamp (HU5 - Fecha de Inclusión)
  updated_at: ISODate("2025-09-28T10:00:00Z")         // Last modification timestamp
}
```

**Indexes:**

```javascript
db.datasets.createIndex({ dataset_id: 1 }, { unique: true });
db.datasets.createIndex({ owner_user_id: 1, created_at: -1 });  // HU12
db.datasets.createIndex({ parent_dataset_id: 1 });               // HU18
db.datasets.createIndex({ status: 1, is_public: 1 });           // HU9
db.datasets.createIndex({ status: 1 });                          // HU8
db.datasets.createIndex(
  { dataset_name: "text", description: "text", tags: "text" },
  { weights: { dataset_name: 10, tags: 5, description: 1 } }    // HU9
);
```

**Validation Rules:**

- dataset_name: 3-100 characters, required
- description: 10-5000 characters, required
- file_references: At least 1 file required
- header_photo_ref: Optional (null allowed, default image used)
- tutorial_video_ref: Optional (null allowed)
- tags: Optional array (can be empty, minimum 1 recommended)
- status: Must be one of ["pending", "approved", "rejected"]
- is_public: Can only be true if status="approved"

---

### 3. Comments Collection

**Purpose**: Store user comments on datasets with threading support (HU15, HU16)

```javascript
{
  // Primary Key
  _id: ObjectId("507f1f77bcf86cd799439013"),

  // Unique Identifier (HU15)
  comment_id: "cmt_john_doe_20250928_001_20250928143022_001",  // Format: cmt_{dataset_id}_{timestamp}_{sequence}

  // Relationships (HU15)
  target_dataset_id: "john_doe_20250928_001",          // FK to datasets.dataset_id
  author_user_id: "00000000-0000-5000-8000-00005a317347",  // FK to users.user_id
  parent_comment_id: null,                             // FK to comments.comment_id - null if top-level

  // Content (HU15)
  content: "This dataset provides excellent insights into sales trends...",  // Comment text, 1-2000 chars

  // Moderation (HU16)
  is_active: true,                                     // Admin can set to false to hide comment (soft delete)

  // Timestamps
  created_at: ISODate("2025-09-28T16:20:00Z")         // Comment creation timestamp
}
```

**Indexes:**

```javascript
db.comments.createIndex({ comment_id: 1 }, { unique: true });
db.comments.createIndex({ target_dataset_id: 1, created_at: -1 });  // HU15
db.comments.createIndex({ parent_comment_id: 1 });                   // HU15
db.comments.createIndex({ author_user_id: 1 });
db.comments.createIndex({ is_active: 1 });                           // HU16
```

**Validation Rules:**

- content: 1-2000 characters, required
- Cannot reply to a comment more than 5 levels deep (prevent excessive nesting)
- Only admin can disable (set is_active=false)
- Comments are immutable once created (no editing allowed)

---

### 4. Votes Collection

**Purpose**: Track user votes on datasets (HU17)

```javascript
{
  // Primary Key
  _id: ObjectId("507f1f77bcf86cd799439014"),

  // Unique Identifier (HU17)
  vote_id: "vote_john_doe_20250928_001_user_550e8400",  // Format: vote_{dataset_id}_user_{user_id}

  // Relationships (HU17)
  target_dataset_id: "john_doe_20250928_001",          // FK to datasets.dataset_id
  user_id: "00000000-0000-5000-8000-00005a317347",     // FK to users.user_id

  // Timestamp (HU17)
  created_at: ISODate("2025-09-28T16:30:00Z")          // When vote was cast
}
```

**Indexes:**

```javascript
db.votes.createIndex({ vote_id: 1 }, { unique: true });
db.votes.createIndex({ target_dataset_id: 1, user_id: 1 }, { unique: true });  // HU17
db.votes.createIndex({ target_dataset_id: 1 });
db.votes.createIndex({ user_id: 1 });
```

**Business Rules:**

- One vote per user per dataset (enforced by unique index)
- Users can toggle vote on/off (delete and re-create)
- Users cannot vote on their own datasets
- Votes are counted and synced to datasets.vote_count periodically

---

### 5. Private Messages Collection

**Purpose**: Store direct messages between users (HU21)

```javascript
{
  // Primary Key
  _id: ObjectId("507f1f77bcf86cd799439015"),

  // Unique Identifier (HU21)
  message_id: "msg_from_550e8400_to_449d7344_20250928163000_001",  // Format: msg_from_{sender}_to_{recipient}_{timestamp}_{seq}

  // Relationships (HU21)
  from_user_id: "00000000-0000-5000-8000-00005a317347",  // FK to users.user_id - sender
  to_user_id: "449d7344-e29b-41d4-a716-446655440001",    // FK to users.user_id - recipient

  // Content (HU21)
  content: "Hi! I have questions about your Global Sales dataset...",  // Message text, 1-5000 chars

  // Timestamp (HU21)
  created_at: ISODate("2025-09-28T17:00:00Z")            // Message sent timestamp
}
```

**Indexes:**

```javascript
db.private_messages.createIndex({ message_id: 1 }, { unique: true });
db.private_messages.createIndex({ from_user_id: 1, to_user_id: 1, created_at: -1 });  // HU21
db.private_messages.createIndex({ to_user_id: 1, created_at: -1 });                   // HU21
db.private_messages.createIndex({ from_user_id: 1, created_at: -1 });
```

**Validation Rules:**

- content: 1-5000 characters, required
- Cannot message yourself (from_user_id ≠ to_user_id)
- Both users must exist in users collection

---

## Neo4j Graph Model

### Database Configuration

```cypher
// Connection
bolt://localhost:7687
Username: neo4j
Password: (set during installation)
Database: datec
```

---

### Node Types

#### User Node

**Purpose**: Represent users in the social graph

```cypher
CREATE (u:User {
  user_id: "00000000-0000-5000-8000-00005a317347",     // UUID matching MongoDB users.user_id
  username: "john_doe"                                 // Username for display in queries
})
```

**Properties:**

- `user_id`: String (UUID) - Primary identifier, matches MongoDB
- `username`: String - Display name for query results

**Constraints & Indexes:**

```cypher
CREATE CONSTRAINT user_id_unique FOR (u:User) REQUIRE u.user_id IS UNIQUE;
CREATE INDEX user_username FOR (u:User) ON (u.username);
```

---

#### Dataset Node

**Purpose**: Represent datasets in the download graph

```cypher
CREATE (d:Dataset {
  dataset_id: "john_doe_20250928_001",                 // Dataset ID matching MongoDB
  dataset_name: "Global Sales Analysis 2024"           // Name for display in queries
})
```

**Properties:**

- `dataset_id`: String - Primary identifier, matches MongoDB
- `dataset_name`: String - Display name for query results

**Constraints:**

```cypher
// Ensure dataset_id is unique
CREATE CONSTRAINT dataset_id_unique FOR (d:Dataset) REQUIRE d.dataset_id IS UNIQUE;
```

---

### Relationship Types

#### FOLLOWS Relationship (HU19, HU20)

**Purpose**: Track user following relationships for social features

```cypher
// Create follow relationship
CREATE (follower:User {user_id: "follower_uuid"})
-[:FOLLOWS {
  followed_at: datetime("2025-09-28T16:00:00Z")
}]->
(followed:User {user_id: "followed_uuid"})
```

**Properties:**

- `followed_at`: DateTime - Timestamp when follow occurred

**Common Queries:**

```cypher
// HU20 - Get all followers of a user
MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
RETURN follower.user_id, follower.username
ORDER BY follower.username;

// HU19 - Get all users that a user follows
MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(followed:User)
RETURN followed.user_id, followed.username
ORDER BY followed.username;

// Check if user A follows user B
MATCH (a:User {user_id: $user_a_id})-[r:FOLLOWS]->(b:User {user_id: $user_b_id})
RETURN r IS NOT NULL AS is_following;

// HU20 - Count followers
MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
RETURN count(follower) AS follower_count;

// HU19 - Count following
MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(followed:User)
RETURN count(followed) AS following_count;

// HU19 - Get all followers for notifications
MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
RETURN follower.user_id;
```

---

#### DOWNLOADED Relationship (HU13)

**Purpose**: Track dataset downloads for analytics

```cypher
CREATE (user:User {user_id: "maria_garcia_uuid"})
-[:DOWNLOADED {
  downloaded_at: datetime("2025-09-28T16:30:00Z")
}]->
(dataset:Dataset {dataset_id: "john_doe_20250928_001"})
```

**Properties:**

- `downloaded_at`: DateTime - Exact timestamp of download

**Common Queries:**

```cypher
// HU13 - Get all users who downloaded a dataset
MATCH (user:User)-[d:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
RETURN user.user_id, user.username, d.downloaded_at
ORDER BY d.downloaded_at DESC;

// HU13 - Total download count (includes multiple downloads by same user)
MATCH (user:User)-[:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
RETURN count(*) AS total_downloads;

// HU13 - Unique users who downloaded
MATCH (user:User)-[:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
RETURN count(DISTINCT user) AS unique_users;

// HU13 - Download statistics over time
MATCH (user:User)-[d:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
WHERE d.downloaded_at >= datetime($start_date)
  AND d.downloaded_at <= datetime($end_date)
WITH date(d.downloaded_at) AS download_date
RETURN download_date, count(*) AS download_count
ORDER BY download_date;

// Get user's download history
MATCH (user:User {user_id: $user_id})-[d:DOWNLOADED]->(dataset:Dataset)
RETURN dataset.dataset_id, dataset.dataset_name, d.downloaded_at
ORDER BY d.downloaded_at DESC;

// Check if user already downloaded a dataset
MATCH (user:User {user_id: $user_id})-[d:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
RETURN d IS NOT NULL AS has_downloaded;
```

---

## Redis Data Structures

### Database Configuration

```
Host: localhost
Port: 6379
Database: 0
```

---

### 1. Download Counters (HU13)

**Purpose**: Real-time download count tracking for fast reads

```redis
# Key pattern
download_count:dataset:{dataset_id}

# Example
SET download_count:dataset:john_doe_20250928_001 156

# Operations
INCR download_count:dataset:john_doe_20250928_001    # Increment on every download
GET download_count:dataset:john_doe_20250928_001     # Get current count for display
```

**Sync Strategy:**

- Increment in Redis immediately on download (fast, atomic)
- Background job syncs to MongoDB every 5 minutes
- Frontend reads from MongoDB (slightly delayed but consistent)

---

### 2. Vote Counters (HU17)

**Purpose**: Real-time vote count tracking

```redis
# Key pattern
vote_count:dataset:{dataset_id}

# Example
SET vote_count:dataset:john_doe_20250928_001 42

# Operations
INCR vote_count:dataset:john_doe_20250928_001        # When user adds vote
DECR vote_count:dataset:john_doe_20250928_001        # When user removes vote
GET vote_count:dataset:john_doe_20250928_001         # Get current count
```

**Sync Strategy:**

- Update Redis immediately on vote/unvote
- Background job syncs to MongoDB every 5 minutes
- Frontend reads from MongoDB

---

### 3. Notification Queues (HU19)

**Purpose**: Store user notifications as FIFO lists

```redis
# Key pattern (List structure)
notifications:user:{user_id}

# Push new follower notification
LPUSH notifications:user:00000000-0000-5000-8000-00005a317347 '{
  "type": "new_follower",
  "from_user_id": "follower_uuid",
  "from_username": "maria_garcia",
  "timestamp": "2025-09-28T17:00:00Z"
}'

# Push new dataset notification
LPUSH notifications:user:00000000-0000-5000-8000-00005a317347 '{
  "type": "new_dataset",
  "from_user_id": "followed_uuid",
  "dataset_id": "new_dataset_id",
  "dataset_name": "New Research Data",
  "timestamp": "2025-09-28T17:05:00Z"
}'

# Get latest 10 notifications (for navbar badge)
LRANGE notifications:user:00000000-0000-5000-8000-00005a317347 0 9

# Get total notification count
LLEN notifications:user:00000000-0000-5000-8000-00005a317347

# Clear old notifications (keep only last 50)
LTRIM notifications:user:00000000-0000-5000-8000-00005a317347 0 49
```

**Notification Message Format (JSON strings):**

```javascript
// Type 1: New Follower (HU19)
{
  "type": "new_follower",
  "from_user_id": "uuid",
  "from_username": "username",
  "timestamp": "2025-09-28T17:00:00Z"
}

// Type 2: New Dataset from Followed User (HU19)
{
  "type": "new_dataset",
  "from_user_id": "uuid",             // Who published
  "dataset_id": "dataset_id",         // Link to dataset
  "dataset_name": "name",             // For display
  "timestamp": "2025-09-28T17:05:00Z"
}

// Type 3: Dataset Approved (HU8)
{
  "type": "dataset_approved",
  "dataset_id": "dataset_id",
  "dataset_name": "name",
  "timestamp": "2025-09-28T17:10:00Z"
}

// Type 4: Dataset Rejected (HU8)
{
  "type": "dataset_rejected",
  "dataset_id": "dataset_id",
  "dataset_name": "name",
  "timestamp": "2025-09-28T17:15:00Z"
}
```

---

## CouchDB Document Types

### Database Configuration

```
URL: http://localhost:5984
Database: datec
Admin: sudod4t3c
Password: dat3c_master_4dmin
```

---

### 1. User Avatar Documents

**Purpose**: Store user profile pictures (HU1)

```javascript
{
  // Document ID
  "_id": "avatar_00000000-0000-5000-8000-00005a317347",  // Format: avatar_{user_id}
  "_rev": "1-abc123...",                                  // CouchDB revision
  
  // Metadata
  "type": "user_avatar",                                  // Document type for queries
  "owner_user_id": "00000000-0000-5000-8000-00005a317347",  // FK to MongoDB users.user_id
  "uploaded_at": "2025-09-28T10:00:00Z",                  // Upload timestamp
  
  // Binary Attachment
  "_attachments": {
    "profile.jpg": {
      "content_type": "image/jpeg",
      "length": 204800,                                   // 200 KB
      "stub": true
    }
  }
}
```

**File Constraints:**

- Max size: 2 MB per avatar
- Allowed types: image/jpeg, image/png, image/webp
- Single attachment per document
- Recommended dimensions: 400x400px (square)

---

### 2. Dataset File Documents

**Purpose**: Store dataset data files - CSV, Excel, JSON, etc. (HU5)

```javascript
{
  "_id": "file_john_doe_20250928_001_001",                // Format: file_{dataset_id}_{sequence}
  "_rev": "1-def456...",

  "type": "dataset_file",
  "owner_user_id": "00000000-0000-5000-8000-00005a317347",
  "dataset_id": "john_doe_20250928_001",
  "uploaded_at": "2025-09-28T10:30:00Z",

  "_attachments": {
    "sales_q1.csv": {
      "content_type": "text/csv",
      "length": 15728640,                                 // 15 MB
      "stub": true
    }
  }
}
```

**File Constraints:**

- Max size: 1 GB per file
- Allowed types:
  - text/csv
  - application/vnd.ms-excel (XLS)
  - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (XLSX)
  - application/json
  - text/plain
- Single attachment per document
- Multiple documents per dataset allowed

---

### 3. Header Photo Documents

**Purpose**: Store dataset header/avatar images (HU5)

```javascript
{
  "_id": "photo_john_doe_20250928_001_header",            // Format: photo_{dataset_id}_header
  "_rev": "1-ghi789...",

  "type": "header_photo",
  "owner_user_id": "00000000-0000-5000-8000-00005a317347",
  "dataset_id": "john_doe_20250928_001",
  "uploaded_at": "2025-09-28T10:15:00Z",

  "_attachments": {
    "header.jpg": {
      "content_type": "image/jpeg",
      "length": 2048000,                                  // 2 MB
      "stub": true
    }
  }
}
```

**File Constraints:**

- Max size: 5 MB
- Allowed types: image/jpeg, image/png, image/webp
- Recommended dimensions: 1200x400px (3:1 aspect ratio)
- Single attachment per document

---

## Database Distribution Summary

### Why Each Database is Used

#### MongoDB - Operational Data & Simple Relationships

**Collections**: users, datasets, comments, votes, private_messages

**Reasons:**

- Document model fits structured operational data
- ACID transactions for data integrity
- Text search for HU9 (dataset search)
- Flexible schema for iterations
- Simple one-to-many relationships (user→datasets, dataset→comments)
- Unique constraints prevent duplicate votes/usernames
- Aggregation framework for counting comments/votes

**What MongoDB Does:**

- Stores all user accounts and authentication
- Stores dataset metadata (not files)
- Manages approval workflow states
- Handles commenting and voting
- Manages private messaging

---

#### Neo4j - Social Graph & Analytics

**Relationships**: FOLLOWS, DOWNLOADED

**Reasons:**

- Optimized for graph traversal (followers, following)
- Efficient path queries (degrees of separation)
- Complex relationship queries (who downloaded what, when)
- Download pattern analytics across user networks
- Social recommendations (future feature)

**What Neo4j Does:**

- Tracks user following relationships (HU19, HU20)
- Records dataset downloads with timestamps (HU13)
- Provides download analytics (who, when, how many)
- Enables social features (follow/unfollow, follower lists)

**Why Not Use MongoDB:**

- MongoDB can handle simple relationships, but Neo4j excels at:
  - Multi-hop traversals (friends of friends)
  - Shortest path queries
  - Pattern matching across relationships
  - Graph analytics

---

#### Redis - Real-time Cache & Counters

**Keys**: download_count:*, vote_count:*, notifications:*

**Reasons:**

- Sub-millisecond read/write performance
- Atomic increment operations (INCR/DECR)
- List operations for FIFO queues (LPUSH/LPOP)
- In-memory storage for hot data
- Simple key-value model for counters

**What Redis Does:**

- Caches frequently accessed counters (downloads, votes)
- Stores notification queues (HU19)
- Fast atomic increments on user actions
- Reduces MongoDB query load

**Sync Strategy:**

- Write to Redis immediately (fast)
- Background job syncs to MongoDB every 5 minutes
- Read from MongoDB for display (slightly stale but consistent)

**Why Not Just MongoDB:**

- MongoDB writes are ~10-50ms
- Redis writes are <1ms
- For high-frequency operations (votes, downloads), Redis prevents bottlenecks

---

#### CouchDB - Binary File Storage

**Documents**: avatars, dataset_files, header_photos

**Note**: Tutorial videos use URLs stored in MongoDB, not CouchDB files

**Reasons:**

- Optimized for large binary attachments
- Built-in HTTP API for file access
- Better than GridFS for files >16MB
- Replication support (future scalability)
- Simple document-per-file model

**What CouchDB Does:**

- Stores all binary files (images, data files)
- Provides direct HTTP download URLs
- Manages file metadata alongside attachments
- Handles multi-MB to multi-GB files efficiently

**Why Not GridFS (MongoDB):**

- GridFS splits files into 255KB chunks (complexity)
- CouchDB stores files as single attachments (simpler)
- CouchDB has better streaming support
- Separate database isolates file I/O from operational queries

---

## Cross-Database Operation Examples

### Example 1: User Registration (HU1)

```javascript
async function registerUser(userData, avatarFile) {
  const uuid = generateUUID();
  
  // 1. Upload avatar to CouchDB (optional)
  let avatarRef = null;
  if (avatarFile) {
    const avatarDoc = await couchdb.insert({
      _id: `avatar_${uuid}`,
      type: "user_avatar",
      owner_user_id: uuid,
      uploaded_at: new Date().toISOString(),
      _attachments: {
        [avatarFile.originalname]: {
          content_type: avatarFile.mimetype,
          data: avatarFile.buffer.toString("base64")
        }
      }
    });
    
    avatarRef = {
      couchdb_document_id: avatarDoc.id,
      file_name: avatarFile.originalname,
      file_size_bytes: avatarFile.size,
      mime_type: avatarFile.mimetype
    };
  }

  // 2. Create user in MongoDB
  const user = await mongodb.users.insertOne({
    user_id: uuid,
    username: userData.username,
    email_address: userData.email,
    password_hash: await bcrypt.hash(userData.password, 12),
    full_name: userData.fullName,
    birth_date: new Date(userData.birthDate),
    avatar_ref: avatarRef,
    is_admin: false,
    created_at: new Date(),
    updated_at: new Date()
  });

  // 3. Create user node in Neo4j
  await neo4j.run(
    `CREATE (u:User {user_id: $userId, username: $username})`,
    { userId: uuid, username: userData.username }
  );

  return user;
}
```

---

### Example 2: Create Dataset (HU5)

```javascript
async function createDataset(userId, username, metadata, files, headerPhoto, videoUrl) {
  const datasetId = generateDatasetId(username);

  // 1. Upload files to CouchDB
  const fileRefs = await Promise.all(
    files.map(async (file, index) => {
      const doc = await couchdb.insert({
        _id: `file_${datasetId}_${String(index + 1).padStart(3, "0")}`,
        type: "dataset_file",
        owner_user_id: userId,
        dataset_id: datasetId,
        uploaded_at: new Date().toISOString(),
        _attachments: {
          [file.originalname]: {
            content_type: file.mimetype,
            data: file.buffer.toString("base64")
          }
        }
      });

      return {
        couchdb_document_id: doc.id,
        file_name: file.originalname,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
        uploaded_at: new Date()
      };
    })
  );

  // 2. Upload header photo to CouchDB (optional)
  let headerPhotoRef = null;
  if (headerPhoto) {
    const headerDoc = await couchdb.insert({
      _id: `photo_${datasetId}_header`,
      type: "header_photo",
      owner_user_id: userId,
      dataset_id: datasetId,
      uploaded_at: new Date().toISOString(),
      _attachments: {
        [headerPhoto.originalname]: {
          content_type: headerPhoto.mimetype,
          data: headerPhoto.buffer.toString("base64")
        }
      }
    });

    headerPhotoRef = {
      couchdb_document_id: headerDoc.id,
      file_name: headerPhoto.originalname,
      file_size_bytes: headerPhoto.size,
      mime_type: headerPhoto.mimetype
    };
  }

  // 3. Parse video URL (optional)
  let videoRef = null;
  if (videoUrl) {
    videoRef = {
      url: videoUrl,
      platform: videoUrl.includes('youtube') ? 'youtube' : 'vimeo'
    };
  }

  // 4. Create dataset in MongoDB
  const dataset = await mongodb.datasets.insertOne({
    dataset_id: datasetId,
    owner_user_id: userId,
    parent_dataset_id: null,
    dataset_name: metadata.name,
    description: metadata.description,
    tags: metadata.tags || [],
    status: "pending",
    reviewed_at: null,
    admin_review: null,
    is_public: false,
    file_references: fileRefs,
    header_photo_ref: headerPhotoRef,
    tutorial_video_ref: videoRef,
    download_count: 0,
    vote_count: 0,
    comment_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  });

  // 5. Initialize counters in Redis
  await redis.set(`download_count:dataset:${datasetId}`, 0);
  await redis.set(`vote_count:dataset:${datasetId}`, 0);

  // 6. Create dataset node in Neo4j
  await neo4j.run(
    `CREATE (d:Dataset {dataset_id: $datasetId, dataset_name: $name})`,
    { datasetId, name: metadata.name }
  );

  return dataset;
}
```

---

### Example 3: Download Dataset (HU13)

```javascript
async function downloadDataset(userId, datasetId, fileId, filename) {
  // 1. Verify dataset is public and approved (MongoDB)
  const dataset = await mongodb.datasets.findOne({
    dataset_id: datasetId,
    status: "approved",
    is_public: true
  });

  if (!dataset) {
    throw new Error("Dataset not available");
  }

  // 2. Get file from CouchDB
  const file = await couchdb.attachment.get("datec", fileId, filename);

  // 3. Record download in Neo4j
  await neo4j.run(
    `
    MATCH (u:User {user_id: $userId}), (d:Dataset {dataset_id: $datasetId})
    CREATE (u)-[:DOWNLOADED {downloaded_at: datetime()}]->(d)
    `,
    { userId, datasetId }
  );

  // 4. Increment counter in Redis
  await redis.incr(`download_count:dataset:${datasetId}`);

  // 5. Background job syncs to MongoDB every 5 minutes

  return file;
}
```

---

### Example 4: Follow User (HU19)

```javascript
async function followUser(followerId, followedId) {
  // 1. Verify users exist (MongoDB)
  const [follower, followed] = await Promise.all([
    mongodb.users.findOne({ user_id: followerId }),
    mongodb.users.findOne({ user_id: followedId })
  ]);

  if (!follower || !followed) {
    throw new Error("User not found");
  }

  if (followerId === followedId) {
    throw new Error("Cannot follow yourself");
  }

  // 2. Create FOLLOWS relationship in Neo4j
  await neo4j.run(
    `
    MATCH (follower:User {user_id: $followerId}), 
          (followed:User {user_id: $followedId})
    MERGE (follower)-[:FOLLOWS {followed_at: datetime()}]->(followed)
    `,
    { followerId, followedId }
  );

  // 3. Send notification to followed user (Redis)
  await redis.lpush(
    `notifications:user:${followedId}`,
    JSON.stringify({
      type: "new_follower",
      from_user_id: followerId,
      from_username: follower.username,
      timestamp: new Date().toISOString()
    })
  );
}
```

---

### Example 5: Clone Dataset (HU18)

```javascript
async function cloneDataset(originalDatasetId, newOwnerId, newOwnerUsername) {
  // 1. Get original dataset from MongoDB
  const original = await mongodb.datasets.findOne({
    dataset_id: originalDatasetId,
    status: "approved",
    is_public: true
  });

  if (!original) {
    throw new Error("Original dataset not found or not public");
  }

  // 2. Generate new dataset ID
  const clonedDatasetId = generateDatasetId(newOwnerUsername);

  // 3. Duplicate files in CouchDB
  const clonedFileRefs = await Promise.all(
    original.file_references.map(async (fileRef, index) => {
      const originalDoc = await couchdb.get(fileRef.couchdb_document_id, {
        attachments: true
      });

      const newDocId = `file_${clonedDatasetId}_${String(index + 1).padStart(3, "0")}`;
      const newDoc = await couchdb.insert({
        _id: newDocId,
        type: "dataset_file",
        owner_user_id: newOwnerId,
        dataset_id: clonedDatasetId,
        uploaded_at: new Date().toISOString(),
        _attachments: originalDoc._attachments
      });

      return {
        couchdb_document_id: newDoc.id,
        file_name: fileRef.file_name,
        file_size_bytes: fileRef.file_size_bytes,
        mime_type: fileRef.mime_type,
        uploaded_at: new Date()
      };
    })
  );

  // 4. Duplicate header photo in CouchDB (if exists)
  let clonedHeaderRef = null;
  if (original.header_photo_ref) {
    const originalHeaderDoc = await couchdb.get(
      original.header_photo_ref.couchdb_document_id,
      { attachments: true }
    );

    const newHeaderDocId = `photo_${clonedDatasetId}_header`;
    const newHeaderDoc = await couchdb.insert({
      _id: newHeaderDocId,
      type: "header_photo",
      owner_user_id: newOwnerId,
      dataset_id: clonedDatasetId,
      uploaded_at: new Date().toISOString(),
      _attachments: originalHeaderDoc._attachments
    });

    clonedHeaderRef = {
      couchdb_document_id: newHeaderDoc.id,
      file_name: original.header_photo_ref.file_name,
      file_size_bytes: original.header_photo_ref.file_size_bytes,
      mime_type: original.header_photo_ref.mime_type
    };
  }

  // 5. Create cloned dataset in MongoDB
  const clonedDataset = await mongodb.datasets.insertOne({
    dataset_id: clonedDatasetId,
    owner_user_id: newOwnerId,
    parent_dataset_id: originalDatasetId,
    dataset_name: `${original.dataset_name} (Clone)`,
    description: original.description,
    tags: original.tags,
    status: "pending",
    reviewed_at: null,
    admin_review: null,
    is_public: false,
    file_references: clonedFileRefs,
    header_photo_ref: clonedHeaderRef,
    tutorial_video_ref: original.tutorial_video_ref,
    download_count: 0,
    vote_count: 0,
    comment_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  });

  // 6. Create dataset node in Neo4j
  await neo4j.run(
    `CREATE (d:Dataset {dataset_id: $datasetId, dataset_name: $name})`,
    { datasetId: clonedDatasetId, name: clonedDataset.dataset_name }
  );

  // 7. Initialize counters in Redis
  await redis.set(`download_count:dataset:${clonedDatasetId}`, 0);
  await redis.set(`vote_count:dataset:${clonedDatasetId}`, 0);

  return clonedDataset;
}
```

---

## Implementation Checklist

### MongoDB Setup

- [ ] Start MongoDB replica set via Docker
- [ ] Create database `datec`
- [ ] Create collections with validation schemas
- [ ] Create all indexes (run index creation scripts)
- [ ] Seed admin user
- [ ] Test CRUD operations

**Seed Admin User:**

```javascript
{
  user_id: "00000000-0000-0000-0000-000000000001",
  username: "sudod4t3c",
  email_address: "sudo@datec.com",
  password_hash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILPgdK9Em",  // Password: "dat3c_master_4dmin"
  full_name: "DaTEC System Administrators",
  birth_date: ISODate("2000-05-07T00:00:00Z"),
  avatar_ref: null,
  is_admin: true,
  created_at: ISODate("2025-01-01T00:00:00Z"),
  updated_at: ISODate("2025-01-01T00:00:00Z")
}
```

### Neo4j Setup

- [ ] Install Neo4j Desktop or Docker
- [ ] Create database `datec`
- [ ] Create constraints for User and Dataset nodes
- [ ] Create indexes for username lookup
- [ ] Test relationship creation (FOLLOWS, DOWNLOADED)
- [ ] Test graph queries
- [ ] Seed admin user node

**Seed Admin User Node:**

```cypher
CREATE (u:User {
  user_id: "00000000-0000-0000-0000-000000000001",
  username: "sudod4t3c"
})
```

### Redis Setup

- [ ] Start Redis via Docker
- [ ] Configure persistence (RDB + AOF)
- [ ] Set maxmemory policy (allkeys-lru)
- [ ] Test connection and basic operations
- [ ] Test LPUSH/LRANGE for notifications
- [ ] Test INCR/DECR for counters

### CouchDB Setup

- [ ] Install CouchDB locally or via Docker
- [ ] Create database `datec`
- [ ] Configure max attachment size (1GB+)
- [ ] Test file upload with attachments
- [ ] Test file download via HTTP
- [ ] Configure CORS if needed

---

## Database Deployment Notes

### Container Configuration (Required for 2 databases)

Two databases must be deployed with multiple nodes in containers:

**MongoDB + Rediss**
- MongoDB: 2-node replica set in Docker containers
- Redis: 2-node cluster (master-replica) in Docker containers
- Neo4j: Single local instance
- CouchDB: Single local instance

### Docker Replica Set 

```yaml
# docker-compose.yml
# DaTEC Configuration
# MongoDB + Redis : Docker Multi-node | Neo4j + CouchDB : Local

services:
  # ================================================
  # MongoDB Replica Set (Multi-node) https://hub.docker.com/r/mongodb/mongodb-community-server
  # https://hub.docker.com/layers/mongodb/mongodb-community-server/8.0-ubi9/images/sha256-ff7e54273c0d68143396ea35cb03c6dec9e9c483b07fef2c3a702738e348d116
  # ================================================
  
  mongo-primary:
    image: mongo:8.0
    container_name: datec-mongo-primary
    restart: unless-stopped
    hostname: mongo-primary
    ports:
      - "27017:27017"
    command: >
      mongod --replSet datecRS 
        --bind_ip_all 
        --wiredTigerCacheSizeGB 0.5
    volumes:
      - mongo_primary_data:/data/db
      - ./scripts:/scripts:ro
    deploy:
      resources:
        limits:
          memory: 1.2G
        reservations:
          memory: 256M
    networks:
      - datec-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 15s
      timeout: 10s
      retries: 10
      start_period: 60s

  mongo-secondary:
    image: mongo:8.0
    container_name: datec-mongo-secondary
    restart: unless-stopped
    hostname: mongo-secondary
    ports:
      - "27018:27017"
    command: >
      mongod --replSet datecRS 
        --bind_ip_all 
        --wiredTigerCacheSizeGB 0.3
    volumes:
      - mongo_secondary_data:/data/db
      - ./scripts:/scripts:ro
    deploy:
      resources:
        limits:
          memory: 800M
        reservations:
          memory: 128M
    depends_on:
      - mongo-primary
    networks:
      - datec-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 15s
      timeout: 10s
      retries: 5

  # ================================================
  # Redis Primary-Replica (Multi-node) https://hub.docker.com/_/redis
  # https://hub.docker.com/layers/library/redis/8-alpine/images/sha256-fc785a6b2936ec73d0c1c7dc81fb72383e0ce5d392d1c6b20dbafa68f0ff0572
  # ================================================
  
  redis-primary:
    image: redis:8-alpine
    container_name: datec-redis-primary
    restart: unless-stopped
    hostname: redis-primary
    ports:
      - "6379:6379"
    command: >
      redis-server 
      --maxmemory 400mb 
      --maxmemory-policy allkeys-lru 
      --save 60 1000
      --appendonly yes
      --appendfsync everysec
    volumes:
      - redis_primary_data:/data
      - ./scripts:/scripts:ro
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 64M
    networks:
      - datec-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  redis-replica:
    image: redis:8-alpine
    container_name: datec-redis-replica
    restart: unless-stopped
    hostname: redis-replica
    ports:
      - "6380:6379"
    command: >
      redis-server 
      --replicaof redis-primary 6379
      --maxmemory 200mb 
      --maxmemory-policy allkeys-lru
      --replica-read-only yes
    volumes:
      - redis_replica_data:/data
      - ./scripts:/scripts:ro
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 32M
    depends_on:
      - redis-primary
    networks:
      - datec-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # ================================================
  # MongoDB Replica Set Configurator
  # ================================================
  
  mongo-setup:
    image: mongo:8.0
    container_name: datec-mongo-setup
    depends_on:
      mongo-primary:
        condition: service_healthy
      mongo-secondary:
        condition: service_healthy
    volumes:
      - ./scripts:/scripts:ro
    command: >
      bash -c "
        echo 'Waiting for MongoDB nodes...' &&
        sleep 30 &&
        echo 'Configuring Replica Set...' &&
        mongosh --host mongo-primary:27017 /scripts/setup-mongo.js &&
        echo 'MongoDB setup complete!'
      "
    networks:
      - datec-network
    restart: "no"

  # ================================================
  # Redis Replica Set Configurator
  # ================================================

  redis-setup:
    image: node:18-alpine
    container_name: datec-redis-setup
    depends_on:
      redis-primary:
        condition: service_healthy
      redis-replica:
        condition: service_healthy
    volumes:
      - ./scripts:/scripts
    working_dir: /scripts
    command: >
      sh -c "
        echo 'Installing Redis client...' &&
        npm install redis --no-save &&
        echo 'Configuring Redis...' &&
        node setup-redis.js
      "
    networks:
      - datec-network
    restart: "no"

# ================================================
# Persistent Volumes
# C:\ProgramData\Docker\volumes\
# ================================================

volumes:
  mongo_primary_data:
  mongo_secondary_data:
  redis_primary_data:
  redis_replica_data:

# ================================================
# Internal Network
# ================================================

networks:
  datec-network:
    driver: bridge
```

---

## Verification Checklist

### Functional Requirements (HU1-HU21)

- [ ] HU1: User self-registration with avatar
- [ ] HU2: Initial admin user seeded
- [ ] HU3: Admin can promote users to admin
- [ ] HU4: Users can edit their profile
- [ ] HU5: Users can create datasets with files, photos, videos
- [ ] HU6: Users can request dataset approval
- [ ] HU7: Users can make datasets private or delete them
- [ ] HU8: Admins can approve/reject datasets with notifications
- [ ] HU9: Users can search datasets by name/description/tags
- [ ] HU10: Users can view dataset information and file sizes
- [ ] HU11: Datasets include video tutorials (URLs)
- [ ] HU12: Users can view all datasets from a specific user
- [ ] HU13: Dataset owners see download statistics and users
- [ ] HU14: Users can search for other users
- [ ] HU15: Users can comment on datasets with nested replies
- [ ] HU16: Admins can disable comments (soft delete)
- [ ] HU17: Users can vote on datasets (one vote per user)
- [ ] HU18: Users can clone datasets
- [ ] HU19: Users can follow others and receive notifications
- [ ] HU20: Users can see their followers
- [ ] HU21: Users can send private messages

### Technical Requirements

- [ ] At least 4 different databases used
- [ ] 2 databases deployed with multiple nodes in containers
- [ ] All indexes created and optimized
- [ ] Cross-database operations tested
- [ ] Data consistency maintained across databasess
- [ ] Background sync jobs scheduled (Redis → MongoDB)