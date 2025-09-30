# Dataset Endpoints - Postman Tests

## Prerequisites

1. Server running: `npm run dev`
2. All databases up and running
3. Have valid auth tokens ready

---

## Environment Variables

Add to your Postman environment:

| Variable      | Value                             |
| ------------- | --------------------------------- |
| `base_url`    | `http://localhost:3000`           |
| `user_token`  | (token from login - regular user) |
| `admin_token` | (token from admin login)          |

---

## Test Execution Order

1. Create Dataset (HU5)
2. Search Datasets (HU9)
3. Get Dataset Details (HU10)
4. Get User's Datasets (HU12)
5. Request Approval (HU6)
6. Toggle Visibility (HU7)
7. Clone Dataset (HU18)
8. Delete Dataset (HU7)

---

## T1: Create Dataset (HU5)

### Request

```txt
POST {{base_url}}/api/datasets
Authorization: Bearer {{user_token}}
Content-Type: multipart/form-data
```

### Body (form-data)

```txt
dataset_name: Research Dataset
description: This is a comprehensive dataset containing research data for machine learning projects
tutorial_video_url: https://youtu.be/uBBDMqZKagY
data_files: [Select 1-3 CSV or JSON files]
header_photo: [Select 1 image file, optional]
```

### Response [201]

```json
{
  "success": true,
  "message": "Dataset created successfully",
  "dataset": {
    "dataset_id": "dhodgkin_20251005_001",
    "dataset_name": "research-dataset",
    "status": "pending",
    "file_count": 2
  }
}
```

```txt
POST {{base_url}}/api/datasets
Authorization: No Auth
Content-Type: multipart/form-data
```

### Response [401]

```json
{
  "success": false,
  "error": "Access denied. No token provided"
}
```

### Notes

- Save the `dataset_id` for subsequent tests
- Files must be actual files, not just filenames
- At least 1 data file is required

---

## T2: Create Dataset - Validation Errors

### T2.1: No files provided

```
POST {{base_url}}/api/datasets
Authorization: Bearer {{user_token}}
Content-Type: multipart/form-data

Body:
dataset_name: Test Dataset
description: Testing without files
```

**Expected Response [400]**:

```json
{
    "success": false,
    "error": "At least one data file is required"
}
```

### T2.2: Dataset name too short

```
Body:
dataset_name: AB
description: Valid description here
data_files: [Select file]
```

**Expected Response [400]**:

```json
{
  "success": false,
  "error": "Dataset name must be at least 3 characters"
}
```

### T2.3: Description too short

```
Body:
dataset_name: Valid Name
description: Short
data_files: [Select file]
```

**Expected Response [400]**:

```json
{
  "success": false,
  "error": "Description must be at least 10 characters"
}
```

---

## T3: Search Datasets (HU9)

### Request

```
GET {{base_url}}/api/datasets/search?q=sales
```

### Expected Response [200]

```json
{
  "success": true,
  "count": 2,
  "datasets": [
    {
      "dataset_id": "erickhernandez_20250101_001",
      "dataset_name": "Global Sales Analysis 2024",
      "description": "Comprehensive sales data...",
      "tags": ["sales", "business", "analytics"],
      "owner": {
        "username": "erickhernandez",
        "fullName": "Erick Hernandez Bonilla"
      },
      "header_photo_url": null,
      "file_count": 1,
      "download_count": 0,
      "vote_count": 0,
      "created_at": "2025-10-05T00:56:37.109Z"
    }
  ]
}
```

### Test Cases

- `q=sales` - Find datasets with "sales" in name/description
- `q=climate` - Find climate-related datasets
- `q=xyz123` - Search with no results (should return empty array)
- Without `q` parameter - Should return 400 error

---

## T4: Get Dataset Details (HU10)

### Request

```
GET {{base_url}}/api/datasets/erickhernandez_20250101_001
```

### Expected Response [200]

```json
{
  "success": true,
  "dataset": {
    "dataset_id": "erickhernandez_20250101_001",
    "dataset_name": "Global Sales Analysis 2024",
    "description": "Comprehensive analysis...",
    "tags": ["sales", "analytics", "business"],
    "status": "approved",
    "is_public": true,
    "parent_dataset_id": null,
    "owner": {
      "user_id": "00000000-0000-5000-8000-00002a10550c",
      "username": "erickhernandez",
      "fullName": "Erick Hernandez Bonilla",
      "avatarUrl": null
    },
    "files": [
      {
        "file_name": "sales_data.csv",
        "file_size_bytes": 1024000,
        "mime_type": "text/csv",
        "download_url": "http://localhost:5984/datec/file_erickhernandez_20250101_001_001/sales_data.csv"
      }
    ],
    "header_photo_url": null,
    "tutorial_video": null,
    "download_count": 0,
    "vote_count": 0,
    "comment_count": 0,
    "created_at": "2025-10-05T00:56:37.109Z",
    "updated_at": "2025-10-05T00:56:37.109Z",
    "reviewed_at": "2025-10-05T01:00:00.000Z",
    "admin_review": "Approved for publication"
  }
}
```

### Test Cases

- Get approved and public dataset - Success
- Get non-existent dataset - 404 error
- Get private dataset (not owner) - 403 error

---

## T5: Get User's Datasets (HU12)

### Request

```
GET {{base_url}}/api/datasets/user/erickhernandez
```

### Expected Response [200]

```json
{
  "success": true,
  "count": 1,
  "username": "erickhernandez",
  "datasets": [
    {
      "dataset_id": "erickhernandez_20250101_001",
      "dataset_name": "Global Sales Analysis 2024",
      "description": "Comprehensive analysis...",
      "tags": ["sales", "analytics"],
      "status": "approved",
      "is_public": true,
      "header_photo_url": null,
      "file_count": 1,
      "download_count": 0,
      "vote_count": 0,
      "created_at": "2025-10-05T00:56:37.109Z"
    }
  ]
}
```

### Test Cases

- View datasets from another user - See only public ones
- View own datasets (with auth) - See all (public, private, pending)
- Non-existent user - 404 error

---

## T6: Request Approval (HU6)

### Request

```
PATCH {{base_url}}/api/datasets/dhodgkin_20251005_001/review-request
Authorization: Bearer {{user_token}}
```

### Expected Response [200]

```json
{
  "success": true,
  "message": "Dataset is pending approval. An administrator will review it soon.",
  "status": "pending"
}
```

### Test Cases

- Request approval for own pending dataset - Success
- Request approval for someone else's dataset - 403 error
- Request approval for already approved dataset - 400 error

---

## T7: Toggle Visibility (HU7)

### T7.1: Make dataset public (only if approved)

**Request**:

```
PATCH {{base_url}}/api/datasets/erickhernandez_20250101_001/visibility
Authorization: Bearer {{user_token}}
Content-Type: application/json
```

**Body**:

```json
{
  "is_public": true
}
```

**Expected Response [200]**:

```json
{
  "success": true,
  "message": "Dataset is now public",
  "is_public": true
}
```

### T7.2: Try to make pending dataset public

**Expected Response [400]**:

```json
{
  "success": false,
  "error": "Only approved datasets can be made public"
}
```

### T7.3: Make dataset private

**Body**:

```json
{
  "is_public": false
}
```

**Expected Response [200]**:

```json
{
  "success": true,
  "message": "Dataset is now private",
  "is_public": false
}
```

---

## T8: Clone Dataset (HU18)

### Request

```
POST {{base_url}}/api/datasets/erickhernandez_20250101_001/clone
Authorization: Bearer {{user_token}}
```

### Expected Response [201]

```json
{
  "success": true,
  "message": "Dataset cloned successfully",
  "dataset": {
    "dataset_id": "dhodgkin_20251005_002",
    "dataset_name": "Global Sales Analysis 2024 (Clone)",
    "parent_dataset_id": "erickhernandez_20250101_001",
    "status": "pending",
    "file_count": 1
  }
}
```

### Test Cases

- Clone approved public dataset - Success
- Clone private dataset - 403 error
- Clone own dataset - 400 error
- Clone non-existent dataset - 404 error

### Notes

- Cloning creates complete copies of all files in CouchDB
- Clone starts with status='pending' (needs approval)
- Clone has new dataset_id and references parent

---

## T9: Delete Dataset (HU7)

### Request

```
DELETE {{base_url}}/api/datasets/dhodgkin_20251005_001
Authorization: Bearer {{user_token}}
```

### Expected Response [200]

```json
{
  "success": true,
  "message": "Dataset deleted successfully"
}
```

### Test Cases

- Delete own dataset - Success
- Admin delete any dataset - Success
- Delete someone else's dataset (non-admin) - 403 error
- Delete non-existent dataset - 404 error

### Notes

- Deletion is permanent and affects all 4 databases:
  - MongoDB: dataset document, votes, comments deleted
  - CouchDB: all files and header photo deleted
  - Neo4j: Dataset node and relationships deleted
  - Redis: counters deleted

---

## Notes for Testing

1. **File Upload**: Use actual CSV, JSON, or Excel files for data_files
2. **Image Upload**: Use JPG or PNG for header_photo
3. **Token Management**: Keep separate tokens for regular user and admin
4. **Database Verification**: After create/clone/delete, verify in all 4 databases
5. **Sequential Testing**: Some tests depend on previous ones (create before update)
