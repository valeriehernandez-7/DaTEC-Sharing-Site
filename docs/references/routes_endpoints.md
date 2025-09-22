# API Endpoints

| Route File              | Frontend URL                       | API Endpoint                               | Method | HU       | Auth              | Database(s)                     | Description                               |
| ----------------------- | ---------------------------------- | ------------------------------------------ | ------ | -------- | ----------------- | ------------------------------- | ----------------------------------------- |
| **AUTHENTICATION**      |
| auth.routes.js          | `/login`                           | `/api/auth/login`                          | POST   | #1       | No                | Mongo                           | Login → JWT token                         |
| auth.routes.js          | `/register`                        | `/api/auth/register`                       | POST   | #1       | No                | Mongo + Neo4j + CouchDB         | User registration with optional avatar    |
| auth.routes.js          | `/profile`                         | `/api/auth/:username`                      | GET    | #1       | Yes               | Mongo                           | Current user info                         |
| **USERS**               |
| users.routes.js         | `/users`                           | `/api/users`                               | GET    | #14      | No                | Mongo                           | List users                                |
| users.routes.js         | `/search`                          | `/api/users/search?q=term`                 | GET    | #14      | No                | Mongo                           | Search users                              |
| users.routes.js         | `/:username`                       | `/api/users/:username`                     | GET    | #4, #14  | No                | Mongo                           | Public profile                            |
| users.routes.js         | `/:username/settings`              | `/api/users/:username`                     | PUT    | #4       | Yes (owner)       | Mongo + CouchDB                 | Edit profile + avatar                     |
| users.routes.js         | `/:username`                       | `/api/users/:username/datasets`            | GET    | #12      | No\*              | Mongo                           | User's datasets                           |
| users.routes.js         | `/:username`                       | `/api/users/:username/followers`           | GET    | #20      | No                | Neo4j                           | Followers list                            |
| users.routes.js         | `/:username`                       | `/api/users/:username/following`           | GET    | #19      | No                | Neo4j                           | Following list                            |
| users.routes.js         | `/:username`                       | `/api/users/:username/follow`              | POST   | #19      | Yes               | Neo4j + Redis                   | Follow user                               |
| users.routes.js         | `/:username`                       | `/api/users/:username/follow`              | DELETE | #19      | Yes               | Neo4j                           | Unfollow user                             |
| **DATASETS**            |
| datasets.routes.js      | `/`                                | `/api/datasets`                            | GET    | #9, #10  | No                | Mongo                           | List public datasets                      |
| datasets.routes.js      | `/create`                          | `/api/datasets`                            | POST   | #5       | Yes               | Mongo + CouchDB + Neo4j + Redis | Create dataset (multipart)                |
| datasets.routes.js      | `/search`                          | `/api/datasets/search?q=term`              | GET    | #9       | No                | Mongo                           | Search datasets                           |
| datasets.routes.js      | `/:username/:datasetName`          | `/api/datasets/:datasetId`                 | GET    | #10, #11 | No\*              | Mongo                           | Complete details                          |
| datasets.routes.js      | `/:username/:datasetName`          | `/api/datasets/:datasetId/files`           | GET    | #10      | Yes               | CouchDB + Neo4j + Redis         | List dataset files                        |
| datasets.routes.js      | `/:username/:datasetName/edit`     | `/api/datasets/:datasetId`                 | PUT    | #7       | Yes (owner)       | Mongo + CouchDB                 | Edit metadata/files                       |
| datasets.routes.js      | `/:username/:datasetName/edit`     | `/api/datasets/:datasetId`                 | DELETE | #7       | Yes (owner/admin) | All 4 DBs                       | Delete dataset                            |
| datasets.routes.js      | `/:username/:datasetName/edit`     | `/api/datasets/:datasetId/visibility`      | PATCH  | #7       | Yes (owner)       | Mongo                           | Toggle public/private                     |
| datasets.routes.js      | `/:username/:datasetName/review`   | `/api/datasets/:datasetId/review`          | PATCH  | #6       | Yes (owner)       | Mongo                           | Request approval (status=pending)         |
| datasets.routes.js      | `/:username/:datasetName/clone`    | `/api/datasets/:datasetId/clone`           | POST   | #18      | Yes               | All 4 DBs                       | Clone dataset                             |
| datasets.routes.js      | `/:username/:datasetName/stats`    | `/api/datasets/:datasetId/downloads`       | GET    | #13      | Yes (owner)       | Neo4j + Mongo                   | Dataset downloads stats                   |
| datasets.routes.js      | `/:username/:datasetName/download` | `/api/datasets/:datasetId/files/:fileId`   | GET    | #13      | Yes               | CouchDB + Neo4j + Redis         | Download file                             |
| **COMMENTS**            |
| comments.routes.js      | `/:username/:datasetName`          | `/api/datasets/:datasetId/comments`        | GET    | #15      | No                | Mongo                           | Comment tree                              |
| comments.routes.js      | `/:username/:datasetName`          | `/api/datasets/:datasetId/comments`        | POST   | #15      | Yes               | Mongo                           | Create comment/reply                      |
| **VOTES**               |
| votes.routes.js         | `/:username/:datasetName`          | `/api/datasets/:datasetId/votes`           | GET    | #17      | No                | Mongo                           | List voters                               |
| votes.routes.js         | `/:username/:datasetName`          | `/api/datasets/:datasetId/votes`           | POST   | #17      | Yes               | Mongo + Redis                   | Vote dataset                              |
| votes.routes.js         | `/:username/:datasetName`          | `/api/datasets/:datasetId/votes`           | DELETE | #17      | Yes               | Mongo + Redis                   | Remove vote                               |
| votes.routes.js         | `/:username/:datasetName`          | `/api/datasets/:datasetId/votes/:username` | GET    | #17      | Yes               | Mongo                           | Check if user voted                       |
| **MESSAGES**            |
| messages.routes.js      | `/:username/messages`              | `/api/messages/:fromUsername/:toUser`      | GET    | #21      | Yes               | Mongo                           | Thread with user                          |
| messages.routes.js      | `/:username/messages`              | `/api/messages/:fromUsername/:toUser`      | POST   | #21      | Yes               | Mongo                           | Send message to user                      |
| **NOTIFICATIONS**       |
| notifications.routes.js | `/notifications`                   | `/api/notifications/:username`             | GET    | #8, #19  | Yes               | Redis                           | User notifications                        |
| **ADMIN**               |
| admin.routes.js         | `/admin/datasets`                  | `/api/admin/datasets/`                     | GET    | #8       | Yes (admin)       | Mongo                           | Pending datasets                          |
| admin.routes.js         | `/admin/datasets/review`           | `/api/admin/datasets/:id`                  | PATCH  | #8       | Yes (admin)       | Mongo + Redis                   | Approve/reject (status=\*) + notification |
| admin.routes.js         | `/admin/users`                     | `/api/admin/users/:username/promote`       | PATCH  | #3       | Yes (admin)       | Mongo                           | Promote to admin (is_admin=true\false)    |
| comments.routes.js      | `/admin/comments/`                 | `/api/comments/:commentId`                 | PATCH  | #16      | Yes (admin)       | Mongo                           | Soft delete (is_active=false)             |

**Notes**:

- `*` = Some actions require authentication
- `owner` = Resource owner only
- `admin` = Administrators only
- **All 4 DBs** = Operation affects MongoDB, CouchDB, Neo4j, and Redis
- **Multipart** = Form-data with file uploads
