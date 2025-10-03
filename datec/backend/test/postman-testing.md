# DaTEC Backend API Testing Guide

Complete testing suite for all 21 User Stories. Tests are ordered by dependency.

---

## 🔐 AUTHENTICATION (HU1, HU2)

### TEST 1: Admin Login

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/auth/login`  
**BODY**:

```json
{
  "username": "sudod4t3c",
  "password": "dat3c_master_4dmin"
}
```

**EXPECTED**: `200 OK`  
**NOTES**:

- Save token as `ADMIN_TOKEN`
- Response contains `{ token, user: { userId, username, isAdmin: true } }`

---

### TEST 2: Regular User Login (erickhernandez)

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/auth/login`  
**BODY**:

```json
{
  "username": "erickhernandez",
  "password": "erickhernandez"
}
```

**EXPECTED**: `200 OK`  
**NOTES**:

- Save token as `ERICK_TOKEN`
- `isAdmin: false`

---

### TEST 3: Regular User Login (armandogarcia)

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/auth/login`  
**BODY**:

```json
{
  "username": "armandogarcia",
  "password": "armandogarcia"
}
```

**EXPECTED**: `200 OK`  
**NOTES**:

- Save token as `ARMANDO_TOKEN`

---

### TEST 4: User Registration (HU1)

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/auth/register`  
**BODY** (form-data):

```
username: hedylamarr
email_address: hedylamarr@datec.com
password: hedylamarr
full_name: Hedy Lamarr
birth_date: 1990-11-09
```

**EXPECTED**: `201 Created`  
**NOTES**:

- Returns token and user object
- User created with `isAdmin: false`

---

## 👥 USER MANAGEMENT (HU3, HU4, HU14)

### TEST 5: Get User Profile

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/users/erickhernandez`  
**HEADERS**: None (public endpoint)  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns public profile info
- No sensitive data exposed

---

### TEST 6: Search Users (HU14)

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/users/search?q=hernandez`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns array of users matching query
- Searches username and full_name

---

### TEST 7: Update Own Profile (HU4)

**HTTP METHOD**: `PUT`  
**URL**: `http://localhost:3000/api/users/erickhernandez`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**BODY** (JSON):

```json
{
  "full_name": "Erick Hernandez"
}
```

**EXPECTED**: `200 OK`  
**NOTES**:

- User can only update own profile

---

### TEST 8: Promote|Demote User to Admin (HU3)

**HTTP METHOD**: `PATCH`  
**URL**: `http://localhost:3000/api/users/armandogarcia/promote`  
**HEADERS**: `Authorization: Bearer {ADMIN_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Only admins can promote users
- Response: `{ isAdmin: true }`

---

## 📊 DATASETS - CREATION (HU5, HU11)

### TEST 9: Create Dataset (HU5)

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**BODY** (form-data):

```
dataset_name: Sales Analytics Q1 2025
description: Comprehensive sales analysis for Q1 2025 including regional breakdowns and trend analysis
tutorial_video_url: https://www.youtube.com/watch?v=uBBDMqZKagY
data_files: [upload CSV file, JSON file]
header_photo: [upload JPG file]
```

**EXPECTED**: `201 Created`  
**NOTES**:

- Save `dataset_id` from response as `DATASET_1_ID`
- Initial status: `pending`
- File upload required (use any CSV/Excel file for testing)

---

### TEST 10: Create Second Dataset

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**BODY** (form-data):

```
dataset_name: Climate Data 2024
description: Global climate change indicators and temperature measurements from weather stations worldwide
data_files: [upload JSON file]
```

**EXPECTED**: `201 Created`  
**NOTES**:

- Save `dataset_id` as `DATASET_2_ID`
- No header photo (optional)
- No video (optional)

---

## 🔍 DATASETS - SEARCH & VIEW (HU9, HU10, HU12)

### TEST 11: Search Datasets (HU9)

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/search?q=sales`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns empty array (datasets are pending, not approved yet)
- Text search on name, description, tags

---

### TEST 12: Get User's Datasets (HU12)

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/user/erickhernandez`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Owner sees own pending datasets
- Returns array with DATASET_1

---

### TEST 13: Get Dataset Details - Owner View (HU10)

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Owner can view own pending dataset
- Response includes files, photo, video, counters

---

### TEST 14: Get Dataset Details - Non-Owner Forbidden

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `403 Forbidden`  
**NOTES**:

- Cannot view other users' pending datasets

---

## 🎯 DATASET WORKFLOW (HU6, HU7, HU8)

### TEST 15: Request Approval (HU6)

**HTTP METHOD**: `PATCH`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/review-request`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Status changes to `pending` (already pending, should still work)
- Owner requests admin review

---

### TEST 16: List Pending Datasets - Admin (HU8)

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/admin/datasets/pending`  
**HEADERS**: `Authorization: Bearer {ADMIN_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns both DATASET_1 and DATASET_2
- Sorted by creation date (oldest first)

---

### TEST 17: Approve Dataset - Admin (HU8)

**HTTP METHOD**: `PATCH`  
**URL**: `http://localhost:3000/api/admin/datasets/{DATASET_1_ID}`  
**HEADERS**: `Authorization: Bearer {ADMIN_TOKEN}`  
**BODY**:

```json
{
  "action": "approve",
  "admin_review": "Excellent dataset, well documented"
}
```

**EXPECTED**: `200 OK`  
**NOTES**:

- Status changes to `approved`
- Notification sent to owner (Redis)
- Dataset now public by default

---

### TEST 18: Reject Dataset - Admin (HU8)

**HTTP METHOD**: `PATCH`  
**URL**: `http://localhost:3000/api/admin/datasets/{DATASET_2_ID}`  
**HEADERS**: `Authorization: Bearer {ADMIN_TOKEN}`  
**BODY**:

```json
{
  "action": "reject",
  "admin_review": "Incomplete data, please add more sources"
}
```

**EXPECTED**: `200 OK`  
**NOTES**:

- Status changes to `rejected`
- Notification sent to owner

---

### TEST 19: Toggle Dataset Visibility (HU7)

**HTTP METHOD**: `PATCH`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/visibility`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**BODY**:

```json
{
  "is_public": false
}
```

**EXPECTED**: `200 OK`  
**NOTES**:

- Dataset becomes private
- Only owner/admin can view

---

### TEST 20: Make Dataset Public Again

**HTTP METHOD**: `PATCH`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/visibility`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**BODY**:

```json
{
  "is_public": true
}
```

**EXPECTED**: `200 OK`

---

### TEST 21: Search Now Returns Results

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/search?q=sales`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Now returns DATASET_1 (approved + public)
- Rejected datasets don't appear

---

## ⭐ VOTES (HU17)

### TEST 22: Vote on Dataset

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/votes`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**BODY**:

```json
{
  "rating": 5
}
```

**EXPECTED**: `201 Created`  
**NOTES**:

- Rating must be 1-5
- Cannot vote on own dataset
- Redis counter incremented

---

### TEST 23: Get Dataset Votes

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/votes`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns vote count and average rating
- Includes voter information

---

### TEST 24: Check User Vote Status

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/votes/me`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns `{ hasVoted: true, vote: { rating: 5 } }`

---

### TEST 25: Update Vote

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/votes`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**BODY**:

```json
{
  "rating": 4
}
```

**EXPECTED**: `200 OK`  
**NOTES**:

- Updates existing vote
- Response shows old and new rating

---

### TEST 26: Remove Vote

**HTTP METHOD**: `DELETE`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/votes`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Vote removed from MongoDB
- Redis counter decremented

---

## 📥 DOWNLOADS (HU13)

### TEST 27: Download Dataset (HU13)

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/download`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `200 OK` (binary ZIP file)  
**NOTES**:

- Creates DOWNLOADED relationship in Neo4j
- Increments Redis download counter
- Only once per user

---

### TEST 28: Get Download Statistics

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/downloads`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Only owner can view stats
- Shows download count, unique users, recent downloads

---

## 📋 CLONE DATASET (HU18)

### TEST 29: Clone Dataset

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/clone`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**BODY**:

```json
{
  "new_dataset_name": "Sales Analytics Q1 2025 armandoversion"
}
```

**EXPECTED**: `201 Created`  
**NOTES**:

- Save new `dataset_id` as `CLONED_DATASET_ID`
- Creates copy in all 4 databases
- Status: `pending` (needs approval again)
- Sets `parent_dataset_id` to DATASET_1_ID

---

## 👥 FOLLOW SYSTEM (HU19, HU20)

### TEST 30: Follow User (HU19)

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/users/hedylamarr/follow`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Creates FOLLOWS relationship in Neo4j
- Sends notification to erickhernandez

---

### TEST 31: Get Followers (HU20)

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/users/valeriehernandez/followers`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns array with armandogarcia
- Public endpoint

---

### TEST 32: Get Following (HU20)

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/users/armandogarcia/following`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns array with erickhernandez

---

### TEST 33: Unfollow User

**HTTP METHOD**: `DELETE`  
**URL**: `http://localhost:3000/api/users/hedylamarr/follow`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Removes FOLLOWS relationship

---

## 💬 COMMENTS (HU15)

### TEST 34: Add Top-Level Comment

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/comments`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**BODY**:

```json
{
  "content": "Great dataset! Very useful for my research."
}
```

**EXPECTED**: `201 Created`  
**NOTES**:

- Save `comment_id` as `COMMENT_1_ID`
- Increments dataset comment_count

---

### TEST 35: Reply to Comment

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/comments`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**BODY**:

```json
{
  "content": "Thank you! Glad it's helpful.",
  "parent_comment_id": "{COMMENT_1_ID}"
}
```

**EXPECTED**: `201 Created`  
**NOTES**:

- Save `comment_id` as `COMMENT_2_ID`
- Creates nested reply

---

### TEST 36: Get Comment Tree

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/comments`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns tree structure
- COMMENT_1 has COMMENT_2 in `replies` array

---

### TEST 37: Disable Comment - Admin (HU16)

**HTTP METHOD**: `PATCH`  
**URL**: `http://localhost:3000/api/admin/comments/{COMMENT_1_ID}/disable`  
**HEADERS**: `Authorization: Bearer {ADMIN_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Sets `is_active: false`
- Regular users won't see it

---

### TEST 38: Regular User Doesn't See Disabled Comment

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/comments`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Response excludes COMMENT_1
- Only active comments shown

---

### TEST 39: Admin Sees Disabled Comment

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/comments`  
**HEADERS**: `Authorization: Bearer {ADMIN_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Response includes COMMENT_1 with `is_active: false`

---

## 💌 PRIVATE MESSAGES (HU21)

### TEST 40: Send Private Message

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/messages/armandogarcia/erickhernandez`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**BODY**:

```json
{
  "content": "Hi Erick! I have some questions about your dataset methodology."
}
```

**EXPECTED**: `201 Created`  
**NOTES**:

- First message in conversation
- Save `message_id`

---

### TEST 41: Reply to Message

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/messages/erickhernandez/armandogarcia`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**BODY**:

```json
{
  "content": "Hi Armando! Sure, what would you like to know?"
}
```

**EXPECTED**: `201 Created`

---

### TEST 42: Get Conversation Thread

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/messages/armandogarcia/erickhernandez`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns both messages in chronological order
- Works from either user's perspective

---

### TEST 43: Privacy - Cannot View Other's Messages

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/messages/armandogarcia/erickhernandez`  
**HEADERS**: `Authorization: Bearer {ADMIN_TOKEN}`  
**EXPECTED**: `403 Forbidden`  
**NOTES**:

- Only participants can view conversation
- Even admins cannot access

---

## 🔔 NOTIFICATIONS

### TEST 44: Get User Notifications

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/notifications`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns notifications from:
  - Dataset approval (TEST 17)
  - New follower (TEST 30)

---

### TEST 45: Get Notification Count

**HTTP METHOD**: `GET`  
**URL**: `http://localhost:3000/api/notifications/count`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Returns total count

---

### TEST 46: Clear Notifications

**HTTP METHOD**: `DELETE`  
**URL**: `http://localhost:3000/api/notifications`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Empties notification queue

---

## 🗑️ DELETE DATASET (HU7)

### TEST 47: Delete Dataset

**HTTP METHOD**: `DELETE`  
**URL**: `http://localhost:3000/api/datasets/{CLONED_DATASET_ID}`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**EXPECTED**: `200 OK`  
**NOTES**:

- Deletes from all 4 databases:
  - MongoDB: dataset, votes, comments
  - CouchDB: all files
  - Neo4j: dataset node + relationships
  - Redis: counters

---

## ✅ VALIDATION TESTS (Error Handling)

### TEST 48: Invalid Login

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/auth/login`  
**BODY**:

```json
{
  "username": "sudod4t3c",
  "password": "wrongpassword"
}
```

**EXPECTED**: `401 Unauthorized`

---

### TEST 49: Vote on Own Dataset

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/votes`  
**HEADERS**: `Authorization: Bearer {ERICK_TOKEN}`  
**BODY**:

```json
{
  "rating": 5
}
```

**EXPECTED**: `400 Bad Request`  
**NOTES**: Cannot vote on own dataset

---

### TEST 50: Comment Too Long

**HTTP METHOD**: `POST`  
**URL**: `http://localhost:3000/api/datasets/{DATASET_1_ID}/comments`  
**HEADERS**: `Authorization: Bearer {ARMANDO_TOKEN}`  
**BODY**:

```json
{
  "content": "[string with 2001+ characters]"
}
```

**EXPECTED**: `400 Bad Request`  
**NOTES**: Max 2000 characters

---

## 📊 SUMMARY

**Total Tests**: 50  
**Coverage**:

- ✅ All 21 User Stories
- ✅ All 8 Controllers
- ✅ Success cases
- ✅ Error validation
- ✅ Privacy/permissions
- ✅ All 4 databases

**Execution Order**: Sequential (tests depend on previous results)

**Estimated Time**: 30-40 minutes for complete suite
