# DaTEC Software Requirements Specification

## Document Information
- **Project**: DaTEC (Dataset Sharing Platform)
- **Course**: IC4302 - Bases de Datos II
- **Document Type**: Software Requirements Specification (SRS)
- **Version**: 1.1
- **Date**: September 16, 2025

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Naming Conventions](#naming-conventions)
4. [User Stories Analysis](#user-stories-analysis)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [Database Requirements](#database-requirements)
8. [Security Requirements](#security-requirements)
9. [Integration Requirements](#integration-requirements)
10. [Acceptance Criteria](#acceptance-criteria)

## Executive Summary

The DaTEC platform is an academic dataset sharing system designed to facilitate collaboration among researchers, students, and data analysts. The system implements 21 core user stories across authentication, dataset management, social networking, and administrative functions using a multi-database architecture.

### Key System Characteristics
- **Multi-tenant architecture** supporting academic institutions
- **Social networking features** for collaboration and knowledge sharing
- **Approval workflow** with privacy controls for dataset quality assurance
- **Real-time notifications** for user engagement
- **Search capabilities** with tag-based filtering

## System Overview

### Stakeholder Roles

#### Primary Users
- **Students**: Upload and download datasets for academic projects
- **Researchers**: Share research data and collaborate with peers
- **Administrators**: Manage platform content and user permissions
- **Visitors**: Browse public datasets without uploading privileges

#### System Architecture
- **Frontend**: React.js single-page application
- **Backend**: Node.js with Express.js framework
- **Databases**: MongoDB, Redis, Neo4j, CouchDB
- **Authentication**: JWT-based session management

## Naming Conventions

### Database Naming Standards

Following [Database Naming Standards](https://dev.to/ovid/database-naming-standards-2061):

#### Table/Collection Names
```
users                    # User account information
datasets                 # Dataset metadata and references
comments                 # User comments on datasets
votes                    # User voting records
private_messages         # Direct messages between users
user_sessions           # Active user sessions (Redis)
dataset_files           # File storage references (CouchDB)
user_avatars            # Profile pictures (CouchDB)
```

#### Field Names
```
id_user                 # Primary user identifier
id_dataset              # Primary dataset identifier
id_comment              # Primary comment identifier
username                # Unique user login name
email_address           # User email contact
password_hash           # Encrypted password storage
created_at              # Record creation timestamp
updated_at              # Last modification timestamp
is_admin                # Administrative privilege flag
is_active               # Record active status flag
is_public               # Dataset visibility flag
```

### Identifier Format Specifications

#### User Identifier (id_user)
```
Format: {username}
Examples:
- john_doe
- maria_garcia
- admin_user

Constraints:
- Length: 3-50 characters
- Pattern: ^[a-zA-Z0-9_]+$
- Unique across system
```

#### Dataset Identifier (id_dataset)
```
Format: {username}_{YYYYMMDD}_{sequential_number}
Examples:
- john_doe_20250928_001
- maria_garcia_20250928_002
- research_team_20250928_003

Constraints:
- Length: maximum 100 characters
- Date: ISO format YYYYMMDD
- Sequential: 3-digit zero-padded
- Unique across system
```

#### Comment Identifier (id_comment)
```
Format: cmt_{id_dataset}_{YYYYMMDD}_{sequential_number}
Examples:
- cmt_john_doe_20250928_001_20250928_001
- cmt_maria_garcia_20250928_002_20250928_001

Constraints:
- Prefix: "cmt_"
- References parent dataset
- Timestamp of comment creation
- Sequential numbering per dataset
```

### Administrative Credentials

#### System Administrator Account
```
Username: datec_master
Password: datec_master_4dmin
Email: admin@datec-ss.cr
Role: system_administrator
Permissions: all_access
```

## User Stories Analysis

### Authentication & User Management (HU1-HU4)

#### HU1: User Self-Registration
```
As a new user
I want to create an account with username, encrypted password, personal information, and profile picture
So that I can access the platform and share datasets

Acceptance Criteria:
- Username must be unique and follow naming standards
- Password must be encrypted with bcrypt and salt
- Required fields: username, email, password, first_name, last_name, birth_date
- Optional field: profile picture upload
- Birth date validation (minimum age 13)
```

**Technical Implementation:**
```javascript
// MongoDB users collection
{
  id_user: "john_doe",
  username: "john_doe", 
  email_address: "john@datec-ss.cr",
  password_hash: "$2b$12$...",
  password_salt: "random_salt_string",
  first_name: "John",
  last_name: "Doe", 
  birth_date: ISODate("1995-03-15"),
  is_admin: false,
  profile_picture_id: "avatar_john_doe_20250928", // CouchDB reference
  created_at: ISODate("2025-09-28T10:00:00Z"),
  updated_at: ISODate("2025-09-28T10:00:00Z")
}
```

#### HU2: Initial Administrator Account
```
As a system installer
I want to create an initial administrator account during system setup
So that the platform can be managed from the first deployment

Acceptance Criteria:
- Administrator account created during installation
- Default credentials: datec_master / datec_master_4dmin
- Full administrative privileges enabled
- Cannot be deleted through normal user interface
- Forced password change on first login recommended
```

#### HU3: Administrator Privilege Assignment
```
As an administrator
I want to grant administrative privileges to other users
So that platform management can be distributed among trusted users

Acceptance Criteria:
- Only existing administrators can grant admin privileges
- Target user must have existing account
- Privilege change logged with timestamp and granting admin
- Audit trail maintained for privilege changes
```

#### HU4: User Profile Management
```
As a registered user
I want to edit my personal information
So that I can keep my profile current and accurate

Acceptance Criteria:
- Users can modify: first_name, last_name, email_address, profile_picture, password
- Username cannot be changed after creation
- Password change requires current password verification
- Profile picture upload with size and format validation
- Changes reflected immediately in user interface
```

### Dataset Management (HU5-HU8)

#### HU5: Dataset Creation
```
As a registered user
I want to create a dataset with metadata, files, and tutorial videos
So that I can share my research data with the community

Acceptance Criteria:
- Required fields: name, description, tags, files
- Optional fields: 1 header photo, 1 tutorial video
- File upload support: CSV, JSON, XML, TXT formats
- Video upload support: MP4, AVI, MOV formats
- Photo upload support: PNG, JPG
- Maximum file size: 1GB per file, 5GB total per dataset
- Automatic generation of dataset ID following naming convention
- Dataset submission goes directly to "pending" status for approval
- After admin approval, dataset is automatically set to private
- Dataset owner must manually change to public for general access
- Preview generation for supported file types
```

**Technical Implementation:**
```javascript
// MongoDB datasets collection
{
  id_dataset: "john_doe_20250928_001",
  id_dataset_parent: null, // for clones only
  owner_id: "john_doe",
  dataset_name: "Global Sales Analysis 2024",
  description: "Comprehensive analysis of global sales data...",
  tags: ["sales", "analytics", "business", "2024"],
  is_public: false, // defaults to private after approval
  status: "pending", // pending, approved, rejected
  file_references: [
    {
      file_name: "sales_q1.csv",
      couchdb_document_id: "file_john_doe_20250928_001_001",
      file_size_bytes: 15728640,
      mime_type: "text/csv",
      uploaded_at: ISODate("2025-09-28T10:30:00Z")
    }
  ],
  photo_reference: {
    file_name: "header.jpg",
    couchdb_document_id: "photo_john_doe_20250928_001_001",
    file_size_bytes: 2048000,
    mime_type: "image/jpeg"
  },
  video_reference: {
    file_name: "tutorial.mp4",
    couchdb_document_id: "video_john_doe_20250928_001_001",
    file_size_bytes: 52428800,
    mime_type: "video/mp4",
    duration_seconds: 180
  },
  statistics: {
    download_count: 0,
    clone_count: 0,
    vote_count: 0,
    comment_count: 0
  },
  created_at: ISODate("2025-09-28T10:00:00Z"),
  updated_at: ISODate("2025-09-28T10:00:00Z"),
  reviewed_at: null // set when admin reviews
}
```

#### HU6: Dataset Approval Request
```
As a dataset owner
I want to submit my dataset for approval
So that it can be made available to other users

Acceptance Criteria:
- Dataset automatically submitted for approval upon creation
- Submission timestamp recorded in reviewed_at field when admin acts
- Owner cannot modify dataset while status is "pending"
```

#### HU7: Dataset Privacy and Deletion
```
As a dataset owner or administrator
I want to set my dataset to private or delete it
So that I can control access to my content

Acceptance Criteria:
- Dataset owners can toggle is_public flag on their approved datasets
- Dataset owners can delete their own datasets
- Administrators can modify privacy or delete any dataset
- Existing downloads and clones remain accessible after deletion
- Deletion is permanent (hard delete)
```

#### HU8: Dataset Approval Process
```
As an administrator
I want to review and approve submitted datasets
So that platform content quality is maintained

Acceptance Criteria:
- List of pending datasets visible to administrators
- Approval/rejection with required reason
- Status change from "pending" to "approved" or "rejected"
- Approved datasets automatically set to private (is_public: false)
- Application notification sent to dataset owner
- Approval timestamp recorded in reviewed_at field
- Rejected datasets can be resubmitted after modification
```

### Search & Discovery (HU9-HU12)

#### HU9: Dataset Search
```
As a platform user
I want to search datasets by name, description, and tags
So that I can find relevant data for my projects

Acceptance Criteria:
- Full-text search across dataset names and descriptions
- Tag-based filtering with multiple tag selection
- Search results only show approved and public datasets
- Search result ranking by relevance
```

**Technical Implementation:**
```javascript
// MongoDB text index for search
db.datasets.createIndex({
  dataset_name: "text",
  description: "text", 
  tags: "text"
}, {
  weights: {
    dataset_name: 10,
    tags: 5,
    description: 1
  }
})

// Search query example
db.datasets.find({
  $text: { $search: "sales analytics business" },
  status: "approved",
  is_public: true
}).sort({ score: { $meta: "textScore" } })
```

#### HU10: Dataset Detailed View
```
As a platform user
I want to view complete dataset information including file sizes and metadata
So that I can evaluate if the dataset meets my needs

Acceptance Criteria:
- Complete dataset metadata display
- File listing with sizes and types
- Download statistics and user votes
- Header photo display if available
- Comments and discussion section
- Dataset owner profile link
- Tutorial video embedded player if available
```

#### HU11: Video Content Integration
```
As a dataset owner
I want to include one tutorial video with my dataset
So that users can better understand and utilize the data

Acceptance Criteria:
- Maximum: 1 video per dataset
- Video upload during dataset creation only
- Supported formats: MP4, AVI, MOV
- Maximum video size: 500MB per video
- Automatic thumbnail generation
- Video player with standard controls
```

#### HU12: User Dataset Portfolio
```
As a platform user
I want to view all datasets created by a specific user
So that I can explore their other work and expertise

Acceptance Criteria:
- User profile page with public dataset listing
- Datasets sorted by creation date (newest first)
- User statistics: total datasets, downloads, votes, followers, following count
- Contact button linking to private messaging (HU21)
- Follow button for new dataset notifications (HU19)
```

### Analytics & Tracking (HU13)

#### HU13: Download Analytics
```
As a dataset owner or administrator
I want to see who downloaded my datasets and usage statistics over time
So that I can understand user engagement and data value

Acceptance Criteria:
- List of users who downloaded each dataset
- Download timestamps and user information
- Daily, weekly, monthly download statistics
```

**Technical Implementation:**
```javascript
// Redis real-time counters
SET counter:dataset:john_doe_20250928_001:downloads 156

// Neo4j download relationships
CREATE (user:User {id_user: "maria_garcia"})
-[:DOWNLOADED {
  downloaded_at: datetime("2025-09-28T16:30:00Z"),
  ip_address: "192.168.1.100",
  user_agent: "Mozilla/5.0...",
  download_source: "web_interface"
}]->
(dataset:Dataset {id_dataset: "john_doe_20250928_001"})

// MongoDB download log
{
  id_download: "dl_john_doe_20250928_001_20250928_001",
  id_dataset: "john_doe_20250928_001",
  id_user: "maria_garcia",
  downloaded_at: ISODate("2025-09-28T16:30:00Z"),
  file_name: "sales_q1.csv",
  file_size_bytes: 15728640,
  download_ip: "192.168.1.100"
}
```

### Social Interaction (HU14-HU18)

#### HU14: User Discovery
```
As a platform user
I want to search for other users and view their datasets
So that I can find collaborators and relevant content creators

Acceptance Criteria:
- User search by username, name, or dataset
- User profile display with public information
- User's public datasets visible
- User statistics and activity summary
```

#### HU15: Comment System
```
As a platform user
I want to comment on datasets and reply to other comments
So that I can discuss data quality, usage, and insights

Acceptance Criteria:
- Comment posting on any approved and public dataset
- Threaded comments with unlimited depth
- Comment editing capability
- Comment moderation by administrators
```

**Technical Implementation:**
```javascript
// MongoDB comments collection
{
  id_comment: "cmt_john_doe_20250928_001_20250928_001",
  id_dataset: "john_doe_20250928_001",
  author_id: "maria_garcia",
  parent_comment_id: null, // null for top-level, id for replies
  content: "This dataset provides excellent insights...",
  is_active: true,
  thread_depth: 0,
  created_at: ISODate("2025-09-28T16:20:00Z"),
  updated_at: ISODate("2025-09-28T16:20:00Z")
}
```

#### HU16: Comment Moderation
```
As an administrator
I want to delete or disable inappropriate comments
So that platform discussions remain professional and constructive

Acceptance Criteria:
- Administrators can hide comments by setting is_active to false
- Comment removal capability
- User notification when their comment is moderated
- Moderation log with administrator and timestamp
```

#### HU17: Dataset Voting System
```
As a platform user
I want to upvote datasets and remember my votes
So that I can express quality feedback and see community opinions

Acceptance Criteria:
- Single upvote per user per dataset
- Vote removal option (toggle upvote on/off)
- No downvote functionality
- Real-time vote count updates
- Vote history preservation
- Vote-based dataset ranking in search results
```

**Technical Implementation:**
```javascript
// MongoDB votes collection
{
  id_vote: "vote_john_doe_20250928_001_maria_garcia",
  id_dataset: "john_doe_20250928_001", 
  id_user: "maria_garcia",
  created_at: ISODate("2025-09-28T16:30:00Z")
}

// Unique index on dataset + user
db.votes.createIndex({ id_dataset: 1, id_user: 1 }, { unique: true })
```

#### HU18: Dataset Cloning
```
As a platform user
I want to clone an existing dataset with a new name
So that I can create variations or improvements of existing data

Acceptance Criteria:
- Clone functionality for approved and public datasets
- New dataset name required (cannot duplicate)
- Original dataset attribution maintained via id_dataset_parent
- All files copied to new dataset
- Cloned dataset starts in "pending" status for approval
- Clone relationship tracked for analytics
```

### Advanced Social Features (HU19-HU21)

#### HU19: User Following System
```
As a platform user
I want to follow other users and receive notifications about their new datasets
So that I can stay updated on relevant content from trusted sources

Acceptance Criteria:
- Follow/unfollow functionality for any user
- Notification when followed users publish new public datasets
- Following list management
- Follower count display
```

**Technical Implementation:**
```javascript
// Neo4j follow relationships
CREATE (follower:User {id_user: "maria_garcia"})
-[:FOLLOWS {
  followed_at: datetime("2025-09-28T16:00:00Z"),
  notifications_enabled: true,
  follow_source: "user_profile"
}]->
(followed:User {id_user: "john_doe"})

// Redis notification queue
LPUSH notifications:user:maria_garcia {
  type: "new_dataset",
  from_user: "john_doe", 
  dataset_id: "john_doe_20250928_002",
  timestamp: "2025-09-28T17:00:00Z"
}
```

#### HU20: Follower Management
```
As a platform user
I want to see who follows me
So that I can understand my audience and engage with my community

Acceptance Criteria:
- Follower list with user profiles
- Follower count display on profile
- Following count display on profile
```

#### HU21: Private Messaging
```
As a platform user
I want to send private messages to other users
So that I can communicate directly about datasets and collaboration

Acceptance Criteria:
- Bidirectional messaging between any users
- Message thread organization
- Attachment support for files, images, and hyperlinks
- Simple message display without read/unread status
```

**Technical Implementation:**
```javascript
// MongoDB private_messages collection
{
  id_message: "msg_maria_garcia_john_doe_20250928_001",
  from_user_id: "maria_garcia",
  to_user_id: "john_doe", 
  message_content: "Hi! I have questions about your dataset...",
  attachments: [
    {
      file_name: "questions.pdf",
      couchdb_document_id: "att_msg_001_20250928_001",
      mime_type: "application/pdf"
    }
  ],
  created_at: ISODate("2025-09-28T17:00:00Z")
}

// Conversation thread indexing
db.private_messages.createIndex({ 
  from_user_id: 1, 
  to_user_id: 1, 
  created_at: -1 
})
```

## Functional Requirements

### FR1: Authentication System
- **FR1.1**: Secure login with bcrypt password hashing
- **FR1.2**: JWT-based session management
- **FR1.3**: Password reset capability
- **FR1.4**: Profile management with picture upload

### FR2: Dataset Management
- **FR2.1**: Multi-format file upload (CSV, JSON, XML, TXT)
- **FR2.2**: Single video upload (MP4, AVI, MOV)
- **FR2.3**: Single photo upload (PNG, JPG)
- **FR2.4**: Metadata validation and formatting
- **FR2.5**: Privacy controls (public/private toggle)

### FR3: Search and Discovery
- **FR3.1**: Full-text search with relevance ranking
- **FR3.2**: Tag-based filtering
- **FR3.3**: Public dataset browsing only
- **FR3.4**: User profile discovery

### FR4: Social Features
- **FR4.1**: User following and follower management
- **FR4.2**: Notification system for new datasets
- **FR4.3**: Comment threading with moderation
- **FR4.4**: Private messaging with attachments
- **FR4.5**: Simple upvote system

### FR5: Administrative Functions
- **FR5.1**: Content approval workflow management
- **FR5.2**: User privilege management
- **FR5.3**: Comment moderation tools
- **FR5.4**: Download analytics access

## Non-Functional Requirements

### NFR1: Performance Requirements
- **NFR1.1**: Page load time under 2 seconds for 95% of requests
- **NFR1.2**: Search results returned within 1 second
- **NFR1.3**: File upload support up to 1GB per file, 5GB total per dataset
- **NFR1.4**: Video upload support up to 500MB per video
- **NFR1.5**: Database query response time under 100ms for 90% of operations

### NFR2: Security Requirements
- **NFR2.1**: Data encryption at rest and in transit
- **NFR2.2**: SQL injection and XSS attack prevention
- **NFR2.3**: Rate limiting for API endpoints
- **NFR2.4**: File upload security validation

### NFR3: Reliability Requirements
- **NFR3.1**: System availability of 99% uptime
- **NFR3.2**: Automated backup every 24 hours
- **NFR3.3**: Database replication for data redundancy

### NFR4: Usability Requirements
- **NFR4.1**: Responsive design for mobile and desktop
- **NFR4.2**: Intuitive user interface with minimal training
- **NFR4.3**: Clear navigation and workflow

## Database Requirements

### DR1: Multi-Database Architecture
- **DR1.1**: MongoDB for operational data storage
- **DR1.2**: Redis for caching and session management
- **DR1.3**: Neo4j for social graph relationships
- **DR1.4**: CouchDB for binary file storage

### DR2: Data Consistency
- **DR2.1**: ACID transactions for critical operations
- **DR2.2**: Cross-database referential integrity
- **DR2.3**: Data synchronization mechanisms

### DR3: Data Backup and Recovery
- **DR3.1**: Daily automated backups for all databases
- **DR3.2**: Backup verification procedures
- **DR3.3**: Basic recovery procedures

## Security Requirements

### SR1: Authentication Security
- **SR1.1**: Secure password policy enforcement (minimum length, complexity)
- **SR1.2**: Session timeout and management
- **SR1.3**: Account lockout after failed login attempts
- **SR1.4**: Password encryption with bcrypt and salt

### SR2: Data Protection
- **SR2.1**: Secure file upload validation
- **SR2.2**: API rate limiting and throttling
- **SR2.3**: Audit logging for approval workflow and administrative actions
- **SR2.4**: Data encryption in transit (HTTPS)

### SR3: Access Control
- **SR3.1**: Role-based access control (RBAC)
- **SR3.2**: Resource-level access controls
- **SR3.3**: Administrative privilege separation

## Integration Requirements

### IR1: API Requirements
- **IR1.1**: RESTful API design principles
- **IR1.2**: API rate limiting and quotas
- **IR1.3**: Basic API documentation

### IR2: File Management
- **IR2.1**: Secure file upload and storage with size limits
- **IR2.2**: File type validation (CSV, JSON, XML, TXT, MP4, AVI, MOV, PNG, JPG)
- **IR2.3**: Efficient file retrieval and streaming

### IR3: Notification System
- **IR3.1**: Real-time notification delivery via Redis
- **IR3.2**: Notification for new datasets from followed users
- **IR3.3**: Application-level notification display

## Acceptance Criteria

### AC1: User Story Completion
Each user story must satisfy the following criteria:
- All specified functionality implemented and tested
- Error handling for edge cases
- Performance requirements met
- Security requirements satisfied
- User interface matches specifications

### AC2: System Integration
- All databases properly integrated and synchronized
- Cross-database queries function correctly
- Data consistency maintained across systems
- Real-time features operate within latency requirements

### AC3: Quality Assurance
- Unit test coverage for critical functionality
- Integration test suite covers all user workflows
- Basic performance testing validates requirements
- Security validation for authentication and file uploads

## Conclusion

This Software Requirements Specification provides comprehensive documentation for the DaTEC platform implementation focused on core functionality. The 21 user stories cover essential functionality for an academic dataset sharing platform, while the multi-database architecture ensures performance and scalability.

The simplified approach prioritizes implementability within the academic timeline while maintaining all required features from the original specification. The clear naming conventions and identifier formats establish consistent development practices aligned with industry standards.

The specification serves as the authoritative reference for development, testing, and acceptance criteria throughout the project lifecycle.