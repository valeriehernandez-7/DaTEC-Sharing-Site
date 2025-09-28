# Postman Tests - User Endpoints

## Prerequisites

1. **Server must be running**: `npm run dev` in backend folder
2. **Databases must be up**: MongoDB, Redis, Neo4j, CouchDB
3. **Base URL**: `http://localhost:3000`

---

## Environment Variables Setup

Create a new environment in Postman with these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:3000` |
| `admin_token` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTUwMDAtODAwMC0wMDAwNWEzMTczNDciLCJ1c2VybmFtZSI6InN1ZG9kNHQzYyIsImlzQWRtaW4iOnRydWUsImlhdCI6MTc1OTYxOTYwNCwiZXhwIjoxNzYwMjI0NDA0fQ.0MncefJbKE4KI0a0qlSvDKV3MahU_l5E4VbIHk_pkC4` |
| `admin_username` | `sudod4t3c` |
| `admin_password` | `dat3c_master_4dmin` |
| `test_username` | `einst3in` |
| `test_password` | `einst3in` |

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

```
GET {{base_url}}/api/health
```

**Expected Response** (200 OK):
```json
{
  "status": "OK",
  "message": "DaTEC API is running",
  "timestamp": "2025-10-04T..."
}
```

---

## 3. Public User Endpoints

### 3.1 Search Users

**HU14**: Search users by name/username

```
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
            "createdAt": "2025-10-04T21:53:07.079Z"
        }
    ]
}
```

**Test Cases**:
- Search with `q=hernandez` (find 2 users)
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
            "createdAt": "2025-10-01T21:15:41.744Z"
        },
        {
            "userId": "00000000-0000-5000-8000-00002a10550c",
            "username": "erickhernandez",
            "fullName": "Erick Hernandez Bonilla",
            "avatarUrl": null,
            "isAdmin": false,
            "createdAt": "2025-10-01T21:15:41.744Z"
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

```
GET {{base_url}}/api/users/{{username}}
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
        "createdAt": "2025-10-01T21:15:41.744Z",
        "updatedAt": "2025-10-01T21:15:41.744Z"
    }
}
```

```
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

```
GET {{base_url}}/api/users/sudod4t3c/followers
```

**Response** (500):
```json
{
    "error": "Internal server error"
}
```

---

### 3.4 Get Users Following

**HU20**: Get following list

```
GET {{base_url}}/api/users/jane_smith/following
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "count": 2,
  "following": [
    {
      "userId": "uuid",
      "username": "john_doe",
      "fullName": "John Doe",
      "avatarUrl": null
    }
  ]
}
```

---

## 4. Protected User Endpoints

### 4.1 Update User Profile

**HU4**: Edit own profile

**IMPORTANT**: Login as the user first to get their token

```
PUT {{base_url}}/api/users/{{test_username}}
Authorization: Bearer {{auth_token}}
Content-Type: multipart/form-data
```

**Body** (form-data):
- `full_name`: `Updated Test User`
- `birth_date`: `2000-06-15`
- `email_address`: `newemail@example.com`
- `avatar`: (optional) Select new image file

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

**Test Cases**:
- Update with all fields
- Update only full_name
- Update only avatar
- Try to update another user's profile (should return 403)
- Try to update with duplicate email (should return 409)

---

## 5. Admin Endpoints

**IMPORTANT**: Login as admin first

### 5.1 Promote User to Admin

**HU3**: Admin promotion

```
PATCH {{base_url}}/api/users/testuser01/promote
Authorization: Bearer {{auth_token}}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "isAdmin": true,
  "message": "User promoted to admin"
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

**IMPORTANT**: Login as testuser01 first

```
POST {{base_url}}/api/users/john_doe/follow
Authorization: Bearer {{auth_token}}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Now following john_doe"
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
DELETE {{base_url}}/api/users/john_doe/follow
Authorization: Bearer {{auth_token}}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Unfollowed john_doe"
}
```

**Test Cases**:
- Unfollow a user you're following
- Try to unfollow a user you're not following (should return 404)

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Query parameter required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid authentication token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden: You can only edit your own profile"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Email already in use"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```