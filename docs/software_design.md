# DaTEC - Frontend/Backend Implementation Guide

## Table of Contents
- [DaTEC - Frontend/Backend Implementation Guide](#datec---frontendbackend-implementation-guide)
  - [Table of Contents](#table-of-contents)
  - [Routes \& Endpoints Table](#routes--endpoints-table)
  - [Complete API Endpoints](#complete-api-endpoints)
    - [Authentication](#authentication)
    - [Users](#users)
    - [Datasets](#datasets)
    - [Comments](#comments)
    - [Messages](#messages)
    - [Admin](#admin)
    - [Notifications](#notifications)
  - [Frontend Components](#frontend-components)
    - [Layout Components](#layout-components)
    - [Shared/Common Components](#sharedcommon-components)
    - [Dataset Components](#dataset-components)
    - [Comment Components](#comment-components)
    - [User/Profile Components](#userprofile-components)
    - [Message Components](#message-components)
    - [Admin Components](#admin-components)
    - [Analytics Components](#analytics-components)
    - [Notification Components](#notification-components)
  - [Technology Stack](#technology-stack)
    - [Frontend](#frontend)
      - [Core](#core)
      - [State Management \& Data Fetching](#state-management--data-fetching)
      - [Forms \& Validation](#forms--validation)
      - [UI Components (shadcn/ui base)](#ui-components-shadcnui-base)
      - [Specific Functionality](#specific-functionality)
    - [Backend](#backend)
      - [Core](#core-1)
      - [Database Clients](#database-clients)
      - [Authentication \& Security](#authentication--security)
      - [File Upload \& Processing](#file-upload--processing)
      - [Utilities](#utilities)
  - [Project Structure](#project-structure)
    - [Frontend](#frontend-1)
    - [Backend](#backend-1)
  - [Implementation Notes](#implementation-notes)
    - [Authentication](#authentication-1)
    - [File Upload Flow](#file-upload-flow)
    - [Real-time Updates](#real-time-updates)
    - [Error Handling](#error-handling)
    - [Performance](#performance)

---

## Routes & Endpoints Table

| Frontend Route | Purpose | User Stories | API Endpoints | Method | Auth Required |
|---------------|---------|--------------|---------------|---------|---------------|
| `/` | Homepage - Browse public datasets | HU9, HU10 | `/api/datasets` | GET | No |
| `/login` | User login | HU1 | `/api/auth/login` | POST | No |
| `/register` | User registration | HU1 | `/api/auth/register` | POST | No |
| `/datasets/new` | Create new dataset | HU5, HU6 | `/api/datasets` | POST | Yes |
| `/datasets/:id` | Dataset details view | HU10, HU11, HU13, HU15, HU17 | `/api/datasets/:id`<br>`/api/datasets/:id/comments` | GET | No* |
| `/datasets/:id/clone` | Clone existing dataset | HU18 | `/api/datasets/:id/clone` | POST | Yes |
| `/datasets/:id/edit` | Edit own dataset | HU7 | `/api/datasets/:id` | PUT | Yes (owner/admin) |
| `/datasets/:id/analytics` | Download analytics | HU13 | `/api/datasets/:id/analytics` | GET | Yes (owner/admin) |
| `/profile/:username` | User profile | HU4, HU12, HU14, HU19, HU20 | `/api/users/:username`<br>`/api/users/:username/datasets` | GET | No* |
| `/profile/:username/edit` | Edit own profile | HU4 | `/api/users/:username` | PUT | Yes (own profile) |
| `/messages` | Messages inbox | HU21 | `/api/messages` | GET | Yes |
| `/messages/:username` | Message thread | HU21 | `/api/messages/:username`<br>`/api/messages` | GET<br>POST | Yes |
| `/my-datasets` | My datasets dashboard | HU5, HU7 | `/api/users/me/datasets` | GET | Yes |
| `/notifications` | Notifications center | HU8, HU19 | `/api/notifications` | GET | Yes |
| `/admin/datasets` | Dataset approval queue | HU8 | `/api/admin/datasets/pending`<br>`/api/admin/datasets/:id/approve`<br>`/api/admin/datasets/:id/reject` | GET<br>POST<br>POST | Yes (admin) |
| `/admin/users` | User management | HU3 | `/api/admin/users`<br>`/api/admin/users/:username/admin` | GET<br>PATCH | Yes (admin) |
| `/admin/comments` | Comment moderation | HU16 | `/api/admin/comments`<br>`/api/admin/comments/:id/toggle` | GET<br>PATCH | Yes (admin) |
| `/search` | Advanced search | HU9 | `/api/datasets/search` | GET | No |

**Note**: * = Some actions require authentication (vote, comment, download)

---

## Complete API Endpoints

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
Response: { 
  user: UserObject, 
  stats: { 
    datasets: number, 
    downloads: number, 
    votes: number, 
    followers: number, 
    following: number 
  } 
}

GET    /api/users/:username/datasets
Query: ?page=1&limit=20
Response: { 
  datasets: DatasetObject[], 
  total: number, 
  page: number 
}

GET    /api/users/:username/followers
Response: { followers: UserObject[] }

GET    /api/users/:username/following
Response: { following: UserObject[] }

PUT    /api/users/:username
Body: { full_name?, email?, avatar?: File }
Response: { user: UserObject }

PUT    /api/users/:username/password
Body: { 
  current_password: string, 
  new_password: string 
}
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
Response: { 
  datasets: DatasetObject[], 
  total: number, 
  page: number 
}

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
Response: { 
  dataset: DatasetObject, 
  message: "Resubmitted for review" 
}

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
Response: { 
  voted: boolean, 
  vote_count: number 
}

GET    /api/users/me/datasets
Response: { datasets: DatasetObject[] }
```

### Comments

```javascript
GET    /api/datasets/:id/comments
Response: { comments: CommentObject[] } // Tree structure

POST   /api/datasets/:id/comments
Body: { 
  content: string, 
  parent_comment_id?: string 
}
Response: { comment: CommentObject }

PUT    /api/comments/:id
Body: { content: string }
Response: { comment: CommentObject }

DELETE /api/comments/:id
Response: { message: "Comment deleted" }

POST   /api/comments/:id/like
Response: { 
  liked: boolean, 
  like_count: number 
}
```

### Messages

```javascript
GET    /api/messages
Response: { 
  conversations: [{ 
    other_user, 
    last_message, 
    timestamp 
  }] 
}

GET    /api/messages/:username
Response: { messages: MessageObject[] }

POST   /api/messages
Body: { 
  to_username: string, 
  content: string 
}
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

## Frontend Components

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
<AuthLayout>      // Centered layout for login/register
  {children}
</AuthLayout>

// src/components/layout/Footer.jsx
<Footer>          // Basic links, copyright
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
<SearchBar />           // Input with debounce, autocomplete
<TagFilter />           // Multi-select tags
<TagInput />            // Input for creating tags (react-tag-autocomplete)
<Pagination />          // Prev/Next + page numbers
<LoadingSpinner />      // Skeleton loader
<ErrorBoundary />       // Error handling wrapper
<ConfirmDialog />       // Reusable confirmation modal
<MarkdownEditor />      // Editor with preview (react-markdown-editor-lite)
<MarkdownPreview />     // Markdown renderer
<EmptyState />          // Empty state with illustration and message
```

### Dataset Components

```jsx
// src/components/dataset/

<DatasetGrid datasets={datasets} />
  // Responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
  // Maps DatasetCard components

<DatasetCard dataset={dataset} />
  // Card with:
  // - HeaderImage (thumbnail)
  // - Title
  // - Description (truncated)
  // - Tags (badges)
  // - Owner (avatar + username)
  // - Stats (votes, downloads)
  // - Click navigates to /datasets/:id

<DatasetHeader dataset={dataset} currentUser={user} />
  // Large title
  // Owner info with avatar
  // StatusBadge (pending/approved/rejected)
  // Action buttons: Edit, Delete, Make Public, Clone, Download
  // Conditionally based on permissions

<FileList files={files} onDownload={handleDownload} />
  // Table or list of files
  // Columns: Filename, Type, Size, Download button
  // Click downloads via /api/datasets/:id/files/:file_id

<FileUploader onUpload={handleUpload} maxSize={1024 * 1024 * 1024} />
  // react-dropzone
  // Drag & drop zone
  // Preview of selected files
  // Progress bar during upload

<VideoUploader onUpload={handleUpload} maxSize={500 * 1024 * 1024} />
  // Similar to FileUploader but video only
  // Preview with thumbnail

<ImageUploader onUpload={handleUpload} aspectRatio={16/9} />
  // Upload with optional crop (react-image-crop)
  // Circular or rectangular preview

<VideoPlayer url={videoUrl} />
  // react-player
  // Integrated controls
  // Responsive

<VoteButton 
  datasetId={id} 
  initialVoted={voted} 
  initialCount={count} 
  onVote={handleVote} 
/>
  // Upvote button with animation
  // Changes color if voted
  // Animated counter (react-spring or framer-motion)

<DownloadButton datasetId={id} fileId={fileId} />
  // Button with download icon
  // Shows download counter
  // Loading state during download

<CloneButton datasetId={id} onClone={handleClone} />
  // Button that opens modal or navigates to /datasets/:id/clone
  // Only visible on public approved datasets

<DatasetForm 
  initialData={data} 
  mode="create" | "edit" 
  onSubmit={handleSubmit}
/>
  // Multi-step form with react-hook-form
  // Step 1: Metadata (name, description, tags)
  // Step 2: Files upload
  // Step 3: Optional media (photo, video)
  // Validation with zod
  // Progress indicator

<StatusBadge status="pending" | "approved" | "rejected" />
  // Colored badge by status
  // pending: yellow, approved: green, rejected: red

<DatasetPreview dataset={dataset} />
  // Compact view for modals
  // Shows: title, short description, files, owner
```

### Comment Components

```jsx
// src/components/comment/

<CommentSection datasetId={id} />
  // Main container
  // CommentForm (top-level)
  // CommentList with sorting (most recent, most likes)

<CommentThread comments={comments} depth={0} />
  // Renders recursively
  // Visual indentation by depth
  // Max depth 5 (then "show more")

<CommentCard comment={comment} onReply={fn} onEdit={fn} onDelete={fn} />
  // Author avatar
  // Username + timestamp
  // Content (markdown)
  // Actions: Like, Reply, Edit (if author), Delete (if author/admin)
  // Integrated LikeButton
  // Expandable ReplyForm

<CommentForm 
  datasetId={id} 
  parentCommentId={parentId} 
  onSubmit={handleSubmit}
/>
  // Textarea with autosize
  // Submit button
  // Cancel button (if reply)
  // Markdown preview toggle

<CommentLikeButton 
  commentId={id} 
  initialLiked={liked} 
  initialCount={count}
/>
  // Heart or thumbs up icon
  // Toggle like/unlike
  // Animated counter
```

### User/Profile Components

```jsx
// src/components/profile/

<ProfileHeader user={user} isOwnProfile={bool} />
  // Large avatar
  // Username + full_name
  // StatsBar (datasets, downloads, votes, followers, following)
  // FollowButton (if not own profile)
  // Edit Profile button (if own profile)

<AvatarDisplay src={url} alt={name} size="sm" | "md" | "lg" />
  // Circular avatar
  // Fallback with initials if no image
  // Optional border

<AvatarUpload currentAvatar={url} onUpload={handleUpload} />
  // Click to select
  // Immediate preview
  // Optional crop modal (react-image-crop)
  // Upload to CouchDB

<StatsBar stats={{ datasets, downloads, votes, followers, following }} />
  // Flex row with stats
  // Each stat: large number + small label
  // Clickable to navigate (e.g., followers opens list)

<FollowButton 
  username={username} 
  initialFollowing={bool} 
  onToggle={handleToggle}
/>
  // Toggle Follow/Unfollow
  // Loading state
  // Follower counter updated optimistically

<TabNavigation activeTab={tab} onTabChange={setTab} />
  // Tabs: Datasets, Followers, Following
  // Underline animation on active tab

<FollowerList users={users} />
  // List of users with avatars
  // Click navigates to profile
  // Follow/Unfollow button on each

<ProfileEditForm user={user} onSubmit={handleSubmit} />
  // Form with react-hook-form
  // Fields: full_name, email, avatar
  // Validation
  // Submit button

<PasswordChangeForm onSubmit={handleSubmit} />
  // current_password, new_password, confirm_password
  // Match validation
  // Show/hide password toggles

<DeleteAccountButton onConfirm={handleDelete} />
  // Danger button (red)
  // Opens ConfirmDialog with warning
  // Input to type "DELETE" as confirmation
```

### Message Components

```jsx
// src/components/message/

<MessagesLayout>
  <MessagesSidebar />     // Left: conversation list
  <MessageThread />       // Right: active thread
</MessagesLayout>

<MessagesSidebar conversations={conversations} activeUsername={username} />
  // Vertical list of ConversationCard
  // Infinite scroll if many conversations
  // Highlight active conversation

<ConversationCard 
  otherUser={user} 
  lastMessage={message} 
  timestamp={time}
  isActive={bool}
/>
  // Other user's avatar
  // Username
  // Last message preview (truncated)
  // Relative timestamp (date-fns)
  // Different background if active

<MessageThread username={username} messages={messages} />
  // Container with scroll
  // Auto-scroll to last message
  // Grouped by date
  // MessageBubble for each message
  // MessageInput at bottom

<MessageBubble message={message} isSent={bool} />
  // Bubble aligned right (sent) or left (received)
  // Content
  // Small timestamp
  // Sender avatar (received only)

<MessageInput onSend={handleSend} />
  // Autosize textarea
  // Placeholder: "Type a message..."
  // Send button (icon)
  // Enter to send, Shift+Enter for newline
```

### Admin Components

```jsx
// src/components/admin/

<PendingDatasetTable datasets={datasets} onAction={fn} />
  // Table with columns:
  // - Dataset name + owner
  // - Created date
  // - Files count
  // - Actions: View, Approve, Reject
  // Click "View" opens DatasetPreview modal

<UserManagementTable users={users} onToggleAdmin={fn} />
  // Table with columns:
  // - Avatar + username
  // - Email
  // - Datasets count
  // - Is Admin (toggle switch)
  // - Actions: View Profile

<CommentModerationTable comments={comments} onToggle={fn} />
  // Table with columns:
  // - Comment content (truncated)
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
  // Large modal
  // DatasetPreview
  // Textarea for admin_review
  // Buttons: Approve, Reject, Cancel

<DatasetActionsMenu datasetId={id} />
  // DropdownMenu with options:
  // - View
  // - Approve / Reject
  // - Delete
  // - View Owner Profile
```

### Analytics Components

```jsx
// src/components/analytics/

<AnalyticsDashboard datasetId={id} />
  // Grid with StatsCards at top
  // DownloadChart in middle
  // DownloadTable at bottom

<StatsCards stats={{ total_downloads, unique_users, avg_per_day }} />
  // Grid of cards with icons
  // Large numbers + labels
  // Icons from lucide-react

<DownloadChart data={chartData} />
  // Line chart or Bar chart (Chart.js or Recharts)
  // X-axis: dates
  // Y-axis: download count
  // Tooltip with details
  // Toggle: Last 7 days, Last 30 days, All time

<DownloadTable downloads={downloads} />
  // Table with columns:
  // - User (avatar + username)
  // - Downloaded at (date + time)
  // - File name
  // Sorting by date
  // Pagination
```

### Notification Components

```jsx
// src/components/notification/

<NotificationBell />
  // Bell icon in navbar
  // Badge with counter (red dot if > 0)
  // Click opens dropdown with last 5 notifications
  // "View all" link to /notifications

<NotificationDropdown notifications={notifications} />
  // Dropdown menu
  // List of NotificationCard (last 5)
  // "View all notifications" footer

<NotificationList notifications={notifications} />
  // Full list at /notifications
  // Grouped by date (Today, Yesterday, This week)
  // Click on notification navigates to resource

<NotificationCard notification={notification} />
  // Icon by type
  // Formatted message
  // Relative timestamp
  // Click handler to navigate
  // Different background if unread (optional)
```

---

## Technology Stack

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

## Project Structure

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
│   ├── api.js           # Axios instance with interceptors
│   ├── auth.service.js
│   ├── dataset.service.js
│   ├── user.service.js
│   ├── comment.service.js
│   ├── message.service.js
│   └── admin.service.js
├── store/
│   └── authStore.js     # Zustand store for auth
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
│   └── (if using Mongoose/ODM)
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

## Implementation Notes

### Authentication
- JWT stored in httpOnly cookie (more secure) or localStorage
- `authenticateToken` middleware on all protected routes
- Optional refresh token (day 7 if time permits)

### File Upload Flow
```javascript
// Frontend
const formData = new FormData();
formData.append('dataset_name', name);
formData.append('files', file1);
formData.append('files', file2);

// Backend
app.post('/api/datasets', upload.array('files', 10), async (req, res) => {
  // req.files contains the files
  // Upload to CouchDB
  // Create document in MongoDB with references
});
```

### Real-time Updates
- **Phase 1 (MVP)**: Polling every 30s for notifications
- **Phase 2**: WebSocket with Socket.io for messages and notifications

### Error Handling
- Frontend: ErrorBoundary + Toast notifications
- Backend: Centralized middleware with standard HTTP codes

### Performance
- Lazy loading routes: `React.lazy()` + `Suspense`
- Infinite scroll in grids (react-infinite-scroll-component)
- Native image lazy loading: `loading="lazy"`
- React Query automatic caching