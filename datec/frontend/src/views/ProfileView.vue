<template>
    <div class="profile-view container mx-auto px-4 py-8">
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <ProgressSpinner />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
            <Message severity="error" :closable="false">
                {{ error }}
            </Message>
            <Button label="Go Home" icon="pi pi-home" @click="router.push('/')" class="mt-4" />
        </div>

        <!-- Profile Content -->
        <div v-else>
            <!-- Profile Header -->
            <Card class="profile-header mb-6">
                <template #content>
                    <div class="flex items-center gap-6">
                        <!-- Avatar with proper CouchDB file handling -->
                        <div class="relative">
                            <Avatar
                                v-if="userData.avatarUrl"
                                :image="getAvatarUrl(userData)"
                                size="xlarge"
                                shape="circle"
                                :alt="userData.username"
                            />
                            <Avatar
                                v-else
                                :label="userInitials"
                                size="xlarge"
                                shape="circle"
                                :class="avatarClasses"
                            />
                        </div>

                        <!-- User Information -->
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <h1 class="text-2xl font-bold text-gray-900">
                                    {{ userData.fullName }}
                                </h1>
                                <i
                                    v-if="userData.isAdmin"
                                    class="pi pi-verified text-blue-500 text-xl"
                                    title="Administrator"
                                ></i>
                            </div>
                            <p class="text-gray-600 text-lg">@{{ userData.username }}</p>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-2" v-if="!isOwnProfile && authStore.isLoggedIn">
                            <Button
                                :label="isFollowing ? 'Unfollow' : 'Follow'"
                                :icon="isFollowing ? 'pi pi-user-minus' : 'pi pi-user-plus'"
                                @click="toggleFollow"
                                :loading="isFollowingLoading"
                                :severity="isFollowing ? 'secondary' : 'primary'"
                            />
                            <Button
                                label="Message"
                                icon="pi pi-envelope"
                                severity="secondary"
                                @click="openChatDrawer"
                            />
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Content Tabs -->
            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="datasets">
                        <span class="flex items-center gap-2">
                            <i class="pi pi-box"></i>
                            Datasets
                            <Badge :value="datasets.length" severity="secondary" class="ml-2" />
                        </span>
                    </Tab>
                    <Tab value="followers">
                        <span class="flex items-center gap-2">
                            <i class="pi pi-users"></i>
                            Followers
                            <Badge :value="followers.length" severity="secondary" class="ml-2" />
                        </span>
                    </Tab>
                    <Tab value="following">
                        <span class="flex items-center gap-2">
                            <i class="pi pi-eye"></i>
                            Following
                            <Badge :value="following.length" severity="secondary" class="ml-2" />
                        </span>
                    </Tab>
                </TabList>

                <!-- Datasets Tab -->
                <TabPanel value="datasets">
                    <DataView
                        :value="datasets"
                        :paginator="true"
                        :rows="9"
                        :loading="loadingDatasets"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} datasets"
                    >
                        <template v-if="isOwnProfile" #header>
                            <div style="display: flex; justify-content: flex-end">
                                <Button
                                    icon="pi pi-folder-plus"
                                    raised
                                    rounded
                                    label="New Dataset"
                                    @click="router.push('/datasets/create')"
                                />
                            </div>
                        </template>

                        <template #list="slotProps">
                            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                <Card
                                    v-for="dataset in slotProps.items"
                                    :key="dataset.dataset_id"
                                    class="cursor-pointer hover:shadow-lg transition-all duration-300 h-full"
                                    @click="navigateToDataset(dataset.dataset_id)"
                                >
                                    <template #header>
                                        <div class="relative h-32 rounded-t-lg overflow-hidden">
                                            <!-- Header Photo or Fallback -->
                                            <img
                                                v-if="getDatasetHeaderUrl(dataset)"
                                                :src="getDatasetHeaderUrl(dataset)"
                                                :alt="dataset.dataset_name"
                                                class="object-cover"
                                            />
                                            <div
                                                v-else
                                                class="w-full h-full bg-gradient-to-br from-blue-600 to-gray-300 flex items-center justify-center text-white"
                                            >
                                                <i class="pi pi-box text-3xl"></i>
                                            </div>
                                            <Tag
                                                v-if="isOwnProfile || authStore.user?.isAdmin"
                                                :icon="getStatusIcon(dataset.status)"
                                                :value="dataset.status.toUpperCase()"
                                                :severity="getStatusSeverity(dataset.status)"
                                                class="absolute top-2 right-2"
                                            />
                                        </div>
                                    </template>
                                    <template #title>
                                        <h3
                                            class="text-lg font-semibold text-gray-900 line-clamp-1"
                                        >
                                            {{ dataset.dataset_name }}
                                        </h3>
                                    </template>
                                    <template #content>
                                        <p class="text-gray-600 text-sm line-clamp-2 mb-3">
                                            {{ dataset.description }}
                                        </p>
                                        <div
                                            class="flex items-center justify-between text-xs text-gray-500"
                                        >
                                            <div
                                                v-if="isOwnProfile || authStore.user?.isAdmin"
                                                class="flex items-center gap-1"
                                            >
                                                <i
                                                    :class="
                                                        dataset.is_public
                                                            ? 'pi pi-lock-open text-green-500'
                                                            : 'pi pi-lock text-red-500'
                                                    "
                                                ></i>
                                                <span>{{
                                                    dataset.is_public ? 'Public' : 'Private'
                                                }}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <i class="pi pi-calendar text-orange-500"></i>
                                                <span>{{ formatDate(dataset.updated_at) }}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <i class="pi pi-star text-yellow-500"></i>
                                                <span>{{ dataset.vote_count || 0 }}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <i class="pi pi-download text-blue-500"></i>
                                                <span>{{ dataset.download_count || 0 }}</span>
                                            </div>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </template>

                        <template #empty>
                            <div class="text-center py-8 text-gray-500">
                                <i class="pi pi-inbox text-4xl mb-3"></i>
                                <p>No datasets yet</p>
                            </div>
                        </template>
                    </DataView>
                </TabPanel>

                <!-- Followers Tab -->
                <TabPanel value="followers">
                    <DataView
                        :value="followers"
                        :paginator="true"
                        :rows="12"
                        :loading="loadingFollowers"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} followers"
                    >
                        <template #list="slotProps">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Card
                                    v-for="follower in slotProps.items"
                                    :key="follower.userId"
                                    class="cursor-pointer hover:shadow-md transition-all"
                                    @click="navigateToProfile(follower.username)"
                                >
                                    <template #content>
                                        <div class="flex items-center gap-3">
                                            <div class="relative">
                                                <Avatar
                                                    v-if="follower.avatarUrl"
                                                    :image="getAvatarUrl(follower)"
                                                    shape="circle"
                                                    :alt="follower.username"
                                                />
                                                <Avatar
                                                    v-else
                                                    :label="getInitials(follower.fullName)"
                                                    shape="circle"
                                                    :class="getUserAvatarClasses(follower.username)"
                                                />
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2">
                                                    <span class="font-medium text-gray-900">{{
                                                        follower.fullName
                                                    }}</span>
                                                    <i
                                                        v-if="follower.isAdmin"
                                                        class="pi pi-verified text-blue-500"
                                                        title="Administrator"
                                                    ></i>
                                                </div>
                                                <p class="text-gray-500 text-sm">
                                                    @{{ follower.username }}
                                                </p>
                                            </div>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </template>

                        <template #empty>
                            <div class="text-center py-8 text-gray-500">
                                <i class="pi pi-user-minus text-4xl mb-3"></i>
                                <p>No followers yet</p>
                            </div>
                        </template>
                    </DataView>
                </TabPanel>

                <!-- Following Tab -->
                <TabPanel value="following">
                    <DataView
                        :value="following"
                        :paginator="true"
                        :rows="12"
                        :loading="loadingFollowing"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} followed"
                    >
                        <template #list="slotProps">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Card
                                    v-for="followed in slotProps.items"
                                    :key="followed.userId"
                                    class="cursor-pointer hover:shadow-md transition-all"
                                    @click="navigateToProfile(followed.username)"
                                >
                                    <template #content>
                                        <div class="flex items-center gap-3">
                                            <div class="relative">
                                                <Avatar
                                                    v-if="followed.avatarUrl"
                                                    :image="getAvatarUrl(followed)"
                                                    shape="circle"
                                                    :alt="followed.username"
                                                />
                                                <Avatar
                                                    v-else
                                                    :label="getInitials(followed.fullName)"
                                                    shape="circle"
                                                    :class="getUserAvatarClasses(followed.username)"
                                                />
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2">
                                                    <span class="font-medium text-gray-900">{{
                                                        followed.fullName
                                                    }}</span>
                                                    <i
                                                        v-if="followed.isAdmin"
                                                        class="pi pi-verified text-blue-500"
                                                        title="Administrator"
                                                    ></i>
                                                </div>
                                                <p class="text-gray-500 text-sm">
                                                    @{{ followed.username }}
                                                </p>
                                            </div>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </template>

                        <template #empty>
                            <div class="text-center py-8 text-gray-500">
                                <i class="pi pi-user-plus text-4xl mb-3"></i>
                                <p>Not following anyone</p>
                            </div>
                        </template>
                    </DataView>
                </TabPanel>
            </Tabs>

            <!-- Chat Drawer -->
            <Drawer
                v-model:visible="showChatDrawer"
                position="right"
                :style="{ width: '450px' }"
                :dismissable="true"
            >
                <template #header>
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <Avatar
                                v-if="userData.avatarUrl"
                                :image="getAvatarUrl(userData)"
                                shape="circle"
                                :alt="userData.username"
                                size="xlarge"
                            />
                            <Avatar
                                v-else
                                :label="userInitials"
                                shape="circle"
                                size="xlarge"
                                :class="avatarClasses"
                            />
                        </div>
                        <div>
                            <div class="font-semibold text-gray-900">{{ userData.fullName }}</div>
                            <div class="text-sm text-gray-500">@{{ userData.username }}</div>
                        </div>
                    </div>
                </template>

                <div class="h-full flex flex-col">
                    <!-- Messages Container -->
                    <div
                        ref="messagesContainer"
                        class="flex-1 overflow-y-auto p-4 space-y-4 messages-container"
                    >
                        <div v-if="loadingMessages" class="flex justify-center py-4">
                            <ProgressSpinner size="small" />
                        </div>
                        <div
                            v-else-if="messages.length === 0"
                            class="text-center text-gray-500 py-8"
                        >
                            <i class="pi pi-comments text-4xl mb-3"></i>
                            <p>Start a conversation with {{ userData.fullName }}</p>
                        </div>
                        <div v-else>
                            <div
                                v-for="message in messages"
                                :key="message.message_id"
                                class="flex"
                                :class="message.is_own_message ? 'justify-end' : 'justify-start'"
                            >
                                <div class="max-w-[80%]">
                                    <div
                                        class="flex flex-col"
                                        :class="
                                            message.is_own_message ? 'items-end' : 'items-start'
                                        "
                                    >
                                        <div
                                            class="px-4 py-2 rounded-2xl"
                                            :class="
                                                message.is_own_message
                                                    ? 'bg-blue-500 text-white rounded-br-none'
                                                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                                            "
                                        >
                                            <p class="text-sm whitespace-pre-wrap break-words">
                                                {{ message.content }}
                                            </p>
                                        </div>
                                        <span class="text-xs text-gray-500 mt-1 px-1 mb-2">
                                            {{ formatMessageTime(message.created_at) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Message Input -->
                    <div class="p-4 border-t border-gray-200">
                        <div class="flex flex-col gap-2">
                            <Textarea
                                v-model="messageText"
                                placeholder="Message"
                                rows="3"
                                class="w-full"
                                @keydown="handleTextareaKeydown"
                                :disabled="sendingMessage"
                            />
                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-500">
                                    {{ messageText.length }}/2000
                                </span>
                                <Button
                                    label="Send"
                                    icon="pi pi-send"
                                    @click="sendMessage"
                                    :disabled="!messageText.trim() || sendingMessage"
                                    :loading="sendingMessage"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Drawer>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

/**
 * Reactive state management
 */
const userData = ref({})
const datasets = ref([])
const followers = ref([])
const following = ref([])
const messages = ref([])
const loading = ref(true)
const loadingDatasets = ref(false)
const loadingFollowers = ref(false)
const loadingFollowing = ref(false)
const loadingMessages = ref(false)
const isFollowingLoading = ref(false)
const sendingMessage = ref(false)
const showChatDrawer = ref(false)
const messageText = ref('')
const activeTab = ref('datasets')
const error = ref('')
const avatarLoadError = ref(false)
const messagesContainer = ref(null)

/**
 * Computed properties for derived state
 */
const isOwnProfile = computed(() => {
    return authStore.isLoggedIn && authStore.user?.username === route.params.username
})

const userInitials = computed(() => {
    if (!userData.value.fullName) return 'U'
    return userData.value.fullName
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
})

const isFollowing = computed(() => {
    if (!authStore.isLoggedIn) return false
    return followers.value.some((follower) => follower.userId === authStore.user.userId)
})

const avatarClasses = computed(() => {
    const colors = [
        'bg-emerald-500',
        'bg-blue-500',
        'bg-purple-500',
        'bg-amber-500',
        'bg-rose-500',
        'bg-cyan-500',
    ]
    const index = (userData.value.username?.charCodeAt(0) || 0) % colors.length
    return `${colors[index]} text-white border-2 border-white shadow-lg`
})

/**
 * Lifecycle hooks
 */
onMounted(() => {
    loadProfileData()
})

watch(
    () => route.params.username,
    () => {
        loadProfileData()
    },
)

watch(showChatDrawer, (newVal) => {
    if (newVal) {
        loadMessages()
    } else {
        messages.value = []
    }
})

/**
 * Loads all profile-related data
 */
const loadProfileData = async () => {
    loading.value = true
    error.value = ''

    try {
        await Promise.all([loadUserData(), loadUserDatasets(), loadFollowers(), loadFollowing()])
    } catch (err) {
        error.value = 'Failed to load profile data'
        console.error('Error loading profile data:', err)
    } finally {
        loading.value = false
    }
}

/**
 * Fetches user profile information
 */
const loadUserData = async () => {
    try {
        const response = await api.get(`/users/${route.params.username}`)
        userData.value = response.data.user
        avatarLoadError.value = false
    } catch (err) {
        if (err.response?.status === 404) {
            error.value = 'User not found'
        } else {
            throw err
        }
    }
}

/**
 * Fetches user's datasets
 */
const loadUserDatasets = async () => {
    loadingDatasets.value = true
    try {
        const response = await api.get(`/datasets/user/${route.params.username}`)
        datasets.value = response.data.datasets || []
    } catch (err) {
        console.error('Error loading datasets:', err)
        datasets.value = []
        throw err
    } finally {
        loadingDatasets.value = false
    }
}

/**
 * Fetches user's followers
 */
const loadFollowers = async () => {
    loadingFollowers.value = true
    try {
        const response = await api.get(`/users/${route.params.username}/followers`)
        followers.value = response.data.followers || []
    } catch (err) {
        console.error('Error loading followers:', err)
        followers.value = []
        throw err
    } finally {
        loadingFollowers.value = false
    }
}

/**
 * Fetches users that this user follows
 */
const loadFollowing = async () => {
    loadingFollowing.value = true
    try {
        const response = await api.get(`/users/${route.params.username}/following`)
        following.value = response.data.following || []
    } catch (err) {
        console.error('Error loading following:', err)
        following.value = []
        throw err
    } finally {
        loadingFollowing.value = false
    }
}

/**
 * Loads conversation messages
 */
const loadMessages = async () => {
    if (!authStore.isLoggedIn) return

    loadingMessages.value = true
    try {
        const response = await api.get(
            `/messages/${authStore.user.username}/${route.params.username}`,
        )
        messages.value = response.data.messages || []

        // Scroll to bottom after messages load
        nextTick(() => {
            scrollToBottom()
        })
    } catch (err) {
        console.error('Error loading messages:', err)
        messages.value = []
    } finally {
        loadingMessages.value = false
    }
}

/**
 * Scrolls messages container to bottom
 */
const scrollToBottom = () => {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
}

/**
 * Handles textarea key events for Shift+Enter new line
 */
const handleTextareaKeydown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
    }
    // Shift+Enter allows natural new line creation
}

/**
 * Gets avatar background color
 */
const getUserAvatarClasses = (username) => {
    const colors = [
        'bg-emerald-500',
        'bg-blue-500',
        'bg-purple-500',
        'bg-amber-500',
        'bg-rose-500',
        'bg-cyan-500',
    ]
    const index = (username?.charCodeAt(0) || 0) % colors.length
    return `${colors[index]} text-white`
}

/**
 * Gets initials for avatar fallback
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
 * Gets status icon for dataset badges
 */
const getStatusIcon = (status) => {
    const iconMap = {
        approved: 'pi pi-check-circle',
        pending: 'pi pi-file-edit',
        rejected: 'pi pi-ban',
    }
    return iconMap[status] || 'info'
}

/**
 * Gets status severity for dataset badges
 */
const getStatusSeverity = (status) => {
    const severityMap = {
        approved: 'success',
        pending: 'info',
        rejected: 'danger',
    }
    return severityMap[status] || 'info'
}

/**
 * Toggles follow/unfollow status
 */
const toggleFollow = async () => {
    if (!authStore.isLoggedIn) {
        router.push('/login')
        return
    }

    isFollowingLoading.value = true

    try {
        const method = isFollowing.value ? 'delete' : 'post'
        await api[method](`/users/${route.params.username}/follow`)

        // Reload followers to update the state
        await loadFollowers()

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: isFollowing.value ? 'Started following user' : 'Unfollowed user',
            life: 3000,
        })
    } catch (err) {
        console.error('Error toggling follow:', err)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update follow status',
            life: 5000,
        })
    } finally {
        isFollowingLoading.value = false
    }
}

/**
 * Opens chat drawer for messaging
 */
const openChatDrawer = () => {
    if (!authStore.isLoggedIn) {
        router.push('/login')
        return
    }
    showChatDrawer.value = true
    messageText.value = ''
}

/**
 * Sends a message to the user
 */
const sendMessage = async () => {
    if (!messageText.value.trim()) return

    sendingMessage.value = true

    try {
        await api.post(`/messages/${authStore.user.username}/${route.params.username}`, {
            content: messageText.value.trim(),
        })

        // Reload messages to show the new one
        await loadMessages()

        messageText.value = ''

        toast.add({
            severity: 'success',
            summary: 'Message Sent',
            detail: 'Your message has been sent',
            life: 3000,
        })
    } catch (err) {
        console.error('Error sending message:', err)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err.response?.data?.error || 'Failed to send message',
            life: 5000,
        })
    } finally {
        sendingMessage.value = false
    }
}

/**
 * Navigates to dataset detail page
 */
const navigateToDataset = (datasetId) => {
    router.push(`/datasets/${datasetId}`)
}

/**
 * Navigates to user profile page
 */
const navigateToProfile = (username) => {
    if (username !== route.params.username) {
        router.push(`/profile/${username}`)
    }
}

/**
 * Formats date for display
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A'

    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

/**
 * Formats message time for display
 */
const formatMessageTime = (dateString) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// Retrieve user avatarUrl
const avatarUrl = computed(() => {
    if (avatarLoadError.value || !userData.value.avatarUrl) return null

    // Extraer documentId y filename de la URL original
    const originalUrl = userData.value.avatarUrl
    const url = new URL(originalUrl)
    const pathParts = url.pathname.split('/').filter((part) => part)

    if (pathParts.length < 3) return null

    const documentId = pathParts[1]
    const filename = pathParts[2]

    return `http://localhost:3000/api/files/${documentId}/${filename}`
})

// Retrieve datasets header photo
const getDatasetHeaderUrl = (dataset) => {
    if (!dataset.header_photo_url) return null

    const url = new URL(dataset.header_photo_url)
    const pathParts = url.pathname.split('/').filter((part) => part)

    if (pathParts.length < 3) return null

    const documentId = pathParts[1]
    const filename = pathParts[2]

    return `http://localhost:3000/api/files/${documentId}/${filename}`
}

// Retrieve followers/following avatars
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
</script>

<style scoped>
.profile-view {
    max-width: 1200px;
}

.line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.line-clamp-2 {
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

/* Custom scrollbar for messages */
.messages-container {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
}

.messages-container::-webkit-scrollbar {
    width: 6px;
}

.messages-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
</style>
