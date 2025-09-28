# DaTEC Development Workflow v2 - 4 Days MVP

## 📋 Información del Proyecto

**Recursos disponibles:**
- Windows 10, 16GB RAM
- Docker: MongoDB 8.0 (replica set), Redis 8-alpine (primary-replica)
- Local: Neo4j Desktop 2.0.4, CouchDB 3.5.0
- Node.js v22.20.0, npm 11.6.1
- IDEs: JetBrains, VSCode
- Tools: Postman, Git

**Estado actual:**
✅ Databases configuradas y corriendo
✅ Scripts de setup ejecutados exitosamente
✅ Sample data cargada (4 usuarios, 2 datasets)
✅ Indexes creados
✅ Replica sets funcionando

---

## 🗂️ Project Structure v2

```
DaTEC-Sharing-Site/
├── backend/
│   ├── config/
│   │   └── databases.js              # Connections to 4 DBs (reuse from setup-*.js)
│   │
│   ├── utils/
│   │   ├── couchdb-manager.js        # Generic file upload/delete (HU1,4,5,18)
│   │   ├── redis-counters.js         # Generic increment/decrement (HU13,17)
│   │   ├── neo4j-relations.js        # Generic relationship CRUD (HU13,19)
│   │   ├── notifications.js          # Generic notification sender (HU8,19)
│   │   ├── id-generators.js          # UUIDs + dataset_id format
│   │   └── validators.js             # Joi schemas (reusable)
│   │
│   ├── middleware/
│   │   ├── auth.js                   # verifyToken, verifyAdmin
│   │   ├── upload.js                 # Multer configs (avatar, files, photos)
│   │   └── errorHandler.js           # Centralized error handling
│   │
│   ├── controllers/
│   │   ├── auth.controller.js        # HU1, HU2 (register, login)
│   │   ├── user.controller.js        # HU3, HU4, HU14, HU19, HU20
│   │   ├── dataset.controller.js     # HU5,6,7,9,10,11,12,13,18
│   │   ├── comment.controller.js     # HU15, HU16
│   │   ├── vote.controller.js        # HU17
│   │   ├── message.controller.js     # HU21
│   │   ├── notification.controller.js # Get notifications
│   │   └── admin.controller.js       # HU8 (approve/reject)
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── dataset.routes.js
│   │   ├── comment.routes.js
│   │   ├── vote.routes.js
│   │   ├── message.routes.js
│   │   ├── notification.routes.js
│   │   └── admin.routes.js
│   │
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   │   └── default-avatar.jpg        # Default images
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   └── main.css              # Tailwind directives
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.vue            # Global navigation
│   │   │   ├── DatasetCard.vue       # Reusable card (HU9,10,12)
│   │   │   ├── CommentThread.vue     # Recursive comments (HU15)
│   │   │   └── LoadingSpinner.vue    # Reusable spinner
│   │   │
│   │   ├── views/
│   │   │   ├── Login.vue             # HU1
│   │   │   ├── Register.vue          # HU1
│   │   │   ├── Home.vue              # HU9 (list datasets)
│   │   │   ├── DatasetDetail.vue     # HU10,11,13,15,17
│   │   │   ├── DatasetCreate.vue     # HU5
│   │   │   ├── Profile.vue           # HU4,12,19,20
│   │   │   ├── Search.vue            # HU9,14
│   │   │   ├── Messages.vue          # HU21
│   │   │   ├── Notifications.vue     # Show notifications
│   │   │   └── AdminPanel.vue        # HU8,16
│   │   │
│   │   ├── services/
│   │   │   └── api.js                # Axios instance + all endpoints
│   │   │
│   │   ├── router/
│   │   │   └── index.js              # Vue Router config
│   │   │
│   │   ├── App.vue
│   │   └── main.js
│   │
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── docs/
    ├── API.md                        # Endpoint documentation
    └── SETUP.md                      # How to run project
```

---

## 🔍 Análisis de HUs: Patrones y Dependencias

### 📦 Grupo 1: Authentication & User Management
**HUs**: 1, 2, 3, 4, 14

**Patrón común**: CRUD en MongoDB + File upload opcional (CouchDB)

| HU | Descripción | Dependencias | DBs | Patrón |
|----|-------------|--------------|-----|---------|
| **HU1** | Register + Login | Ninguna | Mongo + Neo4j + CouchDB (avatar opcional) | **Base pattern**: Create user |
| **HU2** | Admin seed | Ninguna | Mongo | **Pre-loaded**: Ya existe en setup-mongo.js |
| **HU3** | Promote to admin | HU1 | Mongo | **Simple update**: Toggle `is_admin` field |
| **HU4** | Edit profile | HU1 | Mongo + CouchDB (avatar opcional) | **Reuse HU1**: Same upload logic |
| **HU14** | Search users | HU1 | Mongo | **MongoDB text search**: Reuse pattern HU9 |

**Algoritmo compartido**:
```javascript
// utils/couchdb-manager.js - Usado en HU1, HU4, HU5, HU18
async function uploadFile(docId, file, metadata) {
  // 1. Validate file (size, type)
  // 2. Create CouchDB document with metadata
  // 3. Attach file buffer
  // 4. Return reference object { couchdb_document_id, file_name, file_size_bytes, mime_type }
}
```

**Condiciones de implementación**:
- HU2: ✅ **Ya implementado** en setup-mongo.js (skip)
- HU1 primero → HU4 reutiliza upload
- HU3: Solo 1 endpoint PATCH con toggle
- HU14: Copiar lógica de HU9 cambiando collection

---

### 📊 Grupo 2: Dataset Core Operations
**HUs**: 5, 6, 7, 9, 10, 11, 12, 18

**Patrón común**: MongoDB metadata + CouchDB files + Neo4j node + Redis counters

| HU | Descripción | Dependencias | DBs | Patrón |
|----|-------------|--------------|-----|---------|
| **HU5** | Create dataset | HU1 | 4 DBs | **Master pattern**: Full creation flow |
| **HU6** | Request approval | HU5 | Mongo | **Simple update**: status='pending' |
| **HU7** | Deactivate/Delete | HU5 | 4 DBs | **Reverse HU5**: Cleanup all DBs |
| **HU9** | Search datasets | HU5 | Mongo | **MongoDB text search** |
| **HU10** | View dataset info | HU5 | Mongo | **Simple query**: Read only |
| **HU11** | Video tutorials | HU5 | Mongo | **Validation only**: Store URL |
| **HU12** | User's datasets | HU5 | Mongo | **Query filter**: owner_user_id |
| **HU18** | Clone dataset | HU5 | 4 DBs | **Copy HU5**: Duplicate files + metadata |

**Algoritmo compartido**:
```javascript
// HU5 + HU18 share 90% logic
async function createDatasetFlow(userId, metadata, files, isClone = false, parentId = null) {
  // 1. Generate dataset_id
  // 2. Upload files to CouchDB (loop uploadFile)
  // 3. Insert MongoDB document
  // 4. Create Neo4j node
  // 5. Initialize Redis counters
  // 6. If isClone: set parent_dataset_id
}
```

**Condiciones de implementación**:
- HU5 es base → Implementar primero con todos los DBs
- HU6: Solo 1 línea `updateOne({ status: 'pending' })`
- HU7: Loop reverso de HU5 (delete en cada DB)
- HU9: Text index ya creado en setup-mongo.js
- HU10: Solo GET, sin lógica compleja
- HU11: Validar URL con regex, guardar en `tutorial_video_ref`
- HU12: Query con filtro + privacy logic
- HU18: Llamar `createDatasetFlow(..., true, parentId)`

---

### 👥 Grupo 3: Social Features
**HUs**: 13, 17, 19, 20

**Patrón común**: Neo4j relationships + Redis counters

| HU | Descripción | Dependencias | DBs | Patrón |
|----|-------------|--------------|-----|---------|
| **HU13** | Download tracking | HU5 | Neo4j + Redis + CouchDB | **Pattern A**: Create relationship + increment |
| **HU17** | Vote dataset | HU5 | Mongo + Redis | **Pattern A**: Insert vote + increment |
| **HU19** | Follow user | HU1 | Neo4j + Redis | **Pattern A**: Create relationship + notify |
| **HU20** | View followers | HU19 | Neo4j | **Query only**: Read relationships |

**Algoritmo compartido**:
```javascript
// utils/neo4j-relations.js - Usado en HU13, HU19
async function createRelationship(fromId, toId, relType, props) {
  // MATCH (a {id: $fromId}), (b {id: $toId})
  // CREATE (a)-[r:RELTYPE props]->(b)
}

// utils/redis-counters.js - Usado en HU13, HU17
async function incrementCounter(key) {
  // INCR key
}
async function decrementCounter(key) {
  // DECR key (ensure >= 0)
}
```

**Condiciones de implementación**:
- HU13 y HU17: **Lógica casi idéntica**
  - HU13: Neo4j DOWNLOADED + Redis INCR
  - HU17: Mongo vote + Redis INCR/DECR
- HU19: Reutiliza `createRelationship()` + `sendNotification()`
- HU20: Solo query Neo4j, 5 líneas de código

---

### 💬 Grupo 4: Comments & Messages
**HUs**: 15, 16, 21

**Patrón común**: MongoDB CRUD con validaciones simples

| HU | Descripción | Dependencias | DBs | Patrón |
|----|-------------|--------------|-----|---------|
| **HU15** | Comments + replies | HU5 | Mongo | **Recursive structure**: parent_comment_id |
| **HU16** | Disable comment | HU15 | Mongo | **Soft delete**: is_active=false |
| **HU21** | Private messages | HU1 | Mongo | **Simple CRUD**: from/to users |

**Condiciones de implementación**:
- HU15: Validar max depth (5 niveles) antes de insert
- HU16: Solo 1 línea `updateOne({ is_active: false })`
- HU21: CRUD estándar, sin complejidad

---

### 🔒 Grupo 5: Admin Operations
**HUs**: 8

**Patrón común**: Update + Notification

| HU | Descripción | Dependencias | DBs | Patrón |
|----|-------------|--------------|-----|---------|
| **HU8** | Approve/Reject dataset | HU5 | Mongo + Redis | **Update status** + notify owner |

**Algoritmo compartido**:
```javascript
// Reusa utils/notifications.js (creado para HU19)
async function sendNotification(userId, notification) {
  // LPUSH notifications:user:{userId} JSON.stringify(notification)
}
```

**Condiciones de implementación**:
- Usa `sendNotification()` ya creado en HU19
- Update simple en MongoDB
- Query datasets con `status='pending'`

---

## 📅 Workflow de 4 Días

### **Día 1: Utilities + Auth + User CRUD (7-8 horas)**

#### Objetivos:
✅ Crear todos los helpers reutilizables
✅ Implementar HU1, HU2, HU3, HU4, HU14

#### Tasks:

**1. Backend Setup (30 min)**
```bash
cd backend
npm init -y
npm install express jsonwebtoken bcryptjs multer joi cors dotenv
npm install mongodb redis neo4j-driver nano
npm install --save-dev nodemon

# package.json scripts:
"dev": "nodemon server.js"
"start": "node server.js"
```

**2. Database Connections (45 min)**
```javascript
// config/databases.js
// Copiar lógica de setup-mongo.js, setup-redis.js, setup-neo4j.js, setup-couchdb.js
// Export: connectMongo(), connectRedis(), connectNeo4j(), connectCouchDB()
```

**3. Utilities - Prioridad Alta (2.5 horas)**

**a) CouchDB Manager** (45 min)
```javascript
// utils/couchdb-manager.js
/**
 * Upload file to CouchDB
 * Used by: HU1 (avatar), HU4 (avatar), HU5 (files), HU18 (clone files)
 */
async function uploadFile(docId, file, metadata) {
  // Validate file size/type
  // Create document with metadata + attachment
  // Return reference object
}

async function deleteFile(docId) {
  // Delete CouchDB document
}

async function getFileUrl(docId, filename) {
  // Return http://localhost:5984/datec/{docId}/{filename}
}
```

**b) Redis Counters** (30 min)
```javascript
// utils/redis-counters.js
/**
 * Generic counter operations
 * Used by: HU13 (downloads), HU17 (votes)
 */
async function incrementCounter(key) {
  // INCR in Redis primary
}

async function decrementCounter(key) {
  // DECR in Redis primary (ensure >= 0)
}

async function getCounter(key) {
  // GET from Redis replica
}

async function initCounter(key, value = 0) {
  // SET key value NX
}
```

**c) Neo4j Relations** (45 min)
```javascript
// utils/neo4j-relations.js
/**
 * Generic relationship manager
 * Used by: HU13 (DOWNLOADED), HU19 (FOLLOWS)
 */
async function createRelationship(fromId, toId, relType, props) {
  // MATCH (a), (b) CREATE (a)-[r:TYPE props]->(b)
}

async function deleteRelationship(fromId, toId, relType) {
  // MATCH (a)-[r:TYPE]->(b) DELETE r
}

async function getRelationships(nodeId, relType, direction) {
  // direction: 'outgoing' | 'incoming' | 'both'
}

async function relationshipExists(fromId, toId, relType) {
  // Return boolean
}
```

**d) Notifications** (30 min)
```javascript
// utils/notifications.js
/**
 * Generic notification sender
 * Used by: HU8 (approval), HU19 (follow/new dataset)
 */
async function sendNotification(userId, notification) {
  // LPUSH notifications:user:{userId} JSON.stringify(notification)
  // LTRIM to keep last 50
}

async function getNotifications(userId, limit = 50) {
  // LRANGE notifications:user:{userId} 0 limit-1
}
```

**e) ID Generators** (15 min)
```javascript
// utils/id-generators.js
const { v5: uuidv5 } = require('uuid');

function generateUserId(username, email) {
  // UUID v5 based on username+email
}

async function generateDatasetId(username) {
  // Format: {username}_{YYYYMMDD}_{sequence}
  // Query MongoDB to find max sequence for today
}

function generateCommentId(datasetId) {
  // Format: cmt_{datasetId}_{timestamp}_{random}
}

function generateVoteId(datasetId, userId) {
  // Format: vote_{datasetId}_user_{userId}
}
```

**f) Validators** (15 min)
```javascript
// utils/validators.js
const Joi = require('joi');

const userSchema = Joi.object({
  username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/).required(),
  email_address: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  full_name: Joi.string().min(1).required(),
  birth_date: Joi.date().max('now').required()
});

const datasetSchema = Joi.object({
  dataset_name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(5000).required(),
  tags: Joi.array().items(Joi.string()),
  tutorial_video_url: Joi.string().uri().pattern(/(youtube|vimeo)/)
});

// Export all schemas
```

**4. Middleware (45 min)**

**a) Auth Middleware**
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  // Extract token from Authorization header
  // Verify with JWT_SECRET
  // Attach req.user = { userId, username, isAdmin }
}

function verifyAdmin(req, res, next) {
  // Check req.user.isAdmin === true
}
```

**b) Upload Middleware**
```javascript
// middleware/upload.js
const multer = require('multer');

const storage = multer.memoryStorage();

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
}).single('avatar');

const uploadDataFiles = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB
}).array('data_files', 10);

const uploadHeaderPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('header_photo');
```

**c) Error Handler**
```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  
  const status = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(status).json({
    success: false,
    error: message
  });
}
```

**5. Auth Controller - HU1, HU2 (1 hora)**

```javascript
// controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { uploadFile } = require('../utils/couchdb-manager');
const { generateUserId } = require('../utils/id-generators');
const { userSchema } = require('../utils/validators');

async function register(req, res) {
  // 1. Validate with Joi
  const { error } = userSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  
  // 2. Check age >= 15
  const age = calculateAge(req.body.birth_date);
  if (age < 15) return res.status(400).json({ error: 'Must be 15+' });
  
  // 3. Check duplicates (username, email)
  const exists = await db.users.findOne({
    $or: [
      { username: req.body.username },
      { email_address: req.body.email_address }
    ]
  });
  if (exists) return res.status(409).json({ error: 'User already exists' });
  
  // 4. Hash password
  const password_hash = await bcrypt.hash(req.body.password, 12);
  
  // 5. Generate UUID
  const user_id = generateUserId(req.body.username, req.body.email_address);
  
  // 6. Upload avatar if provided
  let avatar_ref = null;
  if (req.file) {
    avatar_ref = await uploadFile(
      `avatar_${user_id}`,
      req.file,
      { type: 'user_avatar', owner_user_id: user_id }
    );
  }
  
  // 7. Insert to MongoDB
  await db.users.insertOne({
    user_id,
    username: req.body.username,
    email_address: req.body.email_address,
    password_hash,
    full_name: req.body.full_name,
    birth_date: new Date(req.body.birth_date),
    avatar_ref,
    is_admin: false,
    created_at: new Date(),
    updated_at: new Date()
  });
  
  // 8. Create Neo4j node
  await neo4j.run(
    'CREATE (u:User {user_id: $user_id, username: $username})',
    { user_id, username: req.body.username }
  );
  
  // 9. Generate JWT
  const token = jwt.sign(
    { userId: user_id, username: req.body.username, isAdmin: false },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.status(201).json({
    success: true,
    token,
    user: { userId: user_id, username: req.body.username, isAdmin: false }
  });
}

async function login(req, res) {
  // 1. Find user
  const user = await db.users.findOne({ username: req.body.username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  // 2. Compare password
  const valid = await bcrypt.compare(req.body.password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  
  // 3. Generate JWT
  const token = jwt.sign(
    { userId: user.user_id, username: user.username, isAdmin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({
    success: true,
    token,
    user: { 
      userId: user.user_id, 
      username: user.username, 
      fullName: user.full_name,
      isAdmin: user.is_admin 
    }
  });
}
```

**6. User Controller - HU3, HU4, HU14 (1 hora)**

```javascript
// controllers/user.controller.js

// HU3 - Promote to admin
async function promoteUser(req, res) {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  
  const user = await db.users.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Toggle is_admin
  const newStatus = !user.is_admin;
  await db.users.updateOne(
    { username: req.params.username },
    { $set: { is_admin: newStatus, updated_at: new Date() } }
  );
  
  res.json({ success: true, isAdmin: newStatus });
}

// HU4 - Edit profile (reuses uploadFile from HU1)
async function updateUser(req, res) {
  if (req.user.username !== req.params.username) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const updates = {};
  if (req.body.full_name) updates.full_name = req.body.full_name;
  if (req.body.birth_date) updates.birth_date = new Date(req.body.birth_date);
  
  // Upload new avatar if provided
  if (req.file) {
    const user = await db.users.findOne({ username: req.params.username });
    
    // Delete old avatar
    if (user.avatar_ref) {
      await deleteFile(user.avatar_ref.couchdb_document_id);
    }
    
    // Upload new (reuse HU1 logic)
    updates.avatar_ref = await uploadFile(
      `avatar_${req.user.userId}`,
      req.file,
      { type: 'user_avatar', owner_user_id: req.user.userId }
    );
  }
  
  updates.updated_at = new Date();
  
  await db.users.updateOne(
    { username: req.params.username },
    { $set: updates }
  );
  
  res.json({ success: true });
}

// HU14 - Search users (reuse pattern from HU9)
async function searchUsers(req, res) {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  const users = await db.users.find({
    $text: { $search: query }
  }).limit(20).toArray();
  
  res.json({
    success: true,
    users: users.map(u => ({
      userId: u.user_id,
      username: u.username,
      fullName: u.full_name,
      avatarUrl: u.avatar_ref ? getFileUrl(u.avatar_ref.couchdb_document_id, u.avatar_ref.file_name) : null
    }))
  });
}

// Get user profile
async function getUser(req, res) {
  const user = await db.users.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  res.json({
    success: true,
    user: {
      userId: user.user_id,
      username: user.username,
      fullName: user.full_name,
      avatarUrl: user.avatar_ref ? getFileUrl(user.avatar_ref.couchdb_document_id, user.avatar_ref.file_name) : null,
      createdAt: user.created_at
    }
  });
}
```

**7. Routes Setup (30 min)**

```javascript
// routes/auth.routes.js
const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const { uploadAvatar } = require('../middleware/upload');

router.post('/register', uploadAvatar, controller.register);
router.post('/login', controller.login);

module.exports = router;
```

```javascript
// routes/user.routes.js
const router = require('express').Router();
const controller = require('../controllers/user.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

router.get('/search', controller.searchUsers);
router.get('/:username', controller.getUser);
router.put('/:username', verifyToken, uploadAvatar, controller.updateUser);
router.patch('/:username/promote', verifyToken, verifyAdmin, controller.promoteUser);

module.exports = router;
```

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to databases
const { connectMongo, connectRedis, connectNeo4j, connectCouchDB } = require('./config/databases');

(async () => {
  await connectMongo();
  await connectRedis();
  await connectNeo4j();
  await connectCouchDB();
  
  // Routes
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/users', require('./routes/user.routes'));
  
  // Error handler
  app.use(require('./middleware/errorHandler'));
  
  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
```

**8. Testing (30 min)**

```bash
# Start server
npm run dev

# Postman tests:
# 1. Register user with avatar
# 2. Login
# 3. Get profile
# 4. Update profile
# 5. Search users
# 6. Promote to admin (login as sudod4t3c first)
```

**Día 1 Checkpoint:**
✅ All utilities created and tested
✅ HU1, HU2, HU3, HU4, HU14 complete
✅ Auth working
✅ File upload working
✅ ~7-8 hours

---

### **Día 2: Datasets Complete + Social Basic (8-9 horas)**

#### Objetivos:
✅ Implementar HU5, HU6, HU7, HU8, HU9, HU10, HU11, HU12, HU13, HU17, HU18

#### Tasks:

**1. Dataset Controller - Core (HU5, HU18) (2.5 horas)**

```javascript
// controllers/dataset.controller.js

// HU5 - Create dataset (base function)
async function createDataset(req, res) {
  // 1. Validate
  const { error } = datasetSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  if (!req.files || !req.files.data_files || req.files.data_files.length === 0) {
    return res.status(400).json({ error: 'At least one data file required' });
  }
  
  // 2. Generate dataset_id
  const dataset_id = await generateDatasetId(req.user.username);
  
  // 3. Upload data files to CouchDB (reuse utility)
  const file_references = [];
  for (let i = 0; i < req.files.data_files.length; i++) {
    const file = req.files.data_files[i];
    const fileRef = await uploadFile(
      `file_${dataset_id}_${String(i + 1).padStart(3, '0')}`,
      file,
      {
        type: 'dataset_file',
        owner_user_id: req.user.userId,
        dataset_id,
        uploaded_at: new Date()
      }
    );
    file_references.push({
      ...fileRef,
      uploaded_at: new Date()
    });
  }
  
  // 4. Upload header photo if provided (reuse utility)
  let header_photo_ref = null;
  if (req.files.header_photo && req.files.header_photo[0]) {
    header_photo_ref = await uploadFile(
      `photo_${dataset_id}_header`,
      req.files.header_photo[0],
      {
        type: 'header_photo',
        owner_user_id: req.user.userId,
        dataset_id
      }
    );
  }
  
  // 5. Parse video URL if provided
  let tutorial_video_ref = null;
  if (req.body.tutorial_video_url) {
    const url = req.body.tutorial_video_url;
    tutorial_video_ref = {
      url,
      platform: url.includes('youtube') ? 'youtube' : 'vimeo'
    };
  }
  
  // 6. Insert to MongoDB
  const dataset = {
    dataset_id,
    owner_user_id: req.user.userId,
    parent_dataset_id: null,
    dataset_name: req.body.dataset_name,
    description: req.body.description,
    tags: req.body.tags || [],
    status: 'pending',
    reviewed_at: null,
    admin_review: null,
    is_public: false,
    file_references,
    header_photo_ref,
    tutorial_video_ref,
    download_count: 0,
    vote_count: 0,
    comment_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  await db.datasets.insertOne(dataset);
  
  // 7. Create Neo4j node
  await neo4j.run(
    'CREATE (d:Dataset {dataset_id: $dataset_id, dataset_name: $dataset_name})',
    { dataset_id, dataset_name: req.body.dataset_name }
  );
  
  // 8. Initialize Redis counters (reuse utility)
  await initCounter(`download_count:dataset:${dataset_id}`, 0);
  await initCounter(`vote_count:dataset:${dataset_id}`, 0);
  
  res.status(201).json({
    success: true,
    dataset: { dataset_id, dataset_name: req.body.dataset_name, status: 'pending' }
  });
}

// HU18 - Clone dataset (reuses 90% of HU5 logic)
async function cloneDataset(req, res) {
  const originalId = req.params.datasetId;
  
  // 1. Get original dataset
  const original = await db.datasets.findOne({
    dataset_id: originalId,
    status: 'approved',
    is_public: true
  });
  
  if (!original) {
    return res.status(403).json({ error: 'Dataset not available for cloning' });
  }
  
  // 2. Generate new dataset_id
  const cloned_dataset_id = await generateDatasetId(req.user.username);
  
  // 3. Clone files in CouchDB
  const cloned_file_references = [];
  for (let i = 0; i < original.file_references.length; i++) {
    const fileRef = original.file_references[i];
    
    // Get original document with attachment
    const originalDoc = await couchdb.get(fileRef.couchdb_document_id, { attachments: true });
    
    // Create new document with same attachment
    const newDocId = `file_${cloned_dataset_id}_${String(i + 1).padStart(3, '0')}`;
    await couchdb.insert({
      _id: newDocId,
      type: 'dataset_file',
      owner_user_id: req.user.userId,
      dataset_id: cloned_dataset_id,
      uploaded_at: new Date().toISOString(),
      _attachments: originalDoc._attachments
    });
    
    cloned_file_references.push({
      couchdb_document_id: newDocId,
      file_name: fileRef.file_name,
      file_size_bytes: fileRef.file_size_bytes,
      mime_type: fileRef.mime_type,
      uploaded_at: new Date()
    });
  }
  
  // 4. Clone header photo if exists
  let cloned_header_ref = null;
  if (original.header_photo_ref) {
    const originalHeader = await couchdb.get(
      original.header_photo_ref.couchdb_document_id,
      { attachments: true }
    );
    
    const newHeaderId = `photo_${cloned_dataset_id}_header`;
    await couchdb.insert({
      _id: newHeaderId,
      type: 'header_photo',
      owner_user_id: req.user.userId,
      dataset_id: cloned_dataset_id,
      uploaded_at: new Date().toISOString(),
      _attachments: originalHeader._attachments
    });
    
    cloned_header_ref = {
      couchdb_document_id: newHeaderId,
      file_name: original.header_photo_ref.file_name,
      file_size_bytes: original.header_photo_ref.file_size_bytes,
      mime_type: original.header_photo_ref.mime_type
    };
  }
  
  // 5. Insert cloned dataset to MongoDB
  const clonedDataset = {
    dataset_id: cloned_dataset_id,
    owner_user_id: req.user.userId,
    parent_dataset_id: originalId, // Link to parent
    dataset_name: `${original.dataset_name} (Clone)`,
    description: original.description,
    tags: original.tags,
    status: 'pending', // Must be approved independently
    reviewed_at: null,
    admin_review: null,
    is_public: false,
    file_references: cloned_file_references,
    header_photo_ref: cloned_header_ref,
    tutorial_video_ref: original.tutorial_video_ref, // URLs can be reused
    download_count: 0,
    vote_count: 0,
    comment_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  await db.datasets.insertOne(clonedDataset);
  
  // 6. Create Neo4j node
  await neo4j.run(
    'CREATE (d:Dataset {dataset_id: $dataset_id, dataset_name: $dataset_name})',
    { dataset_id: cloned_dataset_id, dataset_name: clonedDataset.dataset_name }
  );
  
  // 7. Initialize Redis counters
  await initCounter(`download_count:dataset:${cloned_dataset_id}`, 0);
  await initCounter(`vote_count:dataset:${cloned_dataset_id}`, 0);
  
  res.status(201).json({
    success: true,
    dataset: {
      dataset_id: cloned_dataset_id,
      parent_dataset_id: originalId,
      status: 'pending'
    }
  });
}
```

**2. Dataset Workflow (HU6, HU7, HU8) (1.5 horas)**

```javascript
// HU6 - Request approval (simple update)
async function requestApproval(req, res) {
  const dataset = await db.datasets.findOne({ dataset_id: req.params.datasetId });
  
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  if (dataset.owner_user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (dataset.status !== 'pending') {
    return res.status(400).json({ error: 'Dataset already reviewed' });
  }
  
  // Status is already 'pending', just confirm
  res.json({ success: true, message: 'Approval requested' });
}

// HU7 - Toggle visibility (simple update)
async function toggleVisibility(req, res) {
  const dataset = await db.datasets.findOne({ dataset_id: req.params.datasetId });
  
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  if (dataset.owner_user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (dataset.status !== 'approved') {
    return res.status(400).json({ error: 'Can only make approved datasets public' });
  }
  
  const newStatus = req.body.is_public;
  await db.datasets.updateOne(
    { dataset_id: req.params.datasetId },
    { $set: { is_public: newStatus, updated_at: new Date() } }
  );
  
  res.json({ success: true, is_public: newStatus });
}

// HU7 - Delete dataset (cleanup all 4 DBs)
async function deleteDataset(req, res) {
  const dataset = await db.datasets.findOne({ dataset_id: req.params.datasetId });
  
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  
  // Only owner or admin can delete
  if (dataset.owner_user_id !== req.user.userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const datasetId = req.params.datasetId;
  
  // 1. Delete from MongoDB
  await db.datasets.deleteOne({ dataset_id: datasetId });
  
  // 2. Delete files from CouchDB
  for (const fileRef of dataset.file_references) {
    await deleteFile(fileRef.couchdb_document_id);
  }
  if (dataset.header_photo_ref) {
    await deleteFile(dataset.header_photo_ref.couchdb_document_id);
  }
  
  // 3. Delete Neo4j node (DETACH DELETE removes relationships too)
  await neo4j.run(
    'MATCH (d:Dataset {dataset_id: $dataset_id}) DETACH DELETE d',
    { dataset_id: datasetId }
  );
  
  // 4. Delete Redis counters
  await redis.primary.del(`download_count:dataset:${datasetId}`);
  await redis.primary.del(`vote_count:dataset:${datasetId}`);
  
  res.json({ success: true, message: 'Dataset deleted' });
}
```

```javascript
// controllers/admin.controller.js

// HU8 - Approve/Reject dataset (reuse notification utility)
async function reviewDataset(req, res) {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  
  const { action, admin_review } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  const dataset = await db.datasets.findOne({ dataset_id: req.params.id });
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  if (dataset.status !== 'pending') {
    return res.status(400).json({ error: 'Dataset already reviewed' });
  }
  
  // Update status
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  await db.datasets.updateOne(
    { dataset_id: req.params.id },
    {
      $set: {
        status: newStatus,
        reviewed_at: new Date(),
        admin_review: admin_review || null,
        updated_at: new Date()
      }
    }
  );
  
  // Send notification to owner (reuse utility from HU19)
  await sendNotification(dataset.owner_user_id, {
    type: action === 'approve' ? 'dataset_approved' : 'dataset_rejected',
    dataset_id: dataset.dataset_id,
    dataset_name: dataset.dataset_name,
    admin_review: admin_review || null,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true, status: newStatus });
}

// List pending datasets
async function listPendingDatasets(req, res) {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  
  const datasets = await db.datasets.find({ status: 'pending' })
    .sort({ created_at: 1 }) // Oldest first
    .toArray();
  
  res.json({ success: true, datasets });
}
```

**3. Dataset Queries (HU9, HU10, HU11, HU12) (1.5 horas)**

```javascript
// HU9 - Search datasets (MongoDB text search)
async function searchDatasets(req, res) {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  const datasets = await db.datasets.find({
    $text: { $search: query },
    status: 'approved',
    is_public: true
  }).limit(50).toArray();
  
  res.json({ success: true, datasets });
}

// List public datasets
async function listDatasets(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const datasets = await db.datasets.find({
    status: 'approved',
    is_public: true
  })
  .sort({ created_at: -1 })
  .skip(skip)
  .limit(limit)
  .toArray();
  
  const total = await db.datasets.countDocuments({
    status: 'approved',
    is_public: true
  });
  
  res.json({
    success: true,
    datasets,
    pagination: {
      page,
      totalPages: Math.ceil(total / limit),
      totalCount: total
    }
  });
}

// HU10 - Get dataset details
async function getDataset(req, res) {
  const dataset = await db.datasets.findOne({ dataset_id: req.params.datasetId });
  
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  
  // Check permissions
  const isOwner = req.user && req.user.userId === dataset.owner_user_id;
  const isAdmin = req.user && req.user.isAdmin;
  const isPublic = dataset.status === 'approved' && dataset.is_public;
  
  if (!isPublic && !isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Add file URLs
  const datasetWithUrls = {
    ...dataset,
    file_references: dataset.file_references.map(f => ({
      ...f,
      download_url: getFileUrl(f.couchdb_document_id, f.file_name)
    })),
    header_photo_url: dataset.header_photo_ref 
      ? getFileUrl(dataset.header_photo_ref.couchdb_document_id, dataset.header_photo_ref.file_name)
      : null
  };
  
  res.json({ success: true, dataset: datasetWithUrls });
}

// HU12 - Get user's datasets
async function getUserDatasets(req, res) {
  // Find user
  const user = await db.users.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Build query
  const query = { owner_user_id: user.user_id };
  
  // If not owner or admin, only show approved + public
  const isOwner = req.user && req.user.userId === user.user_id;
  const isAdmin = req.user && req.user.isAdmin;
  
  if (!isOwner && !isAdmin) {
    query.status = 'approved';
    query.is_public = true;
  }
  
  const datasets = await db.datasets.find(query)
    .sort({ created_at: -1 })
    .toArray();
  
  res.json({ success: true, datasets });
}
```

**Note on HU11**: Tutorial videos are just URLs stored in `tutorial_video_ref`. No separate endpoint needed - included in dataset creation (HU5) and detail view (HU10).

**4. Social Features (HU13, HU17) (2 horas)**

```javascript
// HU13 - Download file (reuse Neo4j + Redis utilities)
async function downloadFile(req, res) {
  const { datasetId, fileId } = req.params;
  
  // Verify dataset is public
  const dataset = await db.datasets.findOne({
    dataset_id: datasetId,
    status: 'approved',
    is_public: true
  });
  
  if (!dataset) return res.status(403).json({ error: 'Dataset not available' });
  
  // Get file from CouchDB
  const fileRef = dataset.file_references.find(f => f.couchdb_document_id === fileId);
  if (!fileRef) return res.status(404).json({ error: 'File not found' });
  
  try {
    // Stream file from CouchDB
    const attachment = await couchdb.attachment.get('datec', fileId, fileRef.file_name);
    
    res.setHeader('Content-Type', fileRef.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${fileRef.file_name}"`);
    res.send(attachment);
    
    // After successful download, track it
    // 1. Create Neo4j relationship (reuse utility)
    await createRelationship(
      req.user.userId,
      datasetId,
      'DOWNLOADED',
      { downloaded_at: new Date().toISOString() }
    );
    
    // 2. Increment Redis counter (reuse utility)
    await incrementCounter(`download_count:dataset:${datasetId}`);
    
  } catch (err) {
    res.status(500).json({ error: 'Download failed' });
  }
}

// HU13 - Get download stats (owner only)
async function getDownloadStats(req, res) {
  const dataset = await db.datasets.findOne({ dataset_id: req.params.datasetId });
  
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  if (dataset.owner_user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Query Neo4j for download history (reuse utility)
  const result = await neo4j.run(`
    MATCH (u:User)-[d:DOWNLOADED]->(ds:Dataset {dataset_id: $datasetId})
    RETURN u.user_id AS userId, u.username AS username, d.downloaded_at AS downloadedAt
    ORDER BY d.downloaded_at DESC
  `, { datasetId: req.params.datasetId });
  
  const downloadHistory = result.records.map(r => ({
    userId: r.get('userId'),
    username: r.get('username'),
    downloadedAt: r.get('downloadedAt')
  }));
  
  // Get total from Redis (reuse utility)
  const totalDownloads = await getCounter(`download_count:dataset:${req.params.datasetId}`);
  
  res.json({
    success: true,
    totalDownloads,
    downloadHistory
  });
}
```

```javascript
// controllers/vote.controller.js

// HU17 - Add vote (similar pattern to HU13)
async function addVote(req, res) {
  const datasetId = req.params.datasetId;
  const userId = req.user.userId;
  
  // Verify dataset exists and is public
  const dataset = await db.datasets.findOne({
    dataset_id: datasetId,
    status: 'approved',
    is_public: true
  });
  
  if (!dataset) return res.status(403).json({ error: 'Dataset not available' });
  
  // Cannot vote own dataset
  if (dataset.owner_user_id === userId) {
    return res.status(400).json({ error: 'Cannot vote own dataset' });
  }
  
  // Check if already voted
  const existingVote = await db.votes.findOne({
    target_dataset_id: datasetId,
    user_id: userId
  });
  
  if (existingVote) {
    return res.status(409).json({ error: 'Already voted' });
  }
  
  // Insert vote
  const vote_id = generateVoteId(datasetId, userId);
  await db.votes.insertOne({
    vote_id,
    target_dataset_id: datasetId,
    user_id: userId,
    created_at: new Date()
  });
  
  // Increment Redis counter (reuse utility)
  await incrementCounter(`vote_count:dataset:${datasetId}`);
  
  res.status(201).json({ success: true, message: 'Vote added' });
}

// HU17 - Remove vote
async function removeVote(req, res) {
  const datasetId = req.params.datasetId;
  const userId = req.user.userId;
  
  const result = await db.votes.deleteOne({
    target_dataset_id: datasetId,
    user_id: userId
  });
  
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Vote not found' });
  }
  
  // Decrement Redis counter (reuse utility)
  await decrementCounter(`vote_count:dataset:${datasetId}`);
  
  res.json({ success: true, message: 'Vote removed' });
}

// Get votes
async function getVotes(req, res) {
  const datasetId = req.params.datasetId;
  
  const votes = await db.votes.find({ target_dataset_id: datasetId }).toArray();
  
  // Join with users
  const voters = await Promise.all(
    votes.map(async (v) => {
      const user = await db.users.findOne({ user_id: v.user_id });
      return {
        userId: v.user_id,
        username: user?.username,
        votedAt: v.created_at
      };
    })
  );
  
  // Get total from Redis
  const totalVotes = await getCounter(`vote_count:dataset:${datasetId}`);
  
  res.json({ success: true, totalVotes, voters });
}

// Check if user voted
async function checkUserVoted(req, res) {
  const datasetId = req.params.datasetId;
  const username = req.params.username;
  
  const user = await db.users.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const vote = await db.votes.findOne({
    target_dataset_id: datasetId,
    user_id: user.user_id
  });
  
  res.json({ success: true, hasVoted: !!vote });
}
```

**5. Routes Setup (30 min)**

```javascript
// routes/dataset.routes.js
const router = require('express').Router();
const controller = require('../controllers/dataset.controller');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');

// Multer for multiple file types
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', controller.listDatasets);
router.get('/search', controller.searchDatasets);
router.post('/', 
  verifyToken,
  upload.fields([
    { name: 'data_files', maxCount: 10 },
    { name: 'header_photo', maxCount: 1 }
  ]),
  controller.createDataset
);
router.get('/:datasetId', controller.getDataset);
router.patch('/:datasetId/visibility', verifyToken, controller.toggleVisibility);
router.patch('/:datasetId/review', verifyToken, controller.requestApproval);
router.delete('/:datasetId', verifyToken, controller.deleteDataset);
router.post('/:datasetId/clone', verifyToken, controller.cloneDataset);
router.get('/:datasetId/files/:fileId', verifyToken, controller.downloadFile);
router.get('/:datasetId/downloads', verifyToken, controller.getDownloadStats);

module.exports = router;
```

```javascript
// routes/vote.routes.js
const router = require('express').Router();
const controller = require('../controllers/vote.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/datasets/:datasetId/votes', controller.getVotes);
router.post('/datasets/:datasetId/votes', verifyToken, controller.addVote);
router.delete('/datasets/:datasetId/votes', verifyToken, controller.removeVote);
router.get('/datasets/:datasetId/votes/:username', verifyToken, controller.checkUserVoted);

module.exports = router;
```

```javascript
// routes/admin.routes.js
const router = require('express').Router();
const controller = require('../controllers/admin.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

router.get('/datasets', verifyToken, verifyAdmin, controller.listPendingDatasets);
router.patch('/datasets/:id', verifyToken, verifyAdmin, controller.reviewDataset);

module.exports = router;
```

```javascript
// Update server.js
app.use('/api/datasets', require('./routes/dataset.routes'));
app.use('/api', require('./routes/vote.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
```

**6. Testing (1 hora)**

Postman tests:
- Create dataset with multiple files + header photo + video URL
- Search datasets
- Get dataset details
- Clone dataset (verify in all 4 DBs)
- Download file (verify Neo4j + Redis)
- Vote dataset (verify MongoDB + Redis)
- Toggle vote
- Admin approve dataset
- Check notifications

**Día 2 Checkpoint:**
✅ HU5,6,7,8,9,10,11,12,13,17,18 complete
✅ Datasets fully functional
✅ Download + vote tracking working
✅ Admin panel working
✅ ~8-9 hours

---

### **Día 3: Social Complete + Comments + Frontend Base (8-9 horas)**

#### Objetivos:
✅ Implementar HU15, HU16, HU19, HU20, HU21
✅ Setup frontend base

#### Tasks:

**1. Follow System (HU19, HU20) (1.5 horas)**

```javascript
// Add to controllers/user.controller.js

// HU19 - Follow user (reuse Neo4j + notification utilities)
async function followUser(req, res) {
  const targetUsername = req.params.username;
  const followerId = req.user.userId;
  
  // Cannot follow self
  if (req.user.username === targetUsername) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  
  // Get target user
  const targetUser = await db.users.findOne({ username: targetUsername });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  // Check if already following (reuse utility)
  const exists = await relationshipExists(followerId, targetUser.user_id, 'FOLLOWS');
  if (exists) {
    return res.status(409).json({ error: 'Already following' });
  }
  
  // Create FOLLOWS relationship (reuse utility)
  await createRelationship(
    followerId,
    targetUser.user_id,
    'FOLLOWS',
    { followed_at: new Date().toISOString() }
  );
  
  // Send notification (reuse utility from HU8)
  await sendNotification(targetUser.user_id, {
    type: 'new_follower',
    from_user_id: followerId,
    from_username: req.user.username,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true, message: 'Following user' });
}

// HU19 - Unfollow user
async function unfollowUser(req, res) {
  const targetUsername = req.params.username;
  const followerId = req.user.userId;
  
  const targetUser = await db.users.findOne({ username: targetUsername });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  // Delete relationship (reuse utility)
  await deleteRelationship(followerId, targetUser.user_id, 'FOLLOWS');
  
  res.json({ success: true, message: 'Unfollowed user' });
}

// HU20 - Get followers
async function getFollowers(req, res) {
  const user = await db.users.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Query Neo4j (reuse utility)
  const result = await neo4j.run(`
    MATCH (follower:User)-[:FOLLOWS]->(user:User {user_id: $userId})
    RETURN follower.user_id AS userId, follower.username AS username
    ORDER BY username
  `, { userId: user.user_id });
  
  const followers = result.records.map(r => ({
    userId: r.get('userId'),
    username: r.get('username')
  }));
  
  res.json({ success: true, followers, count: followers.length });
}

// HU19 - Get following
async function getFollowing(req, res) {
  const user = await db.users.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const result = await neo4j.run(`
    MATCH (user:User {user_id: $userId})-[:FOLLOWS]->(followed:User)
    RETURN followed.user_id AS userId, followed.username AS username
    ORDER BY username
  `, { userId: user.user_id });
  
  const following = result.records.map(r => ({
    userId: r.get('userId'),
    username: r.get('username')
  }));
  
  res.json({ success: true, following, count: following.length });
}
```

```javascript
// Update routes/user.routes.js
router.get('/:username/followers', controller.getFollowers);
router.get('/:username/following', controller.getFollowing);
router.post('/:username/follow', verifyToken, controller.followUser);
router.delete('/:username/follow', verifyToken, controller.unfollowUser);
```

**2. Comments System (HU15, HU16) (2 horas)**

```javascript
// controllers/comment.controller.js

// HU15 - Add comment or reply
async function addComment(req, res) {
  const { content, parentCommentId } = req.body;
  const datasetId = req.params.datasetId;
  
  // Validate content
  if (!content || content.length < 1 || content.length > 2000) {
    return res.status(400).json({ error: 'Content must be 1-2000 characters' });
  }
  
  // Verify dataset exists and is public
  const dataset = await db.datasets.findOne({
    dataset_id: datasetId,
    status: 'approved',
    is_public: true
  });
  
  if (!dataset) return res.status(403).json({ error: 'Dataset not available' });
  
  // If replying, verify parent exists and is active
  if (parentCommentId) {
    const parent = await db.comments.findOne({
      comment_id: parentCommentId,
      is_active: true
    });
    
    if (!parent) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }
    
    // Check nesting depth (max 5 levels)
    const depth = await getCommentDepth(parentCommentId);
    if (depth >= 5) {
      return res.status(400).json({ error: 'Max nesting level reached' });
    }
  }
  
  // Generate comment_id
  const comment_id = generateCommentId(datasetId);
  
  // Insert comment
  const comment = {
    comment_id,
    target_dataset_id: datasetId,
    author_user_id: req.user.userId,
    parent_comment_id: parentCommentId || null,
    content,
    is_active: true,
    created_at: new Date()
  };
  
  await db.comments.insertOne(comment);
  
  // Increment dataset comment_count
  await db.datasets.updateOne(
    { dataset_id: datasetId },
    { $inc: { comment_count: 1 } }
  );
  
  res.status(201).json({ success: true, comment });
}

// Helper: Get comment nesting depth
async function getCommentDepth(commentId, currentDepth = 0) {
  const comment = await db.comments.findOne({ comment_id: commentId });
  
  if (!comment || !comment.parent_comment_id) {
    return currentDepth;
  }
  
  return getCommentDepth(comment.parent_comment_id, currentDepth + 1);
}

// HU15 - Get comments (build tree)
async function getComments(req, res) {
  const datasetId = req.params.datasetId;
  
  // Query based on user role
  const query = { target_dataset_id: datasetId };
  
  // Non-admin users only see active comments
  if (!req.user || !req.user.isAdmin) {
    query.is_active = true;
  }
  
  const comments = await db.comments.find(query)
    .sort({ created_at: 1 })
    .toArray();
  
  // Join with users to get author info
  const commentsWithAuthors = await Promise.all(
    comments.map(async (c) => {
      const author = await db.users.findOne({ user_id: c.author_user_id });
      return {
        ...c,
        author_username: author?.username,
        author_avatar: author?.avatar_ref 
          ? getFileUrl(author.avatar_ref.couchdb_document_id, author.avatar_ref.file_name)
          : null
      };
    })
  );
  
  // Build tree structure
  const tree = buildCommentTree(commentsWithAuthors);
  
  res.json({ success: true, comments: tree });
}

// Helper: Build comment tree
function buildCommentTree(comments) {
  const map = {};
  const roots = [];
  
  // Create map of all comments
  comments.forEach(c => {
    map[c.comment_id] = { ...c, replies: [] };
  });
  
  // Build tree
  comments.forEach(c => {
    if (c.parent_comment_id && map[c.parent_comment_id]) {
      map[c.parent_comment_id].replies.push(map[c.comment_id]);
    } else {
      roots.push(map[c.comment_id]);
    }
  });
  
  return roots;
}

// HU16 - Disable comment (admin only, soft delete)
async function disableComment(req, res) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const commentId = req.params.commentId;
  
  const result = await db.comments.updateOne(
    { comment_id: commentId },
    { $set: { is_active: false } }
  );
  
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  res.json({ success: true, message: 'Comment disabled' });
}

module.exports = {
  addComment,
  getComments,
  disableComment
};
```

```javascript
// routes/comment.routes.js
const router = require('express').Router();
const controller = require('../controllers/comment.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

router.get('/datasets/:datasetId/comments', controller.getComments);
router.post('/datasets/:datasetId/comments', verifyToken, controller.addComment);
router.patch('/comments/:commentId', verifyToken, verifyAdmin, controller.disableComment);

module.exports = router;
```

**3. Messages (HU21) (1 hora)**

```javascript
// controllers/message.controller.js

// HU21 - Send message
async function sendMessage(req, res) {
  const { content } = req.body;
  const fromUserId = req.user.userId;
  const toUsername = req.params.toUser;
  
  // Validate content
  if (!content || content.length < 1 || content.length > 5000) {
    return res.status(400).json({ error: 'Content must be 1-5000 characters' });
  }
  
  // Get recipient
  const toUser = await db.users.findOne({ username: toUsername });
  if (!toUser) return res.status(404).json({ error: 'User not found' });
  
  // Cannot message self
  if (fromUserId === toUser.user_id) {
    return res.status(400).json({ error: 'Cannot message yourself' });
  }
  
  // Generate message_id
  const timestamp = Date.now();
  const message_id = `msg_from_${fromUserId}_to_${toUser.user_id}_${timestamp}`;
  
  // Insert message
  const message = {
    message_id,
    from_user_id: fromUserId,
    to_user_id: toUser.user_id,
    content,
    created_at: new Date()
  };
  
  await db.private_messages.insertOne(message);
  
  res.status(201).json({ success: true, message });
}

// HU21 - Get conversation thread
async function getThread(req, res) {
  const fromUsername = req.params.fromUsername;
  const toUsername = req.params.toUser;
  
  // Verify requester is part of conversation
  if (req.user.username !== fromUsername && req.user.username !== toUsername) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Get both users
  const [fromUser, toUser] = await Promise.all([
    db.users.findOne({ username: fromUsername }),
    db.users.findOne({ username: toUsername })
  ]);
  
  if (!fromUser || !toUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Get messages between these users (both directions)
  const messages = await db.private_messages.find({
    $or: [
      { from_user_id: fromUser.user_id, to_user_id: toUser.user_id },
      { from_user_id: toUser.user_id, to_user_id: fromUser.user_id }
    ]
  })
  .sort({ created_at: 1 })
  .toArray();
  
  res.json({ success: true, messages });
}

module.exports = {
  sendMessage,
  getThread
};
```

```javascript
// routes/message.routes.js
const router = require('express').Router();
const controller = require('../controllers/message.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/messages/:fromUsername/:toUser', verifyToken, controller.getThread);
router.post('/messages/:fromUsername/:toUser', verifyToken, controller.sendMessage);

module.exports = router;
```

**4. Notifications Endpoint (30 min)**

```javascript
// controllers/notification.controller.js
const { getNotifications } = require('../utils/notifications');

async function getUserNotifications(req, res) {
  const username = req.params.username;
  
  // Verify user can only get own notifications
  if (req.user.username !== username) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Get user
  const user = await db.users.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Get notifications from Redis (reuse utility)
  const notificationsJson = await getNotifications(user.user_id);
  
  // Parse JSON strings
  const notifications = notificationsJson.map(n => JSON.parse(n));
  
  res.json({
    success: true,
    notifications,
    count: notifications.length
  });
}

module.exports = {
  getUserNotifications
};
```

```javascript
// routes/notification.routes.js
const router = require('express').Router();
const controller = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/notifications/:username', verifyToken, controller.getUserNotifications);

module.exports = router;
```

```javascript
// Update server.js
app.use('/api', require('./routes/comment.routes'));
app.use('/api', require('./routes/message.routes'));
app.use('/api', require('./routes/notification.routes'));
```

**5. Backend Testing (30 min)**

Test all new endpoints in Postman:
- Follow/unfollow user
- Get followers/following
- Add comment
- Reply to comment (test max depth)
- Admin disable comment
- Send private message
- Get conversation thread
- Get notifications

**6. Frontend Setup (2.5 horas)**

```bash
cd frontend
npm create vite@latest . -- --template vue
npm install
npm install vue-router@4 axios tailwindcss @tailwindcss/forms postcss autoprefixer
npx tailwindcss init -p
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1e40af'
        },
        secondary: {
          DEFAULT: '#64748b',
          dark: '#475569'
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
```

```css
/* src/assets/main.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors;
  }
  
  .btn-primary {
    @apply bg-primary text-white hover:bg-primary-dark;
  }
  
  .btn-secondary {
    @apply bg-secondary text-white hover:bg-secondary-dark;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
  
  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary;
  }
}
```

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('datec_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('datec_token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default {
  // Auth
  auth: {
    login: (username, password) => 
      api.post('/auth/login', { username, password }),
    register: (formData) => 
      api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
  },
  
  // Users
  users: {
    getUser: (username) => api.get(`/users/${username}`),
    updateUser: (username, formData) => 
      api.put(`/users/${username}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    searchUsers: (query) => api.get(`/users/search?q=${query}`),
    getUserDatasets: (username) => api.get(`/users/${username}/datasets`),
    followUser: (username) => api.post(`/users/${username}/follow`),
    unfollowUser: (username) => api.delete(`/users/${username}/follow`),
    getFollowers: (username) => api.get(`/users/${username}/followers`),
    getFollowing: (username) => api.get(`/users/${username}/following`)
  },
  
  // Datasets
  datasets: {
    list: (page = 1, limit = 20) => 
      api.get(`/datasets?page=${page}&limit=${limit}`),
    search: (query) => api.get(`/datasets/search?q=${query}`),
    get: (datasetId) => api.get(`/datasets/${datasetId}`),
    create: (formData) => 
      api.post('/datasets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    update: (datasetId, formData) => 
      api.put(`/datasets/${datasetId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    delete: (datasetId) => api.delete(`/datasets/${datasetId}`),
    toggleVisibility: (datasetId, isPublic) => 
      api.patch(`/datasets/${datasetId}/visibility`, { is_public: isPublic }),
    requestApproval: (datasetId) => 
      api.patch(`/datasets/${datasetId}/review`),
    clone: (datasetId) => api.post(`/datasets/${datasetId}/clone`),
    downloadFile: (datasetId, fileId) => 
      api.get(`/datasets/${datasetId}/files/${fileId}`, {
        responseType: 'blob'
      }),
    getDownloadStats: (datasetId) => 
      api.get(`/datasets/${datasetId}/downloads`)
  },
  
  // Comments
  comments: {
    getComments: (datasetId) => 
      api.get(`/datasets/${datasetId}/comments`),
    addComment: (datasetId, content, parentCommentId = null) => 
      api.post(`/datasets/${datasetId}/comments`, { content, parentCommentId }),
    disableComment: (commentId) => 
      api.patch(`/comments/${commentId}`)
  },
  
  // Votes
  votes: {
    getVotes: (datasetId) => 
      api.get(`/datasets/${datasetId}/votes`),
    addVote: (datasetId) => 
      api.post(`/datasets/${datasetId}/votes`),
    removeVote: (datasetId) => 
      api.delete(`/datasets/${datasetId}/votes`),
    checkUserVoted: (datasetId, username) => 
      api.get(`/datasets/${datasetId}/votes/${username}`)
  },
  
  // Messages
  messages: {
    getThread: (fromUser, toUser) => 
      api.get(`/messages/${fromUser}/${toUser}`),
    sendMessage: (fromUser, toUser, content) => 
      api.post(`/messages/${fromUser}/${toUser}`, { content })
  },
  
  // Notifications
  notifications: {
    get: (username) => api.get(`/notifications/${username}`)
  },
  
  // Admin
  admin: {
    getPendingDatasets: () => api.get('/admin/datasets'),
    reviewDataset: (datasetId, action, adminReview) => 
      api.patch(`/admin/datasets/${datasetId}`, { action, admin_review: adminReview }),
    promoteUser: (username) => 
      api.patch(`/users/${username}/promote`)
  }
};
```

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/Register.vue')
    },
    {
      path: '/datasets/create',
      name: 'DatasetCreate',
      component: () => import('../views/DatasetCreate.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/datasets/:id',
      name: 'DatasetDetail',
      component: () => import('../views/DatasetDetail.vue')
    },
    {
      path: '/profile/:username',
      name: 'Profile',
      component: () => import('../views/Profile.vue')
    },
    {
      path: '/search',
      name: 'Search',
      component: () => import('../views/Search.vue')
    },
    {
      path: '/messages',
      name: 'Messages',
      component: () => import('../views/Messages.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/notifications',
      name: 'Notifications',
      component: () => import('../views/Notifications.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'AdminPanel',
      component: () => import('../views/AdminPanel.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('datec_token');
  const user = JSON.parse(localStorage.getItem('datec_user') || '{}');
  
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else if (to.meta.requiresAdmin && !user.isAdmin) {
    next('/');
  } else {
    next();
  }
});

export default router;
```

```javascript
// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/main.css';

createApp(App)
  .use(router)
  .mount('#app');
```

```vue
<!-- src/App.vue -->
<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <Navbar v-if="!isAuthPage" />
    <main class="container mx-auto px-4 py-8">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';

const route = useRoute();
const isAuthPage = computed(() => 
  ['Login', 'Register'].includes(route.name)
);
</script>
```

```bash
# Create .env
echo "VITE_API_URL=http://localhost:3000/api" > .env
```

**Día 3 Checkpoint:**
✅ HU15,16,19,20,21 complete
✅ All backend complete (21 HUs)
✅ Frontend base setup
✅ API service layer
✅ Router configured
✅ ~8-9 hours

---

### **Día 4: Frontend Complete + Testing (8-9 horas)**

#### Objetivos:
✅ Complete all frontend views
✅ End-to-end testing
✅ Documentation

#### Tasks:

**1. Core Components (1.5 horas)**

```vue
<!-- src/components/Navbar.vue -->
<template>
  <nav class="bg-white shadow-md">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <router-link to="/" class="text-2xl font-bold text-primary">
          DaTEC
        </router-link>
        
        <!-- Search -->
        <div class="flex-1 max-w-md mx-8">
          <input
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Search datasets..."
            class="input"
          />
        </div>
        
        <!-- Nav Links -->
        <div class="flex items-center space-x-4">
          <router-link to="/" class="hover:text-primary">Home</router-link>
          
          <template v-if="isLoggedIn">
            <router-link to="/datasets/create" class="btn btn-primary">
              Create Dataset
            </router-link>
            
            <!-- Notifications -->
            <button @click="$router.push('/notifications')" class="relative">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span v-if="notificationCount > 0" 
                    class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {{ notificationCount }}
              </span>
            </button>
            
            <!-- User Menu -->
            <div class="relative">
              <button @click="showUserMenu = !showUserMenu" class="flex items-center space-x-2">
                <img v-if="user.avatarUrl" :src="user.avatarUrl" 
                     class="w-8 h-8 rounded-full" alt="Avatar" />
                <span class="font-medium">{{ user.username }}</span>
              </button>
              
              <div v-if="showUserMenu" 
                   class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <router-link :to="`/profile/${user.username}`" 
                             class="block px-4 py-2 hover:bg-gray-100">
                  Profile
                </router-link>
                <router-link to="/messages" 
                             class="block px-4 py-2 hover:bg-gray-100">
                  Messages
                </router-link>
                <router-link v-if="user.isAdmin" to="/admin" 
                             class="block px-4 py-2 hover:bg-gray-100">
                  Admin Panel
                </router-link>
                <button @click="handleLogout" 
                        class="block w-full text-left px-4 py-2 hover:bg-gray-100">
                  Logout
                </button>
              </div>
            </div>
          </template>
          
          <template v-else>
            <router-link to="/login" class="btn btn-secondary">Login</router-link>
            <router-link to="/register" class="btn btn-primary">Register</router-link>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();
const searchQuery = ref('');
const showUserMenu = ref(false);
const notificationCount = ref(0);

const isLoggedIn = computed(() => !!localStorage.getItem('datec_token'));
const user = computed(() => JSON.parse(localStorage.getItem('datec_user') || '{}'));

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchQuery.value)}`);
  }
};

const handleLogout = () => {
  localStorage.removeItem('datec_token');
  localStorage.removeItem('datec_user');
  router.push('/login');
};

onMounted(async () => {
  if (isLoggedIn.value) {
    try {
      const result = await api.notifications.get(user.value.username);
      notificationCount.value = result.count;
    } catch (err) {
      console.error('Failed to load notifications');
    }
  }
});
</script>
```

```vue
<!-- src/components/DatasetCard.vue -->
<template>
  <div @click="navigate" 
       class="card cursor-pointer hover:shadow-lg transition-shadow">
    <!-- Header Image -->
    <div class="relative h-32 -mx-6 -mt-6 mb-4 rounded-t-lg overflow-hidden bg-gray-200">
      <img v-if="dataset.header_photo_url" 
           :src="dataset.header_photo_url" 
           :alt="dataset.dataset_name"
           class="w-full h-full object-cover" />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      </div>
    </div>
    
    <!-- Content -->
    <h3 class="text-lg font-bold mb-2 line-clamp-2">
      {{ dataset.dataset_name }}
    </h3>
    
    <p class="text-gray-600 text-sm mb-4 line-clamp-3">
      {{ dataset.description }}
    </p>
    
    <!-- Tags -->
    <div v-if="dataset.tags && dataset.tags.length" class="flex flex-wrap gap-2 mb-4">
      <span v-for="tag in dataset.tags.slice(0, 3)" :key="tag"
            class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
        {{ tag }}
      </span>
    </div>
    
    <!-- Stats -->
    <div class="flex items-center justify-between text-sm text-gray-500">
      <div class="flex items-center space-x-4">
        <span class="flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ dataset.download_count }}
        </span>
        <span class="flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {{ dataset.comment_count }}
        </span>
      </div>
      
      <span class="text-xs">{{ formatDate(dataset.created_at) }}</span>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
  dataset: {
    type: Object,
    required: true
  }
});

const router = useRouter();

const navigate = () => {
  router.push(`/datasets/${props.dataset.dataset_id}`);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
</script>
```

```vue
<!-- src/components/LoadingSpinner.vue -->
<template>
  <div class="flex flex-col items-center justify-center py-12">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    <p v-if="text" class="mt-4 text-gray-600">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: ''
  }
});
</script>
```

**2. Auth Views (1 hora)**

```vue
<!-- src/views/Login.vue -->
<template>
  <div class="max-w-md mx-auto mt-8">
    <div class="card">
      <h1 class="text-2xl font-bold mb-6 text-center">Login to DaTEC</h1>
      
      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Username</label>
          <input v-model="form.username" type="text" class="input" required />
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-medium mb-1">Password</label>
          <input v-model="form.password" type="password" class="input" required />
        </div>
        
        <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {{ error }}
        </div>
        
        <button type="submit" :disabled="loading" class="btn btn-primary w-full">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      
      <p class="mt-4 text-center text-sm">
        Don't have an account? 
        <router-link to="/register" class="text-primary hover:underline">
          Register
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();
const form = ref({ username: '', password: '' });
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const result = await api.auth.login(form.value.username, form.value.password);
    
    localStorage.setItem('datec_token', result.token);
    localStorage.setItem('datec_user', JSON.stringify(result.user));
    
    router.push('/');
  } catch (err) {
    error.value = err.error || 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>
```

```vue
<!-- src/views/Register.vue -->
<template>
  <div class="max-w-md mx-auto mt-8">
    <div class="card">
      <h1 class="text-2xl font-bold mb-6 text-center">Register for DaTEC</h1>
      
      <form @submit.prevent="handleRegister">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Username</label>
          <input v-model="form.username" type="text" class="input" required 
                 pattern="^[a-zA-Z0-9_]{3,30}$" 
                 title="3-30 characters, letters, numbers, underscore only" />
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Email</label>
          <input v-model="form.email_address" type="email" class="input" required />
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Password</label>
          <input v-model="form.password" type="password" class="input" required 
                 minlength="8" title="Minimum 8 characters" />
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Full Name</label>
          <input v-model="form.full_name" type="text" class="input" required />
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Birth Date</label>
          <input v-model="form.birth_date" type="date" class="input" required 
                 :max="maxDate" title="Must be 15+ years old" />
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-medium mb-1">Avatar (optional)</label>
          <input @change="handleFileChange" type="file" accept="image/*" 
                 class="input" />
          <p class="text-xs text-gray-500 mt-1">Max 2MB, JPG/PNG/WebP</p>
        </div>
        
        <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {{ error }}
        </div>
        
        <button type="submit" :disabled="loading" class="btn btn-primary w-full">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
      </form>
      
      <p class="mt-4 text-center text-sm">
        Already have an account? 
        <router-link to="/login" class="text-primary hover:underline">
          Login
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();
const form = ref({
  username: '',
  email_address: '',
  password: '',
  full_name: '',
  birth_date: ''
});
const avatar = ref(null);
const loading = ref(false);
const error = ref('');

const maxDate = computed(() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 15);
  return date.toISOString().split('T')[0];
});

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file && file.size > 2 * 1024 * 1024) {
    error.value = 'Avatar must be less than 2MB';
    e.target.value = '';
    return;
  }
  avatar.value = file;
};

const handleRegister = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const formData = new FormData();
    Object.keys(form.value).forEach(key => {
      formData.append(key, form.value[key]);
    });
    if (avatar.value) {
      formData.append('avatar', avatar.value);
    }
    
    const result = await api.auth.register(formData);
    
    localStorage.setItem('datec_token', result.token);
    localStorage.setItem('datec_user', JSON.stringify(result.user));
    
    router.push('/');
  } catch (err) {
    error.value = err.error || 'Registration failed';
  } finally {
    loading.value = false;
  }
};
</script>
```

**3. Main Views (2.5 horas)**

```vue
<!-- src/views/Home.vue -->
<template>
  <div>
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-4">Welcome to DaTEC</h1>
      <p class="text-gray-600 text-lg">Discover and share datasets</p>
    </div>
    
    <LoadingSpinner v-if="loading" text="Loading datasets..." />
    
    <div v-else-if="datasets.length === 0" class="text-center py-12">
      <p class="text-gray-500">No datasets found</p>
    </div>
    
    <div v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DatasetCard v-for="dataset in datasets" :key="dataset.dataset_id" 
                     :dataset="dataset" />
      </div>
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center mt-8 space-x-2">
        <button @click="loadPage(page - 1)" :disabled="page === 1"
                class="btn btn-secondary disabled:opacity-50">
          Previous
        </button>
        <span class="px-4 py-2">Page {{ page }} of {{ pagination.totalPages }}</span>
        <button @click="loadPage(page + 1)" :disabled="page === pagination.totalPages"
                class="btn btn-secondary disabled:opacity-50">
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import DatasetCard from '../components/DatasetCard.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const datasets = ref([]);
const loading = ref(true);
const page = ref(1);
const pagination = ref({ totalPages: 1, totalCount: 0 });

const loadPage = async (newPage) => {
  loading.value = true;
  page.value = newPage;
  
  try {
    const result = await api.datasets.list(page.value, 20);
    datasets.value = result.datasets;
    pagination.value = result.pagination;
  } catch (err) {
    console.error('Failed to load datasets:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => loadPage(1));
</script>
```

```vue
<!-- src/views/DatasetDetail.vue -->
<template>
  <div v-if="loading">
    <LoadingSpinner text="Loading dataset..." />
  </div>
  
  <div v-else-if="dataset" class="max-w-4xl mx-auto">
    <!-- Header Photo -->
    <div class="relative h-64 -mx-4 mb-8 rounded-lg overflow-hidden bg-gray-200">
      <img v-if="dataset.header_photo_url" :src="dataset.header_photo_url" 
           :alt="dataset.dataset_name" class="w-full h-full object-cover" />
    </div>
    
    <!-- Title & Actions -->
    <div class="flex justify-between items-start mb-6">
      <div class="flex-1">
        <h1 class="text-3xl font-bold mb-2">{{ dataset.dataset_name }}</h1>
        <router-link :to="`/profile/${ownerUsername}`" 
                     class="text-gray-600 hover:text-primary">
          by {{ ownerUsername }}
        </router-link>
        <p class="text-sm text-gray-500 mt-1">
          Created {{ formatDate(dataset.created_at) }}
        </p>
      </div>
      
      <div class="flex items-center space-x-2">
        <!-- Vote Button -->
        <button @click="toggleVote" :disabled="votingLoading"
                :class="hasVoted ? 'btn btn-primary' : 'btn btn-secondary'">
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {{ dataset.vote_count }}
        </button>
        
        <!-- Clone Button -->
        <button v-if="currentUser" @click="handleClone" class="btn btn-secondary">
          Clone
        </button>
        
        <!-- Edit/Delete (owner only) -->
        <template v-if="isOwner">
          <button @click="toggleVisibility" class="btn btn-secondary">
            {{ dataset.is_public ? 'Make Private' : 'Make Public' }}
          </button>
          <button @click="handleDelete" class="btn bg-red-600 text-white hover:bg-red-700">
            Delete
          </button>
        </template>
      </div>
    </div>
    
    <!-- Description -->
    <div class="card mb-6">
      <h2 class="text-xl font-bold mb-3">Description</h2>
      <p class="whitespace-pre-wrap">{{ dataset.description }}</p>
      
      <!-- Tags -->
      <div v-if="dataset.tags && dataset.tags.length" class="flex flex-wrap gap-2 mt-4">
        <span v-for="tag in dataset.tags" :key="tag"
              class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
          {{ tag }}
        </span>
      </div>
    </div>
    
    <!-- Files -->
    <div class="card mb-6">
      <h2 class="text-xl font-bold mb-3">Files</h2>
      <div class="space-y-2">
        <div v-for="file in dataset.file_references" :key="file.couchdb_document_id"
             class="flex justify-between items-center p-3 bg-gray-50 rounded-md">
          <div>
            <p class="font-medium">{{ file.file_name }}</p>
            <p class="text-sm text-gray-500">{{ formatFileSize(file.file_size_bytes) }}</p>
          </div>
          <button @click="downloadFile(file)" class="btn btn-primary">
            Download
          </button>
        </div>
      </div>
    </div>
    
    <!-- Tutorial Video -->
    <div v-if="dataset.tutorial_video_ref" class="card mb-6">
      <h2 class="text-xl font-bold mb-3">Tutorial Video</h2>
      <div class="aspect-w-16 aspect-h-9">
        <iframe v-if="dataset.tutorial_video_ref.platform === 'youtube'"
                :src="getYouTubeEmbed(dataset.tutorial_video_ref.url)"
                frameborder="0" allowfullscreen class="w-full h-96"></iframe>
        <iframe v-else-if="dataset.tutorial_video_ref.platform === 'vimeo'"
                :src="getVimeoEmbed(dataset.tutorial_video_ref.url)"
                frameborder="0" allowfullscreen class="w-full h-96"></iframe>
      </div>
    </div>
    
    <!-- Comments -->
    <div class="card">
      <h2 class="text-xl font-bold mb-4">Comments ({{ dataset.comment_count }})</h2>
      
      <!-- Add Comment Form -->
      <div v-if="currentUser" class="mb-6">
        <textarea v-model="newComment" placeholder="Add a comment..." 
                  class="input" rows="3" maxlength="2000"></textarea>
        <button @click="submitComment" :disabled="!newComment.trim()"
                class="btn btn-primary mt-2">
          Post Comment
        </button>
      </div>
      
      <!-- Comments Thread -->
      <CommentThread v-if="comments.length" :comments="comments" 
                     :datasetId="dataset.dataset_id" @refresh="loadComments" />
      <p v-else class="text-gray-500">No comments yet</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import CommentThread from '../components/CommentThread.vue';

const route = useRoute();
const router = useRouter();
const dataset = ref(null);
const comments = ref([]);
const loading = ref(true);
const hasVoted = ref(false);
const votingLoading = ref(false);
const newComment = ref('');

const currentUser = computed(() => 
  JSON.parse(localStorage.getItem('datec_user') || 'null')
);

const isOwner = computed(() => 
  currentUser.value && dataset.value?.owner_user_id === currentUser.value.userId
);

const ownerUsername = ref('');

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const getYouTubeEmbed = (url) => {
  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
  return `https://www.youtube.com/embed/${videoId}`;
};

const getVimeoEmbed = (url) => {
  const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
  return `https://player.vimeo.com/video/${videoId}`;
};

const loadDataset = async () => {
  try {
    const result = await api.datasets.get(route.params.id);
    dataset.value = result.dataset;
    
    // Get owner username
    const owner = await api.users.getUser(dataset.value.owner_user_id);
    ownerUsername.value = owner.user?.username || 'Unknown';
    
    // Check if user voted
    if (currentUser.value) {
      const voteResult = await api.votes.checkUserVoted(
        dataset.value.dataset_id,
        currentUser.value.username
      );
      hasVoted.value = voteResult.hasVoted;
    }
  } catch (err) {
    console.error('Failed to load dataset:', err);
  } finally {
    loading.value = false;
  }
};

const loadComments = async () => {
  try {
    const result = await api.comments.getComments(route.params.id);
    comments.value = result.comments;
  } catch (err) {
    console.error('Failed to load comments:', err);
  }
};

const toggleVote = async () => {
  if (!currentUser.value) {
    router.push('/login');
    return;
  }
  
  votingLoading.value = true;
  try {
    if (hasVoted.value) {
      await api.votes.removeVote(dataset.value.dataset_id);
      dataset.value.vote_count--;
      hasVoted.value = false;
    } else {
      await api.votes.addVote(dataset.value.dataset_id);
      dataset.value.vote_count++;
      hasVoted.value = true;
    }
  } catch (err) {
    alert(err.error || 'Vote failed');
  } finally {
    votingLoading.value = false;
  }
};

const handleClone = async () => {
  if (!confirm('Clone this dataset?')) return;
  
  try {
    const result = await api.datasets.clone(dataset.value.dataset_id);
    alert('Dataset cloned successfully!');
    router.push(`/datasets/${result.dataset.dataset_id}`);
  } catch (err) {
    alert(err.error || 'Clone failed');
  }
};

const toggleVisibility = async () => {
  try {
    await api.datasets.toggleVisibility(
      dataset.value.dataset_id,
      !dataset.value.is_public
    );
    dataset.value.is_public = !dataset.value.is_public;
  } catch (err) {
    alert(err.error || 'Failed to update visibility');
  }
};

const handleDelete = async () => {
  if (!confirm('Permanently delete this dataset? This cannot be undone.')) return;
  
  try {
    await api.datasets.delete(dataset.value.dataset_id);
    alert('Dataset deleted');
    router.push('/');
  } catch (err) {
    alert(err.error || 'Delete failed');
  }
};

const downloadFile = async (file) => {
  try {
    const blob = await api.datasets.downloadFile(
      dataset.value.dataset_id,
      file.couchdb_document_id
    );
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    alert('Download failed');
  }
};

const submitComment = async () => {
  try {
    await api.comments.addComment(
      dataset.value.dataset_id,
      newComment.value,
      null
    );
    newComment.value = '';
    loadComments();
    dataset.value.comment_count++;
  } catch (err) {
    alert(err.error || 'Comment failed');
  }
};

onMounted(() => {
  loadDataset();
  loadComments();
});
</script>
```

```vue
<!-- src/components/CommentThread.vue -->
<template>
  <div class="space-y-4">
    <div v-for="comment in comments" :key="comment.comment_id" 
         class="border-l-2 border-gray-200 pl-4">
      <div class="flex items-start space-x-3">
        <img v-if="comment.author_avatar" :src="comment.author_avatar" 
             class="w-8 h-8 rounded-full" alt="Avatar" />
        <div class="flex-1">
          <div class="flex items-center space-x-2">
            <span class="font-medium">{{ comment.author_username }}</span>
            <span class="text-xs text-gray-500">
              {{ formatDate(comment.created_at) }}
            </span>
          </div>
          
          <p v-if="comment.is_active" class="mt-1 whitespace-pre-wrap">
            {{ comment.content }}
          </p>
          <p v-else class="mt-1 text-gray-400 italic">
            [Comment disabled by admin]
          </p>
          
          <button v-if="comment.is_active && currentUser && depth < maxDepth"
                  @click="showReply = comment.comment_id"
                  class="text-sm text-primary hover:underline mt-2">
            Reply
          </button>
          
          <!-- Reply Form -->
          <div v-if="showReply === comment.comment_id" class="mt-3">
            <textarea v-model="replyContent" placeholder="Write a reply..." 
                      class="input" rows="2" maxlength="2000"></textarea>
            <div class="flex space-x-2 mt-2">
              <button @click="submitReply(comment.comment_id)"
                      :disabled="!replyContent.trim()"
                      class="btn btn-primary btn-sm">
                Reply
              </button>
              <button @click="showReply = null" class="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </div>
          
          <!-- Nested Replies -->
          <CommentThread v-if="comment.replies && comment.replies.length"
                         :comments="comment.replies"
                         :datasetId="datasetId"
                         :depth="depth + 1"
                         :maxDepth="maxDepth"
                         @refresh="$emit('refresh')"
                         class="mt-4" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import api from '../services/api';

const props = defineProps({
  comments: Array,
  datasetId: String,
  depth: {
    type: Number,
    default: 0
  },
  maxDepth: {
    type: Number,
    default: 5
  }
});

const emit = defineEmits(['refresh']);

const showReply = ref(null);
const replyContent = ref('');

const currentUser = computed(() => 
  JSON.parse(localStorage.getItem('datec_user') || 'null')
);

const formatDate = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) return new Date(date).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const submitReply = async (parentId) => {
  try {
    await api.comments.addComment(
      props.datasetId,
      replyContent.value,
      parentId
    );
    replyContent.value = '';
    showReply.value = null;
    emit('refresh');
  } catch (err) {
    alert(err.error || 'Reply failed');
  }
};
</script>
```

**4. Dataset Creation (1 hora)**

```vue
<!-- src/views/DatasetCreate.vue -->
<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">Create Dataset</h1>
    
    <form @submit.prevent="handleSubmit" class="card">
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Dataset Name *</label>
        <input v-model="form.dataset_name" type="text" class="input" required 
               minlength="3" maxlength="100" />
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Description *</label>
        <textarea v-model="form.description" class="input" rows="5" required 
                  minlength="10" maxlength="5000"></textarea>
        <p class="text-xs text-gray-500 mt-1">
          {{ form.description.length }} / 5000 characters
        </p>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Tags (optional)</label>
        <input v-model="tagInput" @keydown.enter.prevent="addTag" 
               type="text" class="input" placeholder="Press Enter to add tag" />
        <div v-if="form.tags.length" class="flex flex-wrap gap-2 mt-2">
          <span v-for="(tag, index) in form.tags" :key="index"
                class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center">
            {{ tag }}
            <button @click="removeTag(index)" type="button" class="ml-2 text-blue-900">
              ×
            </button>
          </span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Data Files * (max 10 files)</label>
        <input @change="handleDataFiles" type="file" multiple accept=".csv,.xlsx,.xls,.json,.txt" 
               class="input" required />
        <p class="text-xs text-gray-500 mt-1">Max 1GB per file</p>
        <div v-if="dataFiles.length" class="mt-2 space-y-1">
          <div v-for="(file, index) in dataFiles" :key="index" 
               class="text-sm flex justify-between items-center p-2 bg-gray-50 rounded">
            <span>{{ file.name }} ({{ formatFileSize(file.size) }})</span>
            <button @click="removeDataFile(index)" type="button" class="text-red-600">
              Remove
            </button>
          </div>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Header Photo (optional)</label>
        <input @change="handleHeaderPhoto" type="file" accept="image/*" 
               class="input" ref="headerPhotoInput" />
        <p class="text-xs text-gray-500 mt-1">Max 5MB, recommended 1200x400px</p>
        <div v-if="headerPhoto" class="mt-2">
          <img :src="headerPhotoPreview" alt="Header preview" 
               class="max-h-48 rounded-md" />
          <button @click="removeHeaderPhoto" type="button" 
                  class="text-sm text-red-600 mt-1">
            Remove
          </button>
        </div>
      </div>
      
      <div class="mb-6">
        <label class="block text-sm font-medium mb-1">Tutorial Video URL (optional)</label>
        <input v-model="form.tutorial_video_url" type="url" class="input" 
               placeholder="https://youtube.com/watch?v=..." 
               pattern="https?://.*(youtube|vimeo).*" 
               title="Must be a YouTube or Vimeo URL" />
        <p class="text-xs text-gray-500 mt-1">YouTube or Vimeo only</p>
      </div>
      
      <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
        {{ error }}
      </div>
      
      <div v-if="uploading" class="mb-4">
        <div class="bg-blue-100 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full transition-all" 
               :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <p class="text-sm text-gray-600 mt-1">Uploading... {{ uploadProgress }}%</p>
      </div>
      
      <div class="flex space-x-2">
        <button type="submit" :disabled="uploading || !canSubmit" 
                class="btn btn-primary">
          {{ uploading ? 'Creating...' : 'Create Dataset' }}
        </button>
        <button type="button" @click="$router.back()" 
                :disabled="uploading" class="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();
const form = ref({
  dataset_name: '',
  description: '',
  tags: [],
  tutorial_video_url: ''
});
const tagInput = ref('');
const dataFiles = ref([]);
const headerPhoto = ref(null);
const headerPhotoPreview = ref(null);
const headerPhotoInput = ref(null);
const uploading = ref(false);
const uploadProgress = ref(0);
const error = ref('');

const canSubmit = computed(() => 
  form.value.dataset_name && 
  form.value.description && 
  dataFiles.value.length > 0
);

const formatFileSize = (bytes) => {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const addTag = () => {
  const tag = tagInput.value.trim();
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag);
  }
  tagInput.value = '';
};

const removeTag = (index) => {
  form.value.tags.splice(index, 1);
};

const handleDataFiles = (e) => {
  const files = Array.from(e.target.files);
  
  // Validate file sizes
  for (const file of files) {
    if (file.size > 1024 * 1024 * 1024) {
      error.value = `File ${file.name} exceeds 1GB limit`;
      e.target.value = '';
      return;
    }
  }
  
  if (files.length > 10) {
    error.value = 'Maximum 10 files allowed';
    e.target.value = '';
    return;
  }
  
  dataFiles.value = files;
  error.value = '';
};

const removeDataFile = (index) => {
  dataFiles.value.splice(index, 1);
};

const handleHeaderPhoto = (e) => {
  const file = e.target.files[0];
  
  if (file && file.size > 5 * 1024 * 1024) {
    error.value = 'Header photo must be less than 5MB';
    e.target.value = '';
    return;
  }
  
  headerPhoto.value = file;
  
  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    headerPhotoPreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
  
  error.value = '';
};

const removeHeaderPhoto = () => {
  headerPhoto.value = null;
  headerPhotoPreview.value = null;
  if (headerPhotoInput.value) {
    headerPhotoInput.value.value = '';
  }
};

const handleSubmit = async () => {
  uploading.value = true;
  error.value = '';
  uploadProgress.value = 0;
  
  try {
    const formData = new FormData();
    formData.append('dataset_name', form.value.dataset_name);
    formData.append('description', form.value.description);
    formData.append('tags', JSON.stringify(form.value.tags));
    
    if (form.value.tutorial_video_url) {
      formData.append('tutorial_video_url', form.value.tutorial_video_url);
    }
    
    // Add data files
    dataFiles.value.forEach(file => {
      formData.append('data_files', file);
    });
    
    // Add header photo
    if (headerPhoto.value) {
      formData.append('header_photo', headerPhoto.value);
    }
    
    // Create dataset with progress tracking
    const result = await api.datasets.create(formData);
    
    uploadProgress.value = 100;
    
    alert('Dataset created! It will be reviewed by an administrator.');
    router.push(`/datasets/${result.dataset.dataset_id}`);
  } catch (err) {
    error.value = err.error || 'Failed to create dataset';
    uploadProgress.value = 0;
  } finally {
    uploading.value = false;
  }
};
</script>
```

**5. Additional Views (1.5 horas)**

```vue
<!-- src/views/Profile.vue -->
<template>
  <div v-if="loading">
    <LoadingSpinner text="Loading profile..." />
  </div>
  
  <div v-else-if="user" class="max-w-4xl mx-auto">
    <div class="card mb-6">
      <div class="flex items-start space-x-6">
        <img :src="user.avatarUrl || '/default-avatar.jpg'" 
             :alt="user.username" class="w-24 h-24 rounded-full" />
        
        <div class="flex-1">
          <h1 class="text-3xl font-bold">{{ user.username }}</h1>
          <p class="text-gray-600">{{ user.fullName }}</p>
          <p class="text-sm text-gray-500 mt-1">
            Joined {{ formatDate(user.createdAt) }}
          </p>
          
          <div class="flex items-center space-x-6 mt-4">
            <div>
              <span class="font-bold">{{ datasets.length }}</span>
              <span class="text-gray-600 ml-1">Datasets</span>
            </div>
            <button @click="showFollowers = true">
              <span class="font-bold">{{ followerCount }}</span>
              <span class="text-gray-600 ml-1">Followers</span>
            </button>
            <button @click="showFollowing = true">
              <span class="font-bold">{{ followingCount }}</span>
              <span class="text-gray-600 ml-1">Following</span>
            </button>
          </div>
          
          <div class="mt-4 space-x-2">
            <button v-if="!isOwnProfile && currentUser" @click="toggleFollow"
                    :class="isFollowing ? 'btn btn-secondary' : 'btn btn-primary'">
              {{ isFollowing ? 'Unfollow' : 'Follow' }}
            </button>
            
            <button v-if="isOwnProfile" @click="showEditModal = true"
                    class="btn btn-secondary">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Datasets -->
    <h2 class="text-2xl font-bold mb-4">Datasets</h2>
    <div v-if="datasets.length === 0" class="text-center py-12 text-gray-500">
      No datasets yet
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DatasetCard v-for="dataset in datasets" :key="dataset.dataset_id" 
                   :dataset="dataset" />
    </div>
    
    <!-- Followers Modal -->
    <div v-if="showFollowers" @click="showFollowers = false"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div @click.stop class="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">Followers</h3>
        <div v-if="followers.length === 0" class="text-gray-500">No followers yet</div>
        <div v-else class="space-y-2">
          <router-link v-for="follower in followers" :key="follower.userId"
                       :to="`/profile/${follower.username}`"
                       class="block p-2 hover:bg-gray-100 rounded">
            {{ follower.username }}
          </router-link>
        </div>
        <button @click="showFollowers = false" class="btn btn-secondary mt-4 w-full">
          Close
        </button>
      </div>
    </div>
    
    <!-- Following Modal -->
    <div v-if="showFollowing" @click="showFollowing = false"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div @click.stop class="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">Following</h3>
        <div v-if="following.length === 0" class="text-gray-500">Not following anyone yet</div>
        <div v-else class="space-y-2">
          <router-link v-for="user in following" :key="user.userId"
                       :to="`/profile/${user.username}`"
                       class="block p-2 hover:bg-gray-100 rounded">
            {{ user.username }}
          </router-link>
        </div>
        <button @click="showFollowing = false" class="btn btn-secondary mt-4 w-full">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import DatasetCard from '../components/DatasetCard.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const route = useRoute();
const user = ref(null);
const datasets = ref([]);
const followers = ref([]);
const following = ref([]);
const loading = ref(true);
const isFollowing = ref(false);
const showFollowers = ref(false);
const showFollowing = ref(false);
const showEditModal = ref(false);

const currentUser = computed(() => 
  JSON.parse(localStorage.getItem('datec_user') || 'null')
);

const isOwnProfile = computed(() => 
  currentUser.value && user.value?.username === currentUser.value.username
);

const followerCount = computed(() => followers.value.length);
const followingCount = computed(() => following.value.length);

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const toggleFollow = async () => {
  try {
    if (isFollowing.value) {
      await api.users.unfollowUser(user.value.username);
      isFollowing.value = false;
      followers.value = followers.value.filter(f => f.userId !== currentUser.value.userId);
    } else {
      await api.users.followUser(user.value.username);
      isFollowing.value = true;
      followers.value.push({
        userId: currentUser.value.userId,
        username: currentUser.value.username
      });
    }
  } catch (err) {
    alert(err.error || 'Follow action failed');
  }
};

const loadProfile = async () => {
  try {
    const username = route.params.username;
    
    const [userResult, datasetsResult, followersResult, followingResult] = await Promise.all([
      api.users.getUser(username),
      api.users.getUserDatasets(username),
      api.users.getFollowers(username),
      api.users.getFollowing(username)
    ]);
    
    user.value = userResult.user;
    datasets.value = datasetsResult.datasets;
    followers.value = followersResult.followers;
    following.value = followingResult.following;
    
    // Check if current user follows this profile
    if (currentUser.value && !isOwnProfile.value) {
      isFollowing.value = followers.value.some(f => f.userId === currentUser.value.userId);
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(loadProfile);
</script>
```

```vue
<!-- src/views/AdminPanel.vue -->
<template>
  <div class="max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">Admin Panel</h1>
    
    <div class="card">
      <h2 class="text-xl font-bold mb-4">Pending Datasets</h2>
      
      <LoadingSpinner v-if="loading" />
      
      <div v-else-if="datasets.length === 0" class="text-center py-12 text-gray-500">
        No pending datasets
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left">Dataset Name</th>
              <th class="px-4 py-3 text-left">Owner</th>
              <th class="px-4 py-3 text-left">Created</th>
              <th class="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="dataset in datasets" :key="dataset.dataset_id">
              <td class="px-4 py-3">
                <router-link :to="`/datasets/${dataset.dataset_id}`"
                             class="text-primary hover:underline">
                  {{ dataset.dataset_name }}
                </router-link>
              </td>
              <td class="px-4 py-3">{{ dataset.owner_user_id }}</td>
              <td class="px-4 py-3">{{ formatDate(dataset.created_at) }}</td>
              <td class="px-4 py-3 space-x-2">
                <button @click="handleApprove(dataset)" 
                        class="btn bg-green-600 text-white hover:bg-green-700 btn-sm">
                  Approve
                </button>
                <button @click="handleReject(dataset)" 
                        class="btn bg-red-600 text-white hover:bg-red-700 btn-sm">
                  Reject
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Reject Modal -->
    <div v-if="showRejectModal" @click="showRejectModal = false"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div @click.stop class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-xl font-bold mb-4">Reject Dataset</h3>
        <textarea v-model="rejectReason" placeholder="Reason for rejection (optional)" 
                  class="input" rows="4" maxlength="500"></textarea>
        <div class="flex space-x-2 mt-4">
          <button @click="confirmReject" class="btn btn-primary">
            Confirm Reject
          </button>
          <button @click="showRejectModal = false" class="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const datasets = ref([]);
const loading = ref(true);
const showRejectModal = ref(false);
const selectedDataset = ref(null);
const rejectReason = ref('');

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const loadDatasets = async () => {
  loading.value = true;
  try {
    const result = await api.admin.getPendingDatasets();
    datasets.value = result.datasets;
  } catch (err) {
    console.error('Failed to load datasets:', err);
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (dataset) => {
  if (!confirm(`Approve "${dataset.dataset_name}"?`)) return;
  
  try {
    await api.admin.reviewDataset(dataset.dataset_id, 'approve', null);
    datasets.value = datasets.value.filter(d => d.dataset_id !== dataset.dataset_id);
    alert('Dataset approved');
  } catch (err) {
    alert(err.error || 'Approval failed');
  }
};

const handleReject = (dataset) => {
  selectedDataset.value = dataset;
  showRejectModal.value = true;
};

const confirmReject = async () => {
  try {
    await api.admin.reviewDataset(
      selectedDataset.value.dataset_id,
      'reject',
      rejectReason.value || null
    );
    datasets.value = datasets.value.filter(d => d.dataset_id !== selectedDataset.value.dataset_id);
    showRejectModal.value = false;
    rejectReason.value = '';
    selectedDataset.value = null;
    alert('Dataset rejected');
  } catch (err) {
    alert(err.error || 'Rejection failed');
  }
};

onMounted(loadDatasets);
</script>
```

**6. Final Testing & Documentation (1.5 horas)**

**End-to-End Testing Checklist:**

```bash
# Test complete user flows
1. Register → Upload avatar → Login → Home
2. Create dataset → Multiple files → Header photo → Video URL → Request approval
3. Admin login → Approve dataset → User receives notification
4. Search datasets → View detail → Download file → Vote → Comment
5. Follow user → New dataset → Notification received
6. Clone dataset → Verify all 4 DBs updated
7. Private messages → Send → Reply
8. Admin disable comment → Verify hidden from users
9. Delete dataset → Verify removed from all DBs
```

**Create Documentation:**

```markdown
<!-- docs/API.md -->
# DaTEC API Documentation

Base URL: `http://localhost:3000/api`

## Authentication
All protected endpoints require `Authorization: Bearer {token}` header

### POST /auth/register
Register new user with optional avatar upload

**Request (multipart/form-data):**
- username: string (3-30 chars, alphanumeric + underscore)
- email_address: string (valid email)
- password: string (min 8 chars)
- full_name: string
- birth_date: date (user must be 15+)
- avatar: file (optional, max 2MB, image/*)

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "userId": "uuid",
    "username": "john_doe",
    "isAdmin": false
  }
}
```

[Continue with all endpoints from routes_endpoints.md]
```

```markdown
<!-- docs/SETUP.md -->
# DaTEC Setup Guide

## Prerequisites
- Node.js 22.20.0+
- Docker Desktop (MongoDB + Redis)
- Neo4j Desktop 2.0.4
- CouchDB 3.5.0

## Database Setup

### 1. Start Docker Containers
```bash
cd database/datec-db
docker-compose up -d
```

Verify containers:
```bash
docker ps
# Should see: datec-mongo-primary, datec-mongo-secondary, datec-redis-primary, datec-redis-replica
```

### 2. Verify Databases
- MongoDB: http://localhost:27017 (primary), http://localhost:27018 (secondary)
- Redis: localhost:6379 (primary), localhost:6380 (replica)
- Neo4j: bolt://localhost:7687
- CouchDB: http://localhost:5984

## Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
PORT=3000
JWT_SECRET=your_secret_key_here_change_in_production
NODE_ENV=development
EOF

npm run dev
```

## Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:3000/api
EOF

npm run dev
```

## Default Admin Credentials
- Username: `sudod4t3c`
- Password: `dat3c_master_4dmin`

## Verify Installation
1. Backend: http://localhost:3000/api/health
2. Frontend: http://localhost:5173
3. Login as admin
4. Create test dataset
```

**Día 4 Checkpoint:**
✅ All frontend views complete
✅ Full MVP functional
✅ All 21 HUs working
✅ Documentation complete
✅ ~8-9 hours

---

## 📊 Final Summary

### Total Implementation Time: **31-35 hours** over 4 days

| Day | Backend | Frontend | Total |
|-----|---------|----------|-------|
| 1 | 7-8h | - | 7-8h |
| 2 | 8-9h | - | 8-9h |
| 3 | 4-5h | 3-4h | 8-9h |
| 4 | - | 8-9h | 8-9h |

### HU Implementation Distribution:

**Día 1:** HU1, HU2, HU3, HU4, HU14 (5 HUs)
**Día 2:** HU5, HU6, HU7, HU8, HU9, HU10, HU11, HU12, HU13, HU17, HU18 (11 HUs)
**Día 3:** HU15, HU16, HU19, HU20, HU21 (5 HUs)
**Día 4:** Frontend complete + Testing

### Code Reuse Patterns Applied:

1. **uploadFile()** - Used in HU1, HU4, HU5, HU18 (4 times)
2. **createRelationship()** - Used in HU13, HU19 (2 times)
3. **incrementCounter()/decrementCounter()** - Used in HU13, HU17 (2 times)
4. **sendNotification()** - Used in HU8, HU19 (2 times)
5. **textSearch()** - Used in HU9, HU14 (2 times)

### Database Operations Summary:

- **MongoDB**: 5 collections, 28 indexes
- **Redis**: Counters + notifications
- **Neo4j**: 2 node types, 2 relationship types
- **CouchDB**: 3 document types

### Files Created: **~35 files**

**Backend (20 files):**
- config/: 1
- utils/: 6
- middleware/: 3
- controllers/: 7
- routes/: 8

**Frontend (15 files):**
- components/: 4
- views/: 10
- services/: 1
- router/: 1

---

## ✅ MVP Completion Checklist

- ✅ All 21 HUs implemented
- ✅ 4 databases used (MongoDB, Redis, Neo4j, CouchDB)
- ✅ 2 databases in Docker multi-node (MongoDB 2-node, Redis 2-node)
- ✅ JavaScript only (Node.js + Vue.js)
- ✅ No overengineering
- ✅ Clean code with utilities
- ✅ Complete documentation

**Ready for defense!** 🎉