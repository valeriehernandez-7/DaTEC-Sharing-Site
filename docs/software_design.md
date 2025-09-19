# DaTEC - Frontend/Backend Implementation Guide

## Tabla de Rutas y Endpoints

| Ruta Frontend | Propósito | User Stories | Endpoints API | Método | Auth Required |
|---------------|-----------|--------------|---------------|---------|---------------|
| `/` | Homepage - Explorar datasets públicos | HU9, HU10 | `/api/datasets` | GET | No |
| `/login` | Iniciar sesión | HU1 | `/api/auth/login` | POST | No |
| `/register` | Crear cuenta nueva | HU1 | `/api/auth/register` | POST | No |
| `/datasets/new` | Crear nuevo dataset | HU5, HU6 | `/api/datasets` | POST | Sí |
| `/datasets/:id` | Ver detalles de dataset | HU10, HU11, HU13, HU15, HU17 | `/api/datasets/:id`<br>`/api/datasets/:id/comments` | GET | No* |
| `/datasets/:id/clone` | Clonar dataset existente | HU18 | `/api/datasets/:id/clone` | POST | Sí |
| `/datasets/:id/edit` | Editar dataset propio | HU7 | `/api/datasets/:id` | PUT | Sí (owner/admin) |
| `/datasets/:id/analytics` | Analíticas de descargas | HU13 | `/api/datasets/:id/analytics` | GET | Sí (owner/admin) |
| `/profile/:username` | Perfil de usuario | HU4, HU12, HU14, HU19, HU20 | `/api/users/:username`<br>`/api/users/:username/datasets` | GET | No* |
| `/profile/:username/edit` | Editar perfil propio | HU4 | `/api/users/:username` | PUT | Sí (own profile) |
| `/messages` | Lista de conversaciones | HU21 | `/api/messages` | GET | Sí |
| `/messages/:username` | Thread de mensajes específico | HU21 | `/api/messages/:username`<br>`/api/messages` | GET<br>POST | Sí |
| `/my-datasets` | Dashboard de mis datasets | HU5, HU7 | `/api/users/me/datasets` | GET | Sí |
| `/notifications` | Centro de notificaciones | HU8, HU19 | `/api/notifications` | GET | Sí |
| `/admin/datasets` | Cola de aprobación de datasets | HU8 | `/api/admin/datasets/pending`<br>`/api/admin/datasets/:id/approve`<br>`/api/admin/datasets/:id/reject` | GET<br>POST<br>POST | Sí (admin) |
| `/admin/users` | Gestión de usuarios | HU3 | `/api/admin/users`<br>`/api/admin/users/:username/admin` | GET<br>PATCH | Sí (admin) |
| `/admin/comments` | Moderación de comentarios | HU16 | `/api/admin/comments`<br>`/api/admin/comments/:id/toggle` | GET<br>PATCH | Sí (admin) |
| `/search` | Búsqueda avanzada | HU9 | `/api/datasets/search` | GET | No |

**Nota**: * = Algunas acciones requieren auth (votar, comentar, descargar)

---

## Endpoints API Completos

### Authentication

```javascript
POST   /api/auth/register
Body: {
  username: string,
  email: string,
  password: string,
  full_name: string,
  birth_date: string (ISO format),
  avatar?: File
}
Response: { token: string, user: UserObject }

POST   /api/auth/login
Body: {
  username_or_email: string,
  password: string
}
Response: { token: string, user: UserObject }

POST   /api/auth/logout
Response: { message: "Logged out successfully" }

GET    /api/auth/me
Headers: { Authorization: "Bearer {token}" }
Response: { user: UserObject }
```

### Users

```javascript
GET    /api/users/:username
Response: { user: UserObject, stats: { datasets, downloads, votes, followers, following } }

GET    /api/users/:username/datasets
Query: ?page=1&limit=20
Response: { datasets: DatasetObject[], total: number, page: number }

GET    /api/users/:username/followers
Response: { followers: UserObject[] }

GET    /api/users/:username/following
Response: { following: UserObject[] }

PUT    /api/users/:username
Body: { full_name?, email?, avatar?: File }
Response: { user: UserObject }

PUT    /api/users/:username/password
Body: { current_password: string, new_password: string }
Response: { message: "Password updated" }

DELETE /api/users/:username
Response: { message: "Account deleted" }

POST   /api/users/:username/follow
Response: { message: "Now following user" }

DELETE /api/users/:username/follow
Response: { message: "Unfollowed user" }

GET    /api/users/search?q={query}
Response: { users: UserObject[] }
```

### Datasets

```javascript
GET    /api/datasets
Query: ?search=&tags=&page=1&limit=20&sort_by=created_at&order=desc
Response: { datasets: DatasetObject[], total: number, page: number }

POST   /api/datasets
Body: FormData {
  dataset_name: string,
  description: string,
  tags: string[], // JSON string
  files: File[],
  header_photo?: File,
  tutorial_video?: File
}
Response: { dataset: DatasetObject }

GET    /api/datasets/:id
Response: { dataset: DatasetObject }

PUT    /api/datasets/:id
Body: { dataset_name?, description?, tags? }
Response: { dataset: DatasetObject }

DELETE /api/datasets/:id
Response: { message: "Dataset deleted" }

PATCH  /api/datasets/:id/visibility
Body: { is_public: boolean }
Response: { dataset: DatasetObject }

POST   /api/datasets/:id/clone
Body: { dataset_name: string }
Response: { dataset: DatasetObject }

POST   /api/datasets/:id/resubmit
Response: { dataset: DatasetObject, message: "Resubmitted for review" }

GET    /api/datasets/:id/files/:file_id
Response: Stream (file download)

GET    /api/datasets/:id/analytics
Response: { 
  total_downloads: number,
  unique_users: number,
  downloads: [{ user, downloaded_at }],
  chart_data: { dates: [], counts: [] }
}

POST   /api/datasets/:id/vote
Response: { voted: boolean, vote_count: number }

GET    /api/users/me/datasets
Response: { datasets: DatasetObject[] }
```

### Comments

```javascript
GET    /api/datasets/:id/comments
Response: { comments: CommentObject[] } // Tree structure

POST   /api/datasets/:id/comments
Body: { content: string, parent_comment_id?: string }
Response: { comment: CommentObject }

PUT    /api/comments/:id
Body: { content: string }
Response: { comment: CommentObject }

DELETE /api/comments/:id
Response: { message: "Comment deleted" }

POST   /api/comments/:id/like
Response: { liked: boolean, like_count: number }
```

### Messages

```javascript
GET    /api/messages
Response: { conversations: [{ other_user, last_message, timestamp }] }

GET    /api/messages/:username
Response: { messages: MessageObject[] }

POST   /api/messages
Body: { to_username: string, content: string }
Response: { message: MessageObject }
```

### Admin

```javascript
GET    /api/admin/datasets/pending
Response: { datasets: DatasetObject[] }

POST   /api/admin/datasets/:id/approve
Body: { admin_review?: string }
Response: { dataset: DatasetObject }

POST   /api/admin/datasets/:id/reject
Body: { admin_review: string }
Response: { dataset: DatasetObject }

GET    /api/admin/users
Query: ?search=&page=1&limit=20
Response: { users: UserObject[] }

PATCH  /api/admin/users/:username/admin
Body: { is_admin: boolean }
Response: { user: UserObject }

GET    /api/admin/comments
Query: ?is_active=all&page=1&limit=20
Response: { comments: CommentObject[] }

PATCH  /api/admin/comments/:id/toggle
Response: { comment: CommentObject }
```

### Notifications

```javascript
GET    /api/notifications
Response: { 
  notifications: [{
    type: "dataset_approved" | "dataset_rejected" | "new_follower" | "new_dataset",
    data: object,
    timestamp: string
  }]
}
```

---

## Componentes Frontend Detallados

### Layout Components

```jsx
// src/components/layout/AppLayout.jsx
<AppLayout>
  <Navbar />        // Logo, SearchBar, NotificationBell, UserMenu
  <main>
    {children}
  </main>
  <Footer />        // Links, Copyright
</AppLayout>

// src/components/layout/Navbar.jsx
<Navbar>
  <Logo />
  <SearchBar />
  <NotificationBell />
  <UserMenu />      // Dropdown: Profile, My Datasets, Messages, Logout
</Navbar>

// src/components/layout/AuthLayout.jsx
<AuthLayout>      // Centered layout para login/register
  {children}
</AuthLayout>

// src/components/layout/Footer.jsx
<Footer>          // Links básicos, copyright
</Footer>
```

### Shared/Common Components

```jsx
// src/components/ui/ (shadcn/ui components)
<Button />
<Card />
<Input />
<Textarea />
<Select />
<Dialog />
<DropdownMenu />
<Tabs />
<Badge />
<Avatar />
<Table />
<Toast />

// src/components/common/
<SearchBar />           // Input con debounce, autocompletado
<TagFilter />           // Multi-select de tags
<TagInput />            // Input para crear tags (react-tag-autocomplete)
<Pagination />          // Prev/Next + números de página
<LoadingSpinner />      // Skeleton loader
<ErrorBoundary />       // Wrapper para manejo de errores
<ConfirmDialog />       // Modal de confirmación reutilizable
<MarkdownEditor />      // Editor con preview (react-markdown-editor-lite)
<MarkdownPreview />     // Renderizador markdown
<EmptyState />          // Estado vacío con ilustración y mensaje
```

### Dataset Components

```jsx
// src/components/dataset/

<DatasetGrid datasets={datasets} />
  // Grid responsive (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
  // Map de DatasetCard

<DatasetCard dataset={dataset} />
  // Card con:
  // - HeaderImage (thumbnail)
  // - Title
  // - Description (truncada)
  // - Tags (badges)
  // - Owner (avatar + username)
  // - Stats (votos, descargas)
  // - Click navega a /datasets/:id

<DatasetHeader dataset={dataset} currentUser={user} />
  // Título grande
  // Owner info con avatar
  // StatusBadge (pending/approved/rejected)
  // Action buttons: Edit, Delete, Make Public, Clone, Download
  // Condicionalmente según permisos

<FileList files={files} onDownload={handleDownload} />
  // Tabla o lista de archivos
  // Columnas: Filename, Type, Size, Download button
  // Click descarga via /api/datasets/:id/files/:file_id

<FileUploader onUpload={handleUpload} maxSize={1024 * 1024 * 1024} />
  // react-dropzone
  // Drag & drop zone
  // Preview de archivos seleccionados
  // Progress bar durante upload

<VideoUploader onUpload={handleUpload} maxSize={500 * 1024 * 1024} />
  // Similar a FileUploader pero solo video
  // Preview con thumbnail

<ImageUploader onUpload={handleUpload} aspectRatio={16/9} />
  // Upload con crop opcional (react-image-crop)
  // Preview circular o rectangular

<VideoPlayer url={videoUrl} />
  // react-player
  // Controls integrados
  // Responsive

<VoteButton 
  datasetId={id} 
  initialVoted={voted} 
  initialCount={count} 
  onVote={handleVote} 
/>
  // Botón upvote con animación
  // Cambia color si voted
  // Contador animado (react-spring o framer-motion)

<DownloadButton datasetId={id} fileId={fileId} />
  // Botón con icono download
  // Muestra contador de descargas
  // Loading state durante descarga

<CloneButton datasetId={id} onClone={handleClone} />
  // Botón que abre modal o navega a /datasets/:id/clone
  // Solo visible en datasets públicos aprobados

<DatasetForm 
  initialData={data} 
  mode="create" | "edit" 
  onSubmit={handleSubmit}
/>
  // Form multi-step con react-hook-form
  // Step 1: Metadata (nombre, descripción, tags)
  // Step 2: Files upload
  // Step 3: Optional media (photo, video)
  // Validación con zod
  // Progress indicator

<StatusBadge status="pending" | "approved" | "rejected" />
  // Badge coloreado según estado
  // pending: yellow, approved: green, rejected: red

<DatasetPreview dataset={dataset} />
  // Vista compacta para modals
  // Muestra: título, descripción corta, archivos, owner
```

### Comment Components

```jsx
// src/components/comment/

<CommentSection datasetId={id} />
  // Container principal
  // CommentForm (top-level)
  // CommentList con sorting (más recientes, más likes)

<CommentThread comments={comments} depth={0} />
  // Renderiza recursivamente
  // Indentación visual por depth
  // Max depth 5 (luego "show more")

<CommentCard comment={comment} onReply={fn} onEdit={fn} onDelete={fn} />
  // Avatar del autor
  // Username + timestamp
  // Content (markdown)
  // Actions: Like, Reply, Edit (si autor), Delete (si autor/admin)
  // LikeButton integrado
  // ReplyForm expandible

<CommentForm 
  datasetId={id} 
  parentCommentId={parentId} 
  onSubmit={handleSubmit}
/>
  // Textarea con autosize
  // Submit button
  // Cancel button (si es reply)
  // Markdown preview toggle

<CommentLikeButton 
  commentId={id} 
  initialLiked={liked} 
  initialCount={count}
/>
  // Corazón o thumbs up icon
  // Toggle like/unlike
  // Contador animado
```

### User/Profile Components

```jsx
// src/components/profile/

<ProfileHeader user={user} isOwnProfile={bool} />
  // Avatar grande
  // Username + full_name
  // StatsBar (datasets, downloads, votos, followers, following)
  // FollowButton (si no es propio perfil)
  // Edit Profile button (si es propio)

<AvatarDisplay src={url} alt={name} size="sm" | "md" | "lg" />
  // Avatar circular
  // Fallback con iniciales si no hay imagen
  // Border opcional

<AvatarUpload currentAvatar={url} onUpload={handleUpload} />
  // Click para seleccionar
  // Preview inmediato
  // Crop modal opcional (react-image-crop)
  // Upload a CouchDB

<StatsBar stats={{ datasets, downloads, votes, followers, following }} />
  // Flex row con stats
  // Cada stat: número grande + label pequeño
  // Clickeable para navegar (ej. followers abre lista)

<FollowButton 
  username={username} 
  initialFollowing={bool} 
  onToggle={handleToggle}
/>
  // Toggle Follow/Unfollow
  // Loading state
  // Contador de followers actualizado optimistically

<TabNavigation activeTab={tab} onTabChange={setTab} />
  // Tabs: Datasets, Followers, Following
  // Underline animation en tab activo

<FollowerList users={users} />
  // Lista de usuarios con avatares
  // Click navega a perfil
  // Botón Follow/Unfollow en cada uno

<ProfileEditForm user={user} onSubmit={handleSubmit} />
  // Form con react-hook-form
  // Campos: full_name, email, avatar
  // Validación
  // Submit button

<PasswordChangeForm onSubmit={handleSubmit} />
  // current_password, new_password, confirm_password
  // Validación de match
  // Show/hide password toggles

<DeleteAccountButton onConfirm={handleDelete} />
  // Botón peligroso (rojo)
  // Abre ConfirmDialog con advertencia
  // Input para escribir "DELETE" como confirmación
```

### Message Components

```jsx
// src/components/message/

<MessagesLayout>
  <MessagesSidebar />     // Izquierda: lista conversaciones
  <MessageThread />       // Derecha: thread activo
</MessagesLayout>

<MessagesSidebar conversations={conversations} activeUsername={username} />
  // Lista vertical de ConversationCard
  // Scroll infinito si muchas conversaciones
  // Highlight conversación activa

<ConversationCard 
  otherUser={user} 
  lastMessage={message} 
  timestamp={time}
  isActive={bool}
/>
  // Avatar del otro usuario
  // Username
  // Preview último mensaje (truncado)
  // Timestamp relativo (date-fns)
  // Background diferente si activo

<MessageThread username={username} messages={messages} />
  // Container con scroll
  // Auto-scroll a último mensaje
  // Agrupación por fecha
  // MessageBubble para cada mensaje
  // MessageInput al final

<MessageBubble message={message} isSent={bool} />
  // Burbuja alineada derecha (sent) o izquierda (received)
  // Content
  // Timestamp pequeño
  // Avatar del sender (received only)

<MessageInput onSend={handleSend} />
  // Textarea autosize
  // Placeholder: "Type a message..."
  // Send button (icon)
  // Enter to send, Shift+Enter for newline
```

### Admin Components

```jsx
// src/components/admin/

<PendingDatasetTable datasets={datasets} onAction={fn} />
  // Table con columnas:
  // - Dataset name + owner
  // - Created date
  // - Files count
  // - Actions: View, Approve, Reject
  // Click "View" abre DatasetPreview modal

<UserManagementTable users={users} onToggleAdmin={fn} />
  // Table con columnas:
  // - Avatar + username
  // - Email
  // - Datasets count
  // - Is Admin (toggle switch)
  // - Actions: View Profile

<CommentModerationTable comments={comments} onToggle={fn} />
  // Table con columnas:
  // - Comment content (truncado)
  // - Author
  // - Dataset
  // - Is Active (toggle switch)
  // - Actions: View Context

<ApprovalModal 
  dataset={dataset} 
  onApprove={fn} 
  onReject={fn} 
  onClose={fn}
/>
  // Modal grande
  // DatasetPreview
  // Textarea para admin_review
  // Buttons: Approve, Reject, Cancel

<DatasetActionsMenu datasetId={id} />
  // DropdownMenu con opciones:
  // - View
  // - Approve / Reject
  // - Delete
  // - View Owner Profile
```

### Analytics Components

```jsx
// src/components/analytics/

<AnalyticsDashboard datasetId={id} />
  // Grid con StatsCards arriba
  // DownloadChart en el medio
  // DownloadTable abajo

<StatsCards stats={{ total_downloads, unique_users, avg_per_day }} />
  // Grid de cards con iconos
  // Números grandes + labels
  // Iconos de lucide-react

<DownloadChart data={chartData} />
  // Line chart o Bar chart (Chart.js o Recharts)
  // X-axis: dates
  // Y-axis: download count
  // Tooltip con detalles
  // Toggle: Last 7 days, Last 30 days, All time

<DownloadTable downloads={downloads} />
  // Table con columnas:
  // - User (avatar + username)
  // - Downloaded at (fecha + hora)
  // - File name
  // Sorting por fecha
  // Paginación
```

### Notification Components

```jsx
// src/components/notification/

<NotificationBell />
  // Bell icon en navbar
  // Badge con contador (red dot si > 0)
  // Click abre dropdown con últimas 5 notificaciones
  // "View all" link a /notifications

<NotificationDropdown notifications={notifications} />
  // Dropdown menu
  // Lista de NotificationCard (últimas 5)
  // "View all notifications" footer

<NotificationList notifications={notifications} />
  // Lista completa en /notifications
  // Agrupadas por fecha (Today, Yesterday, This week)
  // Click en notificación navega al recurso

<NotificationCard notification={notification} />
  // Icon según tipo
  // Mensaje formateado
  // Timestamp relativo
  // Click handler para navegar
  // Background diferente si no leído (opcional)
```

---

## Stack Tecnológico

### Frontend

#### Core
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "vite": "^5.0.0"
}
```

#### State Management & Data Fetching
```json
{
  "@tanstack/react-query": "^5.15.0",
  "zustand": "^4.4.7"
}
```

#### Forms & Validation
```json
{
  "react-hook-form": "^7.49.0",
  "zod": "^3.22.4",
  "@hookform/resolvers": "^3.3.3"
}
```

#### UI Components (shadcn/ui base)
```json
{
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-tabs": "^1.0.4",
  "@radix-ui/react-avatar": "^1.0.4",
  "@radix-ui/react-select": "^2.0.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.2.0",
  "lucide-react": "^0.300.0"
}
```

#### Specific Functionality
```json
{
  "react-dropzone": "^14.2.3",
  "react-player": "^2.14.1",
  "react-markdown": "^9.0.1",
  "react-hot-toast": "^2.4.1",
  "date-fns": "^3.0.0",
  "chart.js": "^4.4.1",
  "react-chartjs-2": "^5.2.0",
  "axios": "^1.6.5"
}
```

### Backend

#### Core
```json
{
  "express": "^4.18.2",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "helmet": "^7.1.0"
}
```

#### Database Clients
```json
{
  "mongodb": "^6.3.0",
  "redis": "^4.6.11",
  "neo4j-driver": "^5.15.0",
  "nano": "^10.1.2"
}
```

#### Authentication & Security
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "express-rate-limit": "^7.1.5",
  "express-validator": "^7.0.1"
}
```

#### File Upload & Processing
```json
{
  "multer": "^1.4.5-lts.1",
  "sharp": "^0.33.1"
}
```

#### Utilities
```json
{
  "joi": "^17.11.0",
  "winston": "^3.11.0",
  "morgan": "^1.10.0"
}
```

---

## Estructura de Carpetas

### Frontend
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # AppLayout, Navbar, Footer
│   ├── common/          # SearchBar, Pagination, etc.
│   ├── dataset/         # Dataset-related components
│   ├── comment/         # Comment components
│   ├── profile/         # Profile components
│   ├── message/         # Message components
│   ├── admin/           # Admin components
│   ├── analytics/       # Analytics components
│   └── notification/    # Notification components
├── pages/
│   ├── HomePage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── DatasetDetailPage.jsx
│   ├── DatasetCreatePage.jsx
│   ├── DatasetEditPage.jsx
│   ├── DatasetClonePage.jsx
│   ├── ProfilePage.jsx
│   ├── ProfileEditPage.jsx
│   ├── MessagesPage.jsx
│   ├── MyDatasetsPage.jsx
│   ├── NotificationsPage.jsx
│   ├── AdminDatasetsPage.jsx
│   ├── AdminUsersPage.jsx
│   ├── AdminCommentsPage.jsx
│   └── SearchPage.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useDatasets.js
│   ├── useComments.js
│   ├── useMessages.js
│   └── useNotifications.js
├── services/
│   ├── api.js           # Axios instance con interceptors
│   ├── auth.service.js
│   ├── dataset.service.js
│   ├── user.service.js
│   ├── comment.service.js
│   ├── message.service.js
│   └── admin.service.js
├── store/
│   └── authStore.js     # Zustand store para auth
├── utils/
│   ├── formatDate.js
│   ├── formatFileSize.js
│   └── validators.js
├── App.jsx
└── main.jsx
```

### Backend
```
server/
├── config/
│   ├── database.js      # DB connections
│   └── env.js           # Environment variables
├── controllers/
│   ├── auth.controller.js
│   ├── dataset.controller.js
│   ├── user.controller.js
│   ├── comment.controller.js
│   ├── message.controller.js
│   └── admin.controller.js
├── middleware/
│   ├── auth.middleware.js
│   ├── admin.middleware.js
│   ├── upload.middleware.js
│   └── errorHandler.js
├── models/
│   └── (si usas Mongoose/ODM)
├── routes/
│   ├── auth.routes.js
│   ├── dataset.routes.js
│   ├── user.routes.js
│   ├── comment.routes.js
│   ├── message.routes.js
│   └── admin.routes.js
├── services/
│   ├── mongodb.service.js
│   ├── redis.service.js
│   ├── neo4j.service.js
│   └── couchdb.service.js
├── utils/
│   ├── jwt.js
│   ├── logger.js
│   └── validators.js
└── server.js            # Entry point
```

---

## Notas de Implementación

### Autenticación
- JWT almacenado en httpOnly cookie (más seguro) o localStorage
- Middleware `authenticateToken` en todas las rutas protegidas
- Refresh token opcional (día 7 si hay tiempo)

### File Upload Flow
```javascript
// Frontend
const formData = new FormData();
formData.append('dataset_name', name);
formData.append('files', file1);
formData.append('files', file2);

// Backend
app.post('/api/datasets', upload.array('files', 10), async (req, res) => {
  // req.files contiene los archivos
  // Upload a CouchDB
  // Crear documento en MongoDB con referencias
});
```

### Real-time Updates
- **Fase 1 (MVP)**: Polling cada 30s para notificaciones
- **Fase 2**: WebSocket con Socket.io para mensajes y notificaciones

### Error Handling
- Frontend: ErrorBoundary + Toast notifications
- Backend: Middleware centralizado con códigos HTTP estándar

### Performance
- Lazy loading de rutas: `React.lazy()` + `Suspense`
- Infinite scroll en grids (react-infinite-scroll-component)
- Image lazy loading nativo: `loading="lazy"`
- React Query caching automático

Este stack está optimizado para desarrollo rápido (7 días) con JavaScript puro y componentes reutilizables.