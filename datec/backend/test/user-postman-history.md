# Postman Tests - User Endpoints

## Prerequisites

1. **Server must be running**: `npm run dev` in backend folder
2. **Databases must be up**: MongoDB, Redis, Neo4j, CouchDB
3. **Base URL**: `http://localhost:3000`

---

## Environment Variables Setup

Create a new environment in Postman with these variables:

| Variable         | Initial Value                                                                                                                                                                                                                                         | Current Value |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `base_url`       | `http://localhost:3000`                                                                                                                                                                                                                               |
| `user_token`     | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTUwMDAtODAwMC0wMDAwNWEzMTczNDciLCJ1c2VybmFtZSI6InN1ZG9kNHQzYyIsImlzQWRtaW4iOnRydWUsImlhdCI6MTc1OTYxOTYwNCwiZXhwIjoxNzYwMjI0NDA0fQ.0MncefJbKE4KI0a0qlSvDKV3MahU_l5E4VbIHk_pkC4` |
| `admin_username` | `sudod4t3c`                                                                                                                                                                                                                                           |
| `admin_password` | `dat3c_master_4dmin`                                                                                                                                                                                                                                  |
| `test_username`  | `einst3in`                                                                                                                                                                                                                                            |
| `test_password`  | `einst3in`                                                                                                                                                                                                                                            |

---

## 1. Test Collection Order

Execute tests in this order:

### **1. Health Check**

### **2. Authentication (prerequisite for other tests)**

### **3. Public User Endpoints**

### **4. Protected User Endpoints**

### **5. Admin Endpoints**

### **6. Social Features**

---

## 2. Health Check

**Purpose**: Verify server is running

```txt
GET {{base_url}}/api/health
```

**Expected Response** (200 OK):

```json
{
  "status": "OK",
  "message": "DaTEC API is running",
  "timestamp": "2025-10-05T01:24:51.070Z"
}
```

---

## 3. Public User Endpoints

### 3.1 Search Users

**HU14**: Search users by name/username

```txt
GET {{base_url}}/api/users/search?q={{test_username}}
```

**Response** (200 OK):

```json
{
  "success": true,
  "count": 1,
  "users": [
    {
      "userId": "b42bc146-ed55-5c53-a284-2b39d074274e",
      "username": "einst3in",
      "fullName": "Albert Einstein",
      "avatarUrl": "http://localhost:5984/datec/avatar_b42bc146-ed55-5c53-a284-2b39d074274e/avatar_einst3in.jpg",
      "isAdmin": false,
      "createdAt": "2025-10-05T01:18:32.805Z"
    }
  ]
}
```

**Test Cases**:

- Search with `q=hernandez` (find 2 users)

```txt
GET {{base_url}}/api/users/search?q=hernandez
```

```json
{
  "success": true,
  "count": 2,
  "users": [
    {
      "userId": "00000000-0000-5000-8000-000004637677",
      "username": "valeriehernandez",
      "fullName": "Valerie Hernandez Fernandez",
      "avatarUrl": null,
      "isAdmin": false,
      "createdAt": "2025-10-05T00:56:37.109Z"
    },
    {
      "userId": "00000000-0000-5000-8000-00002a10550c",
      "username": "erickhernandez",
      "fullName": "Erick Hernandez Bonilla",
      "avatarUrl": null,
      "isAdmin": false,
      "createdAt": "2025-10-05T00:56:37.109Z"
    }
  ]
}
```

- Search with `q=DaTEC System Administrator` (find sudod4t3c)
- Search with `q=sudod4t3c` (find sudod4t3c)

```json
{
  "success": true,
  "count": 1,
  "users": [
    {
      "userId": "00000000-0000-5000-8000-00005a317347",
      "username": "sudod4t3c",
      "fullName": "DaTEC System Administrator",
      "avatarUrl": null,
      "isAdmin": true,
      "createdAt": "2025-10-01T21:15:41.744Z"
    }
  ]
}
```

- Search without `q` parameter (return 400 error)

```json
{
  "error": "Query parameter required"
}
```

- Search with `q=xyz123` (should return empty array)

```json
{
  "success": true,
  "count": 0,
  "users": []
}
```

---

### 3.2 Get User Profile

```txt
GET {{base_url}}/api/users/:username
```

```txt
GET {{base_url}}/api/users/{{admin_username}}
```

**Response** (200 OK):

```json
{
  "success": true,
  "user": {
    "userId": "00000000-0000-5000-8000-00005a317347",
    "username": "sudod4t3c",
    "fullName": "DaTEC System Administrator",
    "birthDate": "1999-09-09T00:00:00.000Z",
    "emailAddress": "sudo@datec.com",
    "avatarUrl": null,
    "isAdmin": true,
    "createdAt": "2025-10-05T00:56:37.109Z",
    "updatedAt": "2025-10-05T00:56:37.109Z"
  }
}
```

```txt
GET {{base_url}}/api/users/unknown
```

```json
{
  "error": "User not found"
}
```

**Test Cases**:

- Get profile of existing user (sudod4t3c)
- Get profile of non-existent user (should return 404)

---

### 3.3 Get User Followers

**HU20**: Get followers list

```txt
GET {{base_url}}/api/users/unknown/followers
```

**Response** (404):

```json
{
  "error": "User not found"
}
```

```txt
GET {{base_url}}/api/users/{{admin_username}}/followers
```

**Response** (200 OK):

```json
{
  "success": true,
  "count": 0,
  "followers": []
}
```

```
GET {{base_url}}/api/users/valeriehernandez/followers
```

**Response** (200 OK):

```json
{
  "success": true,
  "count": 2,
  "followers": [
    {
      "userId": "00000000-0000-5000-8000-00002a10550c",
      "username": "erickhernandez",
      "fullName": "Erick Hernandez Bonilla",
      "avatarUrl": null
    },
    {
      "userId": "00000000-0000-5000-8000-000050c163e7",
      "username": "armandogarcia",
      "fullName": "Armando Garcia Paniagua",
      "avatarUrl": null
    }
  ]
}
```

---

### 3.4 Get Users Following

**HU20**: Get following list

```txt
GET {{base_url}}/api/users/vaeleriehernandez/following
```

**Response** (200 OK):

```json
{
  "success": true,
  "count": 0,
  "following": []
}
```

```txt
GET {{base_url}}/api/users/erickhernandez/following
```

**Response** (200 OK):

```json
{
  "success": true,
  "count": 2,
  "following": [
    {
      "userId": "00000000-0000-5000-8000-000004637677",
      "username": "valeriehernandez",
      "fullName": "Valerie Hernandez Fernandez",
      "avatarUrl": null
    },
    {
      "userId": "00000000-0000-5000-8000-000050c163e7",
      "username": "armandogarcia",
      "fullName": "Armando Garcia Paniagua",
      "avatarUrl": null
    }
  ]
}
```

```txt
GET {{base_url}}/api/users/unknown/following
```

**Response** (404):

```json
{
  "error": "User not found"
}
```

---

## 4. Protected User Endpoints

### 4.1 Update User Profile

**HU4**: Edit own profile

**IMPORTANT**: Login as the user first to get their token

```
POST {{base_url}}/api/auth/login
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "dhodgkin",
  "password": "dhodgkin"
}
```

## Response [200]

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3OGJmZmU1MS1hMjhiLTU5OGEtODg1ZC0wZTFiMDRmYzMzMjUiLCJ1c2VybmFtZSI6ImRob2Rna2luIiwiaXNBZG1pbiI6ZmFsc2UsImlhdCI6MTc1OTYyODU3NSwiZXhwIjoxNzYwMjMzMzc1fQ.RWhqmESFkkHcZQ5bxmhO7iNC7bpbSWweFmG1bgB85Jw",
  "user": {
    "userId": "78bffe51-a28b-598a-885d-0e1b04fc3325",
    "username": "dhodgkin",
    "fullName": "Dorothy Crowfoot Hodgkin",
    "isAdmin": false,
    "avatarUrl": null
  }
}
```

```txt
PUT {{base_url}}/api/users/dhodgkin
Authorization: Bearer {{user_token}}
Content-Type: multipart/form-data
```

**No token response**

```json
{
  "success": false,
  "error": "Access denied. No token provided"
}
```

**Token response**

**Body** (form-data):

- `avatar`: `C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\database\multimedia\avatar\avatar_dhodgkin.jpg`

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

**Body** (form-data):

- `avatar`: `C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\database\multimedia\avatar\avatar_dhodgkin.jpg`

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

**Body** (form-data):

- `username`: `newuser123`

**Response** (expected 400):

```json
{
  "success": true,
  "message": "Username cannot be changed"
}
```

```txt
PUT {{base_url}}/api/users/valeriehernandez
```

**Body** (form-data):

- `email_address`: `other@estudiantec.cr`

**Response** (200 OK):

```json
{
  "error": "Forbidden: You can only edit your own profile"
}
```

**Test Cases**:

- Update only email
- Update only fullName
- Update only birthDate
- Update only avatar
- Try to update another tribute (should return 400 or 401)
- Try to update another user's profile (should return 403)
- Try to update with duplicate email (should return 409)

---

## 5. Admin Endpoints

**IMPORTANT**: Login as admin first

### 5.1 Promote User to Admin

**HU3**: Admin promotion

```text
PATCH {{base_url}}/api/users/valeriehernandez/promote
Authorization: Bearer {{user_token}}
```

**Response** (200 OK):

```json
{
  "success": true,
  "isAdmin": true,
  "message": "User promoted to admin"
}
```

_PATCH again_

```json
{
  "success": true,
  "isAdmin": false,
  "message": "User demoted from admin"
}
```

```text
PATCH {{base_url}}/api/users/sudod4t3c/promote
Authorization: Bearer {{user_token}}
```

**Response** (400):

```json
{
  "error": "Cannot demote yourself"
}
```

```text
PATCH {{base_url}}/api/users/valeriehernandez/promote
Authorization: Bearer {{user_token}}
```

**Response** (403):

```json
{
  "success": false,
  "error": "Access denied. Administrator privileges required"
}
```

**Test Cases**:

- Promote regular user to admin (isAdmin: false → true)
- Demote admin to regular user (isAdmin: true → false)
- Try to demote yourself (should return 400)
- Try as non-admin user (should return 403)

---

## 6. Social Features (Follow System)

### 6.1 Follow User

**HU19**: Follow another user

**IMPORTANT**: Login as dhodgkin first

```
POST {{base_url}}/api/users/valeriehernandez/follow
Authorization: Bearer {{user_token}}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Now following valeriehernandez"
}
```

**Response** (409):

Follow again

```json
{
  "error": "Already following this user"
}
```

```
POST {{base_url}}/api/users/unknown/follow
Authorization: Bearer {{user_token}}
```

**Response** (404):

```json
{
  "error": "User not found"
}
```

```
POST {{base_url}}/api/users/dhodgkin/follow
Authorization: Bearer {{user_token}}
```

**Response** (400):

```json
{
  "error": "Cannot follow yourself"
}
```

**Verification**:
After successful follow, check:

1. Neo4j has FOLLOWS relationship
2. john_doe received notification in Redis

**Test Cases**:

- Follow a user successfully
- Try to follow the same user again (should return 409)
- Try to follow yourself (should return 400)
- Follow non-existent user (should return 404)

---

### 6.2 Unfollow User

**HU19**: Unfollow user

```
DELETE {{base_url}}/api/users/valeriehernandez/follow
Authorization: Bearer {{user_token}}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Unfollowed valeriehernandez"
}
```

Unfollow again

**Response** (404):

```json
{
  "error": "Not following this user"
}
```

**Test Cases**:

- Unfollow a user you're following
- Try to unfollow a user you're not following (should return 404)
