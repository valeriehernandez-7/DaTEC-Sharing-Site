<template>
    <div class="admin-panel container mx-auto px-4 py-6">
        <!-- Header Section -->
        <div class="admin-header mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p class="text-gray-600 mt-2">
                Manage users, datasets, and comments across the platform
            </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <ProgressSpinner />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
            <Message severity="error" :closable="false">
                {{ error }}
            </Message>
            <Button label="Retry" icon="pi pi-refresh" @click="loadAdminData" class="mt-4" />
        </div>

        <!-- Main Content -->
        <div v-else>
            <!-- Stats Cards -->
            <div class="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card class="stat-card">
                    <template #content>
                        <div class="stat-content flex items-center gap-4">
                            <div class="stat-icon bg-blue-100 p-3 rounded-full">
                                <i class="pi pi-cog text-blue-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-gray-900">
                                    {{ stats.total_admins || 0 }}
                                </h3>
                                <p class="text-gray-600 text-sm">Total Admins</p>
                            </div>
                        </div>
                    </template>
                </Card>

                <Card class="stat-card">
                    <template #content>
                        <div class="stat-content flex items-center gap-4">
                            <div class="stat-icon bg-green-100 p-3 rounded-full">
                                <i class="pi pi-users text-green-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-gray-900">
                                    {{ stats.total_users || 0 }}
                                </h3>
                                <p class="text-gray-600 text-sm">Total Users</p>
                            </div>
                        </div>
                    </template>
                </Card>

                <Card class="stat-card">
                    <template #content>
                        <div class="stat-content flex items-center gap-4">
                            <div class="stat-icon bg-purple-100 p-3 rounded-full">
                                <i class="pi pi-box text-purple-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-gray-900">
                                    {{ stats.total_datasets || 0 }}
                                </h3>
                                <p class="text-gray-600 text-sm">Total Datasets</p>
                            </div>
                        </div>
                    </template>
                </Card>

                <Card class="stat-card">
                    <template #content>
                        <div class="stat-content flex items-center gap-4">
                            <div class="stat-icon bg-amber-100 p-3 rounded-full">
                                <i class="pi pi-file-check text-amber-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-gray-900">
                                    {{ stats.pending_datasets || 0 }}
                                </h3>
                                <p class="text-gray-600 text-sm">Pending Requests</p>
                            </div>
                        </div>
                    </template>
                </Card>
            </div>

            <!-- Main Tabs -->
            <Card>
                <template #content>
                    <Tabs v-model:value="activeTab">
                        <TabList class="border-b border-gray-200">
                            <Tab value="roles" class="mr-4">
                                <button
                                    class="tab-button flex items-center gap-2 py-3 px-4 font-medium"
                                    :class="{
                                        'text-blue-600 border-b-2 border-blue-600':
                                            activeTab === 'roles',
                                    }"
                                >
                                    <i class="pi pi-users"></i>
                                    Roles
                                </button>
                            </Tab>
                            <Tab value="requests" class="mr-4">
                                <button
                                    class="tab-button flex items-center gap-2 py-3 px-4 font-medium"
                                    :class="{
                                        'text-blue-600 border-b-2 border-blue-600':
                                            activeTab === 'requests',
                                    }"
                                >
                                    <i class="pi pi-file-check"></i>
                                    Requests
                                    <Badge
                                        v-if="pendingDatasets.length > 0"
                                        :value="pendingDatasets.length"
                                        severity="danger"
                                        class="ml-1"
                                    />
                                </button>
                            </Tab>
                            <Tab value="comments">
                                <button
                                    class="tab-button flex items-center gap-2 py-3 px-4 font-medium"
                                    :class="{
                                        'text-blue-600 border-b-2 border-blue-600':
                                            activeTab === 'comments',
                                    }"
                                >
                                    <i class="pi pi-comments"></i>
                                    Moderation
                                </button>
                            </Tab>
                        </TabList>

                        <!-- Roles Tab -->
                        <TabPanel value="roles">
                            <div class="tab-content py-6">
                                <!-- Search Section -->
                                <div class="search-section mb-6">
                                    <div
                                        class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
                                    >
                                        <span class="w-full sm:w-auto">
                                            <InputText
                                                v-model="userSearch"
                                                placeholder="Search users by username or name"
                                                class="w-full sm:w-100"
                                            />
                                        </span>
                                        <div class="text-sm text-gray-500 py-5">
                                            {{ filteredUsers.length }} users found
                                            <i class="pi pi-search px-2"></i>
                                        </div>
                                    </div>
                                </div>

                                <!-- Users Table -->
                                <DataTable
                                    v-if="filteredUsers.length !== 0"
                                    :value="filteredUsers"
                                    :loading="loadingUsers"
                                    :paginator="true"
                                    :rows="10"
                                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} users"
                                    class="p-datatable-sm"
                                >
                                    <Column header="User" sortable field="username">
                                        <template #body="{ data }">
                                            <div
                                                class="user-cell flex items-center gap-3"
                                                @click="goToProfile(data.username)"
                                            >
                                                <Avatar
                                                    v-if="data.avatarUrl"
                                                    :image="getAvatarUrl(data)"
                                                    shape="circle"
                                                    size="small"
                                                    :alt="data.username"
                                                />
                                                <Avatar
                                                    v-else
                                                    :label="getInitials(data.fullName)"
                                                    shape="circle"
                                                    size="small"
                                                    :class="getUserAvatarClasses(data.username)"
                                                />
                                                <div>
                                                    <div class="font-medium text-gray-900">
                                                        {{ data.fullName }}
                                                    </div>
                                                    <div class="text-sm text-gray-500">
                                                        {{ data.username }}
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </Column>

                                    <Column header="Role" sortable field="isAdmin">
                                        <template #body="{ data }">
                                            <Tag
                                                :value="data.isAdmin ? 'Admin' : 'User'"
                                                :severity="data.isAdmin ? 'success' : 'secondary'"
                                            />
                                        </template>
                                    </Column>

                                    <Column header="Member Since" sortable field="createdAt">
                                        <template #body="{ data }">
                                            {{ formatDate(data.createdAt) }}
                                        </template>
                                    </Column>

                                    <Column header="Actions" style="width: 200px">
                                        <template #body="{ data }">
                                            <div class="flex gap-2">
                                                <Button
                                                    v-if="!data.isAdmin"
                                                    label="Promote"
                                                    icon="pi pi-user-plus"
                                                    size="small"
                                                    @click="promoteUser(data)"
                                                    rounded
                                                    :loading="loadingActions[data.userId]"
                                                    :disabled="
                                                        data.userId === authStore.user?.userId
                                                    "
                                                />
                                                <Button
                                                    v-else
                                                    label="Demote"
                                                    icon="pi pi-user-minus"
                                                    size="small"
                                                    severity="danger"
                                                    @click="demoteUser(data)"
                                                    rounded
                                                    :loading="loadingActions[data.userId]"
                                                    :disabled="
                                                        data.userId === authStore.user?.userId
                                                    "
                                                />
                                            </div>
                                        </template>
                                    </Column>
                                </DataTable>

                                <!-- Empty State -->
                                <div
                                    v-if="filteredUsers.length === 0 && !loadingUsers"
                                    class="text-center py-12 text-gray-500"
                                >
                                    <i class="pi pi-users text-4xl mb-3"></i>
                                    <p>No users found</p>
                                    <p class="text-sm">Try adjusting your search terms</p>
                                </div>
                            </div>
                        </TabPanel>

                        <!-- Requests Tab -->
                        <TabPanel value="requests">
                            <div class="tab-content py-6">
                                <!-- Pending Datasets Table -->
                                <DataTable
                                    v-if="pendingDatasets.length !== 0"
                                    :value="pendingDatasets"
                                    :loading="loadingDatasets"
                                    :paginator="true"
                                    :rows="10"
                                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} datasets"
                                    class="p-datatable-sm"
                                >
                                    <Column header="Dataset Name" sortable field="dataset_name">
                                        <template #body="{ data }">
                                            <div class="font-medium text-gray-900">
                                                {{ data.dataset_name }}
                                            </div>
                                            <div class="text-sm text-gray-500 mt-1 line-clamp-2">
                                                {{ data.description }}
                                            </div>
                                        </template>
                                    </Column>

                                    <Column header="Author" sortable field="owner.username">
                                        <template #body="{ data }">
                                            <div
                                                class="user-cell flex items-center gap-3"
                                                @click="goToProfile(data.owner?.username)"
                                            >
                                                <Avatar
                                                    v-if="data.owner?.avatarUrl"
                                                    :image="getAvatarUrl(data.owner)"
                                                    shape="circle"
                                                    size="small"
                                                    :alt="data.owner?.username"
                                                />
                                                <Avatar
                                                    v-else
                                                    :label="getInitials(data.owner?.fullName)"
                                                    shape="circle"
                                                    size="small"
                                                    :class="
                                                        getUserAvatarClasses(data.owner?.username)
                                                    "
                                                />
                                                <div>
                                                    <div class="font-medium text-gray-900">
                                                        {{ data.owner?.fullName }}
                                                    </div>
                                                    <div class="text-sm text-gray-500">
                                                        {{ data.owner?.username }}
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </Column>

                                    <Column header="Files">
                                        <template #body="{ data }">
                                            <Tag
                                                :value="`${data.file_count} files`"
                                                severity="info"
                                            />
                                        </template>
                                    </Column>

                                    <Column header="Created" sortable field="created_at">
                                        <template #body="{ data }">
                                            {{ formatDate(data.created_at) }}
                                        </template>
                                    </Column>

                                    <Column header="Actions" style="width: 180px">
                                        <template #body="{ data }">
                                            <div class="flex gap-2">
                                                <Button
                                                    icon="pi pi-eye"
                                                    severity="info"
                                                    text
                                                    rounded
                                                    @click="viewDataset(data.dataset_id)"
                                                    v-tooltip.top="'View Dataset'"
                                                />
                                                <Button
                                                    icon="pi pi-check"
                                                    severity="success"
                                                    text
                                                    rounded
                                                    @click="approveDataset(data)"
                                                    :loading="loadingActions[data.dataset_id]"
                                                    v-tooltip.top="'Approve Dataset'"
                                                />
                                                <Button
                                                    icon="pi pi-times"
                                                    severity="danger"
                                                    text
                                                    rounded
                                                    @click="rejectDataset(data)"
                                                    :loading="loadingActions[data.dataset_id]"
                                                    v-tooltip.top="'Reject Dataset'"
                                                />
                                            </div>
                                        </template>
                                    </Column>
                                </DataTable>

                                <!-- Empty State -->
                                <div
                                    v-if="pendingDatasets.length === 0 && !loadingDatasets"
                                    class="text-center py-12 text-gray-500"
                                >
                                    <i class="pi pi-file-check text-4xl mb-3"></i>
                                    <p>No pending dataset requests</p>
                                    <p class="text-sm">All datasets have been reviewed</p>
                                </div>
                            </div>
                        </TabPanel>

                        <!-- Comments Tab -->
                        <TabPanel value="comments">
                            <div class="tab-content py-6">
                                <!-- Disabled Comments Table -->
                                <DataTable
                                    v-if="disabledComments.length !== 0"
                                    :value="disabledComments"
                                    :loading="loadingComments"
                                    :paginator="true"
                                    :rows="10"
                                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} comments"
                                    class="p-datatable-sm"
                                >
                                    <Column header="Comment">
                                        <template #body="{ data }">
                                            <div class="max-w-md">
                                                <span class="comment-preview">{{
                                                    truncateText(data.content, 100)
                                                }}</span>
                                                <small class="text-gray-500 block mt-1">
                                                    Full: {{ data.content }}
                                                </small>
                                            </div>
                                        </template>
                                    </Column>

                                    <Column header="Dataset" sortable field="dataset.dataset_name">
                                        <template #body="{ data }">
                                            <Button
                                                :label="data.dataset?.dataset_name"
                                                link
                                                @click="goToDataset(data.dataset?.dataset_id)"
                                            />
                                        </template>
                                    </Column>

                                    <Column header="Author" sortable field="author.username">
                                        <template #body="{ data }">
                                            <div class="flex items-center gap-1">
                                                <Button
                                                    :label="data.author?.username"
                                                    link
                                                    @click="goToProfile(data.author?.username)"
                                                />
                                            </div>
                                        </template>
                                    </Column>

                                    <Column header="Moderator" sortable field="disabled_by">
                                        <template #body="{ data }">
                                            <div class="flex items-center gap-1">
                                                <Button
                                                    :label="data.disabled_by"
                                                    link
                                                    @click="goToProfile(data.disabled_by)"
                                                />
                                            </div>
                                        </template>
                                    </Column>

                                    <Column header="Date" sortable field="disabled_at">
                                        <template #body="{ data }">
                                            {{ formatDate(data.disabled_at) }}
                                        </template>
                                    </Column>

                                    <Column header="Actions" style="width: 120px">
                                        <template #body="{ data }">
                                            <div class="flex gap-2">
                                                <Button
                                                    icon="pi pi-eye"
                                                    severity="info"
                                                    text
                                                    rounded
                                                    @click="viewCommentInContext(data)"
                                                    v-tooltip.top="'View in Context'"
                                                />
                                                <Button
                                                    icon="pi pi-check"
                                                    severity="success"
                                                    text
                                                    rounded
                                                    @click="enableComment(data)"
                                                    :loading="loadingActions[data.comment_id]"
                                                    v-tooltip.top="'Unhide Comment'"
                                                />
                                            </div>
                                        </template>
                                    </Column>
                                </DataTable>

                                <!-- Empty State -->
                                <div
                                    v-if="disabledComments.length === 0 && !loadingComments"
                                    class="text-center py-12 text-gray-500"
                                >
                                    <i class="pi pi-comments text-4xl mb-3"></i>
                                    <p>No hidden comments</p>
                                    <p class="text-sm">All comments are currently visible</p>
                                </div>
                            </div>
                        </TabPanel>
                    </Tabs>
                </template>
            </Card>
        </div>

        <!-- Dataset Review Dialog -->
        <Dialog
            v-model:visible="showReviewDialog"
            :style="{ width: '500px' }"
            header="Review Dataset"
            :modal="true"
        >
            <div class="p-fluid">
                <div class="field">
                    <label for="adminReview" class="font-medium">Admin Review (Optional)</label>
                    <Textarea
                        id="adminReview"
                        v-model="adminReview"
                        rows="3"
                        placeholder="Add any feedback or reason for approval/rejection..."
                        class="w-full mt-2"
                    />
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="cancelReview" />
                <Button
                    :label="reviewAction === 'approve' ? 'Approve' : 'Reject'"
                    :icon="reviewAction === 'approve' ? 'pi pi-check' : 'pi pi-times'"
                    :severity="reviewAction === 'approve' ? 'success' : 'danger'"
                    @click="confirmReview"
                    :loading="reviewLoading"
                />
            </template>
        </Dialog>

        <!-- Confirm Dialog -->
        <ConfirmDialog />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

/**
 * Reactive state management
 */
const loading = ref(true)
const error = ref('')
const activeTab = ref('roles')

// Stats
const stats = ref({
    total_admins: 0,
    total_users: 0,
    total_datasets: 0,
    pending_datasets: 0,
})

// Users
const allUsers = ref([])
const userSearch = ref('')
const loadingUsers = ref(false)

// Datasets
const pendingDatasets = ref([])
const loadingDatasets = ref(false)

// Comments
const disabledComments = ref([])
const loadingComments = ref(false)

// Actions loading states
const loadingActions = ref({})

// Review dialog
const showReviewDialog = ref(false)
const reviewAction = ref('approve')
const adminReview = ref('')
const reviewLoading = ref(false)
const currentReviewDataset = ref(null)

/**
 * Computed properties
 */

/**
 * Filtered users based on search query
 * @returns {Array} Filtered users array
 */
const filteredUsers = computed(() => {
    if (!userSearch.value.trim()) {
        return allUsers.value
    }

    const query = userSearch.value.toLowerCase()
    return allUsers.value.filter(
        (user) =>
            user.username.toLowerCase().includes(query) ||
            (user.fullName && user.fullName.toLowerCase().includes(query)),
    )
})

/**
 * Lifecycle hooks
 */
onMounted(() => {
    loadAdminData()
})

/**
 * Watch for tab changes to load data on demand
 */
watch(activeTab, (newTab) => {
    if (newTab === 'roles' && allUsers.value.length === 0) {
        loadUsers()
    } else if (newTab === 'requests' && pendingDatasets.value.length === 0) {
        loadPendingDatasets()
    } else if (newTab === 'comments' && disabledComments.value.length === 0) {
        loadDisabledComments()
    }
})

/**
 * Load all admin data for dashboard
 */
const loadAdminData = async () => {
    loading.value = true
    error.value = ''

    try {
        await Promise.all([loadStats(), loadUsers(), loadPendingDatasets(), loadDisabledComments()])
    } catch (err) {
        error.value = 'Failed to load admin data'
        console.error('Error loading admin data:', err)
    } finally {
        loading.value = false
    }
}

/**
 * Load admin statistics
 */
const loadStats = async () => {
    try {
        const response = await api.get('/admin/stats')
        stats.value = response.data.stats
    } catch (err) {
        console.error('Error loading stats:', err)
        throw err
    }
}

/**
 * Load all users for role management
 */
const loadUsers = async () => {
    loadingUsers.value = true
    try {
        // Use the new endpoint for listing all users
        const response = await api.get('/users')
        allUsers.value = response.data.users
    } catch (err) {
        console.error('Error loading users:', err)
        // Fallback to search with empty query if the new endpoint doesn't exist
        try {
            const searchResponse = await api.get('/users/search?q=')
            allUsers.value = searchResponse.data.users
        } catch (searchErr) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load users',
                life: 5000,
            })
        }
    } finally {
        loadingUsers.value = false
    }
}

/**
 * Load pending datasets for review
 */
const loadPendingDatasets = async () => {
    loadingDatasets.value = true
    try {
        const response = await api.get('/admin/datasets/pending')
        pendingDatasets.value = response.data.datasets
    } catch (err) {
        console.error('Error loading pending datasets:', err)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load pending datasets',
            life: 5000,
        })
    } finally {
        loadingDatasets.value = false
    }
}

/**
 * Load disabled comments for moderation
 */
const loadDisabledComments = async () => {
    loadingComments.value = true
    try {
        const response = await api.get('/admin/comments/disabled')
        disabledComments.value = response.data.comments
    } catch (err) {
        console.error('Error loading disabled comments:', err)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load disabled comments',
            life: 5000,
        })
    } finally {
        loadingComments.value = false
    }
}

/**
 * User role management
 */

/**
 * Promote user to admin role
 * @param {Object} user - User object to promote
 */
const promoteUser = (user) => {
    confirm.require({
        message: `Are you sure you want to promote "${user.username}" to administrator?`,
        header: 'Confirm Promotion',
        icon: 'pi pi-exclamation-triangle',
        accept: () => executeRoleChange(user, true),
    })
}

/**
 * Demote user from admin role
 * @param {Object} user - User object to demote
 */
const demoteUser = (user) => {
    confirm.require({
        message: `Are you sure you want to demote "${user.username}" from administrator?`,
        header: 'Confirm Demotion',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-warning',
        accept: () => executeRoleChange(user, false),
    })
}

/**
 * Execute user role change (promote/demote)
 * @param {Object} user - User object
 * @param {boolean} promote - True to promote, false to demote
 */
const executeRoleChange = async (user, promote) => {
    loadingActions.value[user.userId] = true

    try {
        await api.patch(`/users/${user.username}/promote`)

        // Update local state
        const userIndex = allUsers.value.findIndex((u) => u.userId === user.userId)
        if (userIndex !== -1) {
            allUsers.value[userIndex].isAdmin = promote
        }

        // Update stats
        await loadStats()

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: `User ${promote ? 'promoted to' : 'demoted from'} administrator`,
            life: 5000,
        })
    } catch (err) {
        console.error('Error changing user role:', err)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err.response?.data?.error || 'Failed to change user role',
            life: 5000,
        })
    } finally {
        loadingActions.value[user.userId] = false
    }
}

/**
 * Dataset review management
 */

/**
 * Open dataset review dialog for approval
 * @param {Object} dataset - Dataset object to approve
 */
const approveDataset = (dataset) => {
    reviewAction.value = 'approve'
    currentReviewDataset.value = dataset
    adminReview.value = ''
    showReviewDialog.value = true
}

/**
 * Open dataset review dialog for rejection
 * @param {Object} dataset - Dataset object to reject
 */
const rejectDataset = (dataset) => {
    reviewAction.value = 'reject'
    currentReviewDataset.value = dataset
    adminReview.value = ''
    showReviewDialog.value = true
}

/**
 * Confirm dataset review action
 */
const confirmReview = async () => {
    if (!currentReviewDataset.value) return

    reviewLoading.value = true
    const datasetId = currentReviewDataset.value.dataset_id

    try {
        await api.patch(`/admin/datasets/${datasetId}`, {
            action: reviewAction.value,
            admin_review: adminReview.value || undefined,
        })

        // Remove from pending list
        pendingDatasets.value = pendingDatasets.value.filter((d) => d.dataset_id !== datasetId)

        // Update stats
        await loadStats()

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: `Dataset ${reviewAction.value === 'approve' ? 'approved' : 'rejected'} successfully`,
            life: 5000,
        })

        showReviewDialog.value = false
        currentReviewDataset.value = null
        adminReview.value = ''
    } catch (err) {
        console.error('Error reviewing dataset:', err)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err.response?.data?.error || 'Failed to review dataset',
            life: 5000,
        })
    } finally {
        reviewLoading.value = false
    }
}

/**
 * Cancel dataset review
 */
const cancelReview = () => {
    showReviewDialog.value = false
    currentReviewDataset.value = null
    adminReview.value = ''
}

/**
 * Comment moderation
 */

/**
 * Enable a disabled comment
 * @param {Object} comment - Comment object to enable
 */
const enableComment = async (comment) => {
    loadingActions.value[comment.comment_id] = true

    try {
        await api.patch(`/admin/comments/${comment.comment_id}/enable`)

        // Remove from disabled list
        disabledComments.value = disabledComments.value.filter(
            (c) => c.comment_id !== comment.comment_id,
        )

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Comment enabled successfully',
            life: 5000,
        })
    } catch (err) {
        console.error('Error enabling comment:', err)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err.response?.data?.error || 'Failed to enable comment',
            life: 5000,
        })
    } finally {
        loadingActions.value[comment.comment_id] = false
    }
}

/**
 * Utility functions
 */

/**
 * Get user avatar background color classes
 * @param {string} username - Username for deterministic color
 * @returns {string} CSS classes for avatar background
 */
const getUserAvatarClasses = (username) => {
    if (!username) return 'bg-gray-500 text-white'
    const colors = [
        'bg-emerald-500',
        'bg-blue-500',
        'bg-purple-500',
        'bg-amber-500',
        'bg-rose-500',
        'bg-cyan-500',
    ]
    const index = username.charCodeAt(0) % colors.length
    return `${colors[index]} text-white`
}

/**
 * Get initials from full name for avatar fallback
 * @param {string} fullName - User's full name
 * @returns {string} Initials (max 2 characters)
 */
const getInitials = (fullName) => {
    if (!fullName) return 'U'
    return fullName
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}

/**
 * Navigation functions
 */

/**
 * Navigate to dataset detail page
 * @param {string} datasetId - Dataset ID to view
 */
const viewDataset = (datasetId) => {
    router.push(`/datasets/${datasetId}`)
}

/**
 * Navigate to dataset with comment focus
 * @param {string} datasetId - Dataset ID containing the comment
 */
const goToDataset = (datasetId) => {
    router.push(`/datasets/${datasetId}?tab=discussion`)
}

/**
 * View comment in its original context
 * @param {Object} comment - Comment object
 */
const viewCommentInContext = (comment) => {
    router.push(
        `/datasets/${comment.dataset?.dataset_id}?tab=discussion&comment=${comment.comment_id}`,
    )
}

/**
 * Gets avatar URL with proper CouchDB file handling
 */
const getAvatarUrl = (user) => {
    if (!user?.avatarUrl) return null

    try {
        const url = new URL(user.avatarUrl)
        const pathParts = url.pathname.split('/').filter((part) => part)

        if (pathParts.length < 3) return null

        const documentId = pathParts[1]
        const filename = pathParts[2]

        return `http://localhost:3000/api/files/${documentId}/${filename}`
    } catch {
        return null
    }
}

/**
 * Navigates to user's profile page
 */
const goToProfile = (username) => {
    if (username) {
        router.push(`/profile/${username}`)
    }
}
</script>

<style scoped>
.admin-panel {
    max-width: 1400px;
}

.stat-card {
    transition: transform 0.2s ease-in-out;
}

.stat-card:hover {
    transform: translateY(-2px);
}

.stat-icon {
    transition: all 0.2s ease-in-out;
}

.tab-button {
    transition: all 0.2s ease-in-out;
    border-bottom: 2px solid transparent;
}

.tab-button:hover {
    color: #2563eb;
}

.user-cell {
    transition: background-color 0.2s ease-in-out;
}

.comment-preview {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

:deep(.p-Tabs-nav) {
    border-bottom: 1px solid #e5e7eb;
}

:deep(.p-Tabs-nav-link) {
    padding: 1rem 1.5rem;
}

:deep(.p-datatable) {
    font-size: 0.875rem;
}

:deep(.p-button.p-button-sm) {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
}
</style>
