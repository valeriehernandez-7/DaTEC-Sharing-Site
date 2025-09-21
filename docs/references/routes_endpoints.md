# API Endpoints

| Endpoint | Method | HU | Auth | Database(s) | Description |
|----------|--------|----|----- |-------------|-------------|
| **AUTENTICACIÓN** |
| `/api/auth/register` | POST | #1 | No | Mongo + Neo4j + CouchDB | Registro con avatar opcional |
| `/api/auth/login` | POST | #1 | No | Mongo | Login → JWT token |
| `/api/auth/me` | GET | #1 | Yes | Mongo | Info usuario actual |
| **USUARIOS** |
| `/api/users/` | GET | #14 | No | Mongo | Listar usuarios |
| `/api/users/search?q=term` | GET | #14 | No | Mongo | Buscar usuarios |
| `/api/users/:username` | GET | #4, #14 | No | Mongo | Perfil público |
| `/api/users/:username` | PUT | #4 | Yes (owner) | Mongo + CouchDB | Editar perfil + avatar |
| `/api/users/:username/datasets` | GET | #12 | No* | Mongo | Datasets del usuario |
| `/api/users/:username/followers` | GET | #20 | No | Neo4j | Lista de seguidores |
| `/api/users/:username/following` | GET | #19 | No | Neo4j | Lista de seguidos |
| `/api/users/:username/follow` | POST | #19 | Yes | Neo4j + Redis | Seguir usuario |
| `/api/users/:username/follow` | DELETE | #19 | Yes | Neo4j | Dejar de seguir |
| **DATASETS** |
| `/api/datasets` | POST | #5 | Yes | Mongo + CouchDB + Neo4j + Redis | Crear dataset (multipart) |
| `/api/datasets` | GET | #9, #10 | No | Mongo | Listar datasets públicos |
| `/api/datasets/search?q=term` | GET | #9 | No | Mongo | Buscar datasets |
| `/api/datasets/:datasetId` | GET | #10, #11 | No* | Mongo | Detalles completos |
| `/api/datasets/:datasetId` | PUT | #7 | Yes (owner) | Mongo + CouchDB | Editar metadata/archivos |
| `/api/datasets/:datasetId` | DELETE | #7 | Yes (owner/admin) | All 4 DBs | Eliminar dataset |
| `/api/datasets/:datasetId/visibility` | PATCH | #7 | Yes (owner) | Mongo | Toggle público/privado |
| `/api/datasets/:datasetId/request-approval` | POST | #6 | Yes (owner) | Mongo | Solicitar aprobación |
| `/api/datasets/:datasetId/clone` | POST | #18 | Yes | All 4 DBs | Clonar dataset |
| `/api/datasets/:datasetId/downloads` | GET | #13 | Yes | Neo4j + Mongo | Estadísticas descarga |
| `/api/datasets/:datasetId/files/` | GET | #10 | Yes | CouchDB + Neo4j + Redis | Listar archivos o descargar archivos |
| `/api/datasets/:datasetId/files/:fileId` | GET | #13 | Yes | CouchDB + Neo4j + Redis | Descargar archivo |
| **COMENTARIOS** |
| `/api/datasets/:datasetId/comments` | GET | #15 | No | Mongo | Árbol de comentarios |
| `/api/datasets/:datasetId/comments` | POST | #15 | Yes | Mongo | Crear comentario/reply |
| `/api/comments/:commentId` | PATCH | #16 | Yes (admin) | Mongo | Soft delete (is_active=false) |
| **VOTOS** |
| `/api/datasets/:datasetId/votes` | GET | #17 | No | Mongo | Listar votantes |
| `/api/datasets/:datasetId/votes` | POST | #17 | Yes | Mongo + Redis | Votar dataset |
| `/api/datasets/:datasetId/votes` | DELETE | #17 | Yes | Mongo + Redis | Quitar voto |
| `/api/datasets/:datasetId/votes/me` | GET | #17 | Yes | Mongo | Verificar si votó |
| **MENSAJES** |
| `/api/messages/:username` | GET | #21 | Yes | Mongo | Thread con usuario |
| `/api/messages/:username` | POST | #21 | Yes | Mongo | Enviar mensaje a usuario |
| **NOTIFICACIONES** |
| `/api/notifications/me` | GET | #8, #19 | Yes | Redis | Notificaciones usuario |
| **ADMIN** |
| `/api/admin/datasets/pending` | GET | #8 | Yes (admin) | Mongo | Datasets pendientes |
| `/api/admin/datasets/:id/review` | POST | #8 | Yes (admin) | Mongo + Redis | Aprobar/rechazar + notif |
| `/api/admin/users/:username/promote` | PATCH | #3 | Yes (admin) | Mongo | Promover a admin |