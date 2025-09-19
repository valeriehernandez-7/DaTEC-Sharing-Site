# DaTEC - Database Schemas & Models

## Document Information
- **Project**: DaTEC (Dataset Sharing Platform)
- **Version**: 1.0
- **Date**: September 19, 2025
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
Connection: mongodb://admin:datec123@localhost:27017/datec?authSource=admin&replicaSet=datecRS
```

### 1. Users Collection

**Purpose**: Store user accounts and authentication data

```javascript
{
  // Primary Key
  _id: ObjectId("..."),
  user_id: "550e8400-e29b-41d4-a716-446655440000",  // UUID v4
  
  // Authentication (HU1)
  username: "john_doe",                               // Unique, lowercase
  email_address: "john@datec.cr",                     // Unique
  password_hash: "$2b$12$KZXvH8QjWZ...",              // Bcrypt hash
  password_salt: "e8f7d6c5b4a3",                      // Unique salt per user
  
  // Profile Information (HU1, HU4)
  full_name: "John Doe",
  birth_date: ISODate("1995-03-15T00:00:00Z"),        // Min age 13
  avatar_couchdb_id: "avatar_550e8400...",            // Reference to CouchDB
  
  // Permissions (HU2, HU3)
  is_admin: false,
  
  // Timestamps
  created_at: ISODate("2025-09-28T10:00:00Z"),
  updated_at: ISODate("2025-09-28T10:00:00Z")
}
```

**Indexes:**
```javascript
db.users.createIndex({ user_id: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email_address: 1 }, { unique: true })
db.users.createIndex({ username: "text", full_name: "text" })  // HU14
```

**Validation Rules:**
- username: 3-30 characters, alphanumeric + underscore
- password: Min 8 characters (enforced in backend before hashing)
- birth_date: User must be at least 13 years old
- email_address: Valid email format

---

### 2. Datasets Collection

**Purpose**: Store dataset metadata and file references

```javascript
{
  // Primary Key
  _id: ObjectId("..."),
  dataset_id: "john_doe_20250928_001",                // Format: {username}_{YYYYMMDD}_{sequence}
  
  // Ownership
  owner_user_id: "550e8400-e29b-41d4-a716-446655440000",
  parent_dataset_id: null,                             // For HU18 (cloning)
  
  // Metadata (HU5)
  dataset_name: "Global Sales Analysis 2024",
  description: "Comprehensive analysis of global sales patterns...",
  tags: ["sales", "analytics", "business", "2024"],   // Searchable tags
  
  // Approval Workflow (HU6, HU8)
  status: "pending",                                   // "pending" | "approved" | "rejected"
  reviewed_at: null,                                   // ISODate when admin reviewed
  admin_review: null,                                  // Admin's review comment
  
  // Privacy Control (HU7)
  is_public: false,                                    // Only applies if status="approved"
  
  // File References - CouchDB (HU5)
  file_references: [
    {
      file_name: "sales_q1.csv",
      couchdb_document_id: "file_john_doe_20250928_001_001",
      file_size_bytes: 15728640,                       // 15 MB
      mime_type: "text/csv",
      uploaded_at: ISODate("2025-09-28T10:30:00Z")
    },
    {
      file_name: "sales_q2.xlsx",
      couchdb_document_id: "file_john_doe_20250928_001_002",
      file_size_bytes: 8388608,                        // 8 MB
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      uploaded_at: ISODate("2025-09-28T10:31:00Z")
    }
  ],
  
  // Media References - CouchDB (HU5, HU11)
  header_photo_ref: {                                  // Serves as both avatar and header
    couchdb_document_id: "photo_john_doe_20250928_001_header",
    file_name: "header.jpg",
    file_size_bytes: 2048000,                          // 2 MB
    mime_type: "image/jpeg"
  },
  
  tutorial_video_ref: {
    couchdb_document_id: "video_john_doe_20250928_001_tutorial",
    file_name: "tutorial.mp4",
    file_size_bytes: 52428800,                         // 50 MB
    mime_type: "video/mp4",
    duration_seconds: 180
  },
  
  // Denormalized Counters (synced from Redis/aggregations)
  download_count: 156,                                 // From Neo4j/Redis (HU13)
  vote_count: 42,                                      // From votes collection (HU17)
  comment_count: 8,                                    // From comments collection (HU15)
  
  // Timestamps
  created_at: ISODate("2025-09-28T10:00:00Z"),
  updated_at: ISODate("2025-09-28T10:00:00Z")
}
```

**Indexes:**
```javascript
db.datasets.createIndex({ dataset_id: 1 }, { unique: true })
db.datasets.createIndex({ owner_user_id: 1, created_at: -1 })           // HU12
db.datasets.createIndex({ parent_dataset_id: 1 })                        // HU18
db.datasets.createIndex({ status: 1, is_public: 1 })                    // Public queries
db.datasets.createIndex({ status: 1 })                                   // Admin queue
db.datasets.createIndex(
  { dataset_name: "text", description: "text", tags: "text" },
  { weights: { dataset_name: 10, tags: 5, description: 1 } }            // HU9
)
```

**Validation Rules:**
- dataset_name: 3-100 characters, required
- description: 10-5000 characters, required
- file_references: At least 1 file required
- header_photo_ref: Required
- tutorial_video_ref: Required
- status: Must be one of ["pending", "approved", "rejected"]

---

### 3. Comments Collection

**Purpose**: Store user comments on datasets with threading support

```javascript
{
  // Primary Key
  _id: ObjectId("..."),
  comment_id: "cmt_john_doe_20250928_001_20250928143022_001",
  
  // Relationships (HU15)
  target_dataset_id: "john_doe_20250928_001",
  author_user_id: "550e8400-e29b-41d4-a716-446655440000",
  parent_comment_id: null,                             // null = top-level, otherwise reply
  
  // Content
  content: "This dataset provides excellent insights into sales trends...",
  
  // Moderation (HU16)
  is_active: true,                                     // false = hidden by admin
  
  // Timestamps
  created_at: ISODate("2025-09-28T16:20:00Z"),
  updated_at: ISODate("2025-09-28T16:20:00Z")
}
```

**Indexes:**
```javascript
db.comments.createIndex({ comment_id: 1 }, { unique: true })
db.comments.createIndex({ target_dataset_id: 1, created_at: -1 })       // List dataset comments
db.comments.createIndex({ parent_comment_id: 1 })                        // Nested replies
db.comments.createIndex({ author_user_id: 1 })                           // User's comments
db.comments.createIndex({ is_active: 1 })                                // Admin moderation
```

**Validation Rules:**
- content: 1-2000 characters, required
- Cannot reply to a reply more than 5 levels deep

---

### 4. Votes Collection

**Purpose**: Track user votes on datasets

```javascript
{
  // Primary Key
  _id: ObjectId("..."),
  vote_id: "vote_john_doe_20250928_001_user_550e8400",
  
  // Relationships (HU17)
  target_dataset_id: "john_doe_20250928_001",
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  
  // Timestamp
  created_at: ISODate("2025-09-28T16:30:00Z")
}
```

**Indexes:**
```javascript
db.votes.createIndex({ vote_id: 1 }, { unique: true })
db.votes.createIndex(
  { target_dataset_id: 1, user_id: 1 }, 
  { unique: true }                                     // Prevent duplicate votes
)
db.votes.createIndex({ target_dataset_id: 1 })         // Count votes per dataset
db.votes.createIndex({ user_id: 1 })                   // User's voting history
```

**Business Rules:**
- One vote per user per dataset
- Can toggle vote on/off
- Cannot vote on own datasets

---

### 5. Private Messages Collection

**Purpose**: Store direct messages between users

```javascript
{
  // Primary Key
  _id: ObjectId("..."),
  message_id: "msg_from_550e8400_to_449d7344_20250928163000_001",
  
  // Relationships (HU21)
  from_user_id: "550e8400-e29b-41d4-a716-446655440000",
  to_user_id: "449d7344-e29b-41d4-a716-446655440001",
  
  // Content
  content: "Hi! I have questions about your Global Sales dataset...",
  
  // Timestamp
  created_at: ISODate("2025-09-28T17:00:00Z")
}
```

**Indexes:**
```javascript
db.private_messages.createIndex({ message_id: 1 }, { unique: true })
db.private_messages.createIndex(
  { from_user_id: 1, to_user_id: 1, created_at: -1 }  // Conversation thread
)
db.private_messages.createIndex({ to_user_id: 1, created_at: -1 })      // Inbox
db.private_messages.createIndex({ from_user_id: 1, created_at: -1 })    // Sent messages
```

**Validation Rules:**
- content: 1-5000 characters, required
- Cannot message yourself
- Both users must exist

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

### Node Types

#### User Node
```cypher
CREATE (u:User {
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  username: "john_doe"
})
```

**Properties:**
- `user_id`: String (UUID) - Primary identifier
- `username`: String - For display purposes

**Indexes:**
```cypher
CREATE CONSTRAINT user_id_unique FOR (u:User) REQUIRE u.user_id IS UNIQUE;
CREATE INDEX user_username FOR (u:User) ON (u.username);
```

#### Dataset Node
```cypher
CREATE (d:Dataset {
  dataset_id: "john_doe_20250928_001",
  dataset_name: "Global Sales Analysis 2024"
})
```

**Properties:**
- `dataset_id`: String - Primary identifier
- `dataset_name`: String - For display purposes

**Indexes:**
```cypher
CREATE CONSTRAINT dataset_id_unique FOR (d:Dataset) REQUIRE d.dataset_id IS UNIQUE;
```

---

### Relationship Types

#### FOLLOWS Relationship (HU19, HU20)

**Purpose**: Track user following relationships

```cypher
CREATE (follower:User {user_id: "follower_uuid"})
-[:FOLLOWS {
  followed_at: datetime("2025-09-28T16:00:00Z"),
  notifications_enabled: true
}]->
(followed:User {user_id: "followed_uuid"})
```

**Properties:**
- `followed_at`: DateTime - When follow occurred
- `notifications_enabled`: Boolean - Whether to notify on new datasets

**Common Queries:**

```cypher
// Get all followers of a user (HU20)
MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
RETURN follower.user_id, follower.username
ORDER BY follower.username;

// Get all users that a user follows (HU19)
MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(followed:User)
RETURN followed.user_id, followed.username
ORDER BY followed.username;

// Check if user A follows user B
MATCH (a:User {user_id: $user_a_id})-[r:FOLLOWS]->(b:User {user_id: $user_b_id})
RETURN r IS NOT NULL AS is_following;

// Get follower count
MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $user_id})
RETURN count(follower) AS follower_count;

// Get following count
MATCH (user:User {user_id: $user_id})-[:FOLLOWS]->(followed:User)
RETURN count(followed) AS following_count;
```

---

#### DOWNLOADED Relationship (HU13)

**Purpose**: Track dataset downloads and analytics

```cypher
CREATE (user:User {user_id: "maria_garcia_uuid"})
-[:DOWNLOADED {
  downloaded_at: datetime("2025-09-28T16:30:00Z"),
  download_source: "web_interface"
}]->
(dataset:Dataset {dataset_id: "john_doe_20250928_001"})
```

**Properties:**
- `downloaded_at`: DateTime - When download occurred
- `download_source`: String - "web_interface" | "api" | "mobile"

**Common Queries:**

```cypher
// Get all users who downloaded a dataset (HU13)
MATCH (user:User)-[d:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
RETURN user.user_id, user.username, d.downloaded_at
ORDER BY d.downloaded_at DESC;

// Get total download count
MATCH (user:User)-[:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
RETURN count(user) AS total_downloads;

// Get unique users who downloaded (not total downloads)
MATCH (user:User)-[:DOWNLOADED]->(dataset:Dataset {dataset_id: $dataset_id})
RETURN count(DISTINCT user) AS unique_users;

// Download statistics over time (HU13 - analytics)
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
```

---

## Redis Data Structures

### Database Configuration
```
Host: localhost
Port: 6379
Database: 0
```

### 1. Download Counters (HU13)

**Purpose**: Real-time download count tracking

```redis
# Key pattern
download_count:dataset:{dataset_id}

# Example
SET download_count:dataset:john_doe_20250928_001 156

# Operations
INCR download_count:dataset:john_doe_20250928_001  # Increment on download
GET download_count:dataset:john_doe_20250928_001   # Get current count
```

**Sync Strategy:**
- Increment in Redis on every download (fast)
- Sync to MongoDB every 5 minutes (background job)
- On dataset view, read from MongoDB (cached value)

---

### 2. Vote Counters (HU17)

**Purpose**: Real-time vote count tracking

```redis
# Key pattern
vote_count:dataset:{dataset_id}

# Example
SET vote_count:dataset:john_doe_20250928_001 42

# Operations
INCR vote_count:dataset:john_doe_20250928_001  # Add vote
DECR vote_count:dataset:john_doe_20250928_001  # Remove vote
GET vote_count:dataset:john_doe_20250928_001   # Get current count
```

**Sync Strategy:**
- Update Redis immediately on vote/unvote
- Sync to MongoDB every 5 minutes
- On dataset view, read from MongoDB

---

### 3. Notification Queues (HU19)

**Purpose**: Store user notifications (new followers, new datasets)

```redis
# Key pattern (List structure)
notifications:user:{user_id}

# Push notification (new follower)
LPUSH notifications:user:550e8400-e29b-41d4-a716-446655440000 '{
  "type": "new_follower",
  "from_user_id": "follower_uuid",
  "from_username": "maria_garcia",
  "timestamp": "2025-09-28T17:00:00Z"
}'

# Push notification (new dataset from followed user)
LPUSH notifications:user:550e8400-e29b-41d4-a716-446655440000 '{
  "type": "new_dataset",
  "from_user_id": "followed_uuid",
  "dataset_id": "new_dataset_id",
  "dataset_name": "New Research Data",
  "timestamp": "2025-09-28T17:05:00Z"
}'

# Get latest 10 notifications
LRANGE notifications:user:550e8400-e29b-41d4-a716-446655440000 0 9

# Get notification count
LLEN notifications:user:550e8400-e29b-41d4-a716-446655440000

# Clear old notifications (keep last 50)
LTRIM notifications:user:550e8400-e29b-41d4-a716-446655440000 0 49
```

**Notification Types:**
```javascript
// Type 1: New Follower
{
  "type": "new_follower",
  "from_user_id": "uuid",
  "from_username": "username",
  "timestamp": "ISO8601"
}

// Type 2: New Dataset from Followed User
{
  "type": "new_dataset",
  "from_user_id": "uuid",
  "dataset_id": "dataset_id",
  "dataset_name": "name",
  "timestamp": "ISO8601"
}

// Type 3: Dataset Approved
{
  "type": "dataset_approved",
  "dataset_id": "dataset_id",
  "dataset_name": "name",
  "timestamp": "ISO8601"
}

// Type 4: Dataset Rejected
{
  "type": "dataset_rejected",
  "dataset_id": "dataset_id",
  "dataset_name": "name",
  "admin_review": "reason",
  "timestamp": "ISO8601"
}
```

---

### 4. Session Storage (Optional)

**Purpose**: Store user sessions (if using Redis for sessions)

```redis
# Key pattern (Hash structure)
session:{session_token}

# Store session
HMSET session:abc123xyz 
  user_id "550e8400-e29b-41d4-a716-446655440000"
  username "john_doe"
  is_admin "false"

# Set expiration (1 hour)
EXPIRE session:abc123xyz 3600

# Get session
HGETALL session:abc123xyz

# Delete session (logout)
DEL session:abc123xyz
```

---

## CouchDB Document Types

### Database Configuration
```
URL: http://localhost:5984
Database: datec_files
Admin: admin
Password: (set during installation)
```

### 1. User Avatar Documents

**Purpose**: Store user profile pictures

```javascript
{
  "_id": "avatar_550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-abc123...",
  
  // Metadata
  "type": "user_avatar",
  "owner_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "uploaded_at": "2025-09-28T10:00:00Z",
  
  // Attachment
  "_attachments": {
    "profile.jpg": {
      "content_type": "image/jpeg",
      "length": 204800,              // 200 KB
      "stub": true
    }
  }
}
```

**File Constraints:**
- Max size: 2 MB
- Allowed types: image/jpeg, image/png, image/webp
- Single attachment per document

---

### 2. Dataset File Documents

**Purpose**: Store dataset data files (CSV, Excel, JSON, etc.)

```javascript
{
  "_id": "file_john_doe_20250928_001_001",
  "_rev": "1-def456...",
  
  // Metadata
  "type": "dataset_file",
  "owner_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_id": "john_doe_20250928_001",
  "uploaded_at": "2025-09-28T10:30:00Z",
  
  // Attachment
  "_attachments": {
    "sales_q1.csv": {
      "content_type": "text/csv",
      "length": 15728640,            // 15 MB
      "stub": true
    }
  }
}
```

**File Constraints:**
- Max size: 1 GB per file
- Allowed types: 
  - text/csv
  - application/vnd.ms-excel
  - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  - application/json
  - text/plain
- Single attachment per document
- Multiple documents per dataset

---

### 3. Header Photo Documents

**Purpose**: Store dataset header/avatar images

```javascript
{
  "_id": "photo_john_doe_20250928_001_header",
  "_rev": "1-ghi789...",
  
  // Metadata
  "type": "header_photo",
  "owner_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_id": "john_doe_20250928_001",
  "uploaded_at": "2025-09-28T10:15:00Z",
  
  // Attachment
  "_attachments": {
    "header.jpg": {
      "content_type": "image/jpeg",
      "length": 2048000,             // 2 MB
      "stub": true
    }
  }
}
```

**File Constraints:**
- Max size: 5 MB
- Allowed types: image/jpeg, image/png, image/webp
- Recommended dimensions: 1200x400px (3:1 ratio)
- Single attachment per document

---

### 4. Tutorial Video Documents

**Purpose**: Store dataset tutorial videos

```javascript
{
  "_id": "video_john_doe_20250928_001_tutorial",
  "_rev": "1-jkl012...",
  
  // Metadata
  "type": "tutorial_video",
  "owner_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_id": "john_doe_20250928_001",
  "uploaded_at": "2025-09-28T10:20:00Z",
  "duration_seconds": 180,           // 3 minutes
  
  // Attachment
  "_attachments": {
    "tutorial.mp4": {
      "content_type": "video/mp4",
      "length": 52428800,            // 50 MB
      "stub": true
    }
  }
}
```

**File Constraints:**
- Max size: 500 MB
- Allowed types: video/mp4, video/webm, video/quicktime
- Max duration: 10 minutes recommended
- Single attachment per document

---

### CouchDB Views

**Purpose**: Query documents by type and owner

```javascript
// Design document: _design/files

// View: by_type
{
  "views": {
    "by_type": {
      "map": "function(doc) { if (doc.type) { emit(doc.type, doc); } }"
    },
    "by_dataset": {
      "map": "function(doc) { if (doc.dataset_id) { emit(doc.dataset_id, doc); } }"
    },
    "by_owner": {
      "map": "function(doc) { if (doc.owner_user_id) { emit(doc.owner_user_id, doc); } }"
    }
  }
}

// Query examples
GET /datec_files/_design/files/_view/by_type?key="dataset_file"
GET /datec_files/_design/files/_view/by_dataset?key="john_doe_20250928_001"
GET /datec_files/_design/files/_view/by_owner?key="550e8400..."
```

---

## Database Distribution Summary

### MongoDB (Operational Data)
**Purpose**: Primary operational database
- ✅ Users
- ✅ Datasets (metadata)
- ✅ Comments
- ✅ Votes
- ✅ Private Messages

**Why**: Document model, ACID transactions, text search, flexible schema

---

### Neo4j (Social Graph)
**Purpose**: Relationship-heavy queries
- ✅ User FOLLOWS relationships (HU19, HU20)
- ✅ User DOWNLOADED dataset relationships (HU13)

**Why**: Graph traversal optimization, social network queries, analytics

---

### Redis (Real-time Cache)
**Purpose**: High-performance counters and queues
- ✅ Download counters (HU13)
- ✅ Vote counters (HU17)
- ✅ Notification queues (HU19)
- ✅ Session storage (optional)

**Why**: Sub-millisecond performance, atomic operations, pub/sub

---

### CouchDB (Binary Storage)
**Purpose**: Large file attachments
- ✅ User avatars (HU1)
- ✅ Dataset files (HU5)
- ✅ Header photos (HU5)
- ✅ Tutorial videos (HU5, HU11)

**Why**: Optimized for binary data, HTTP access, replication, better than GridFS

---

## Implementation Checklist

### MongoDB
- [ ] Create database `datec`
- [ ] Create collections: users, datasets, comments, votes, private_messages
- [ ] Create all indexes
- [ ] Seed admin user

### Neo4j
- [ ] Create database `datec`
- [ ] Create constraints for User and Dataset nodes
- [ ] Create indexes

### Redis
- [ ] Configure persistence (RDB + AOF)
- [ ] Set maxmemory policy
- [ ] Test connection

### CouchDB
- [ ] Create database `datec_files`
- [ ] Create design document with views
- [ ] Configure max attachment size
- [ ] Test file upload/download

---
