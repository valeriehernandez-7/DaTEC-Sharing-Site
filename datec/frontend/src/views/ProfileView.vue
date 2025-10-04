<template>
    <div class="profile-view container mx-auto px-4 py-8">
        <!-- Profile Header -->
        <Card class="profile-header mb-6">
            <template #content>
                <div class="flex items-center gap-6">
                    <!-- Avatar -->
                    <Avatar :image="userData.avatarUrl" :label="userInitials" size="xlarge" shape="circle"
                        class="bg-blue-500 text-white" />

                    <!-- User Information -->
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-2xl font-bold text-gray-900">{{ userData.fullName }}</h1>
                            <i v-if="userData.isAdmin" class="pi pi-verified text-blue-500" title="Administrator"></i>
                        </div>
                        <p class="text-gray-600 text-lg">@{{ userData.username }}</p>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2" v-if="!isOwnProfile">
                        <Button :label="isFollowing ? 'Unfollow' : 'Follow'"
                            :icon="isFollowing ? 'pi pi-user-minus' : 'pi pi-user-plus'" @click="toggleFollow"
                            :loading="isFollowingLoading" />
                        <Button label="Message" icon="pi pi-envelope" severity="secondary" @click="openChatDrawer" />
                    </div>
                </div>
            </template>
        </Card>

        <!-- Content Tabs -->
        <Tabs value="0">
            <TabList>
                <Tab value="0">
                    <span class="flex items-center gap-2">
                        <i class="pi pi-chart-bar"></i>
                        Datasets ({{ datasets.length }})
                    </span>
                </Tab>
                <Tab value="1">
                    <span class="flex items-center gap-2">
                        <i class="pi pi-users"></i>
                        Followers ({{ followers.length }})
                    </span>
                </Tab>
                <Tab value="2">
                    <span class="flex items-center gap-2">
                        <i class="pi pi-eye"></i>
                        Following ({{ following.length }})
                    </span>
                </Tab>
            </TabList>
            <!-- Datasets Tab -->
            <TabPanel value="0">
                <DataView :value="datasets" :paginator="true" :rows="5">
                    <template #list="slotProps">
                        <div class="grid grid-cols-1 gap-4">
                            <div v-for="dataset in slotProps.items" :key="dataset.dataset_id"
                                class="cursor-pointer hover:bg-gray-50 p-4 rounded-lg border transition-colors"
                                @click="navigateToDataset(dataset.dataset_id)">
                                <div class="flex gap-4">
                                    <!-- Dataset Thumbnail -->
                                    <div
                                        class="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white">
                                        <i class="pi pi-database text-2xl"></i>
                                    </div>

                                    <!-- Dataset Information -->
                                    <div class="flex-1">
                                        <h3 class="font-semibold text-lg text-gray-900 mb-1">{{ dataset.dataset_name
                                        }}
                                        </h3>
                                        <p class="text-gray-600 text-sm line-clamp-2 mb-2">{{ dataset.description }}
                                        </p>
                                        <div class="flex items-center gap-4 text-sm text-gray-500">
                                            <span class="flex items-center gap-1">
                                                <i class="pi pi-star text-yellow-500"></i>
                                                {{ dataset.vote_count || 0 }} rating
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <i class="pi pi-download text-blue-500"></i>
                                                {{ dataset.download_count || 0 }} downloads
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <i class="pi pi-calendar"></i>
                                                {{ formatDate(dataset.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>

                    <template #empty>
                        <div class="text-center py-8 text-gray-500">
                            <i class="pi pi-inbox text-4xl mb-3"></i>
                            <p>No datasets found</p>
                        </div>
                    </template>
                </DataView>
            </TabPanel>

            <!-- Followers Tab -->
            <TabPanel value="1">
                <DataView :value="followers" :paginator="true" :rows="5">
                    <template #list="slotProps">
                        <div class="grid grid-cols-1 gap-3">
                            <div v-for="follower in slotProps.items" :key="follower.userId"
                                class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                @click="navigateToProfile(follower.username)">
                                <Avatar :image="follower.avatarUrl" :label="follower.fullName?.charAt(0)" shape="circle"
                                    class="bg-green-500 text-white" />
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium text-gray-900">{{ follower.fullName }}</span>
                                        <i v-if="follower.isAdmin" class="pi pi-verified text-blue-500"
                                            title="Administrator"></i>
                                    </div>
                                    <p class="text-gray-500 text-sm">@{{ follower.username }}</p>
                                </div>
                            </div>
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
            <TabPanel value="2">
                <DataView :value="following" :paginator="true" :rows="5">
                    <template #list="slotProps">
                        <div class="grid grid-cols-1 gap-3">
                            <div v-for="user in slotProps.items" :key="user.userId"
                                class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                @click="navigateToProfile(user.username)">
                                <Avatar :image="user.avatarUrl" :label="user.fullName?.charAt(0)" shape="circle"
                                    class="bg-purple-500 text-white" />
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium text-gray-900">{{ user.fullName }}</span>
                                        <i v-if="user.isAdmin" class="pi pi-verified text-blue-500"
                                            title="Administrator"></i>
                                    </div>
                                    <p class="text-gray-500 text-sm">@{{ user.username }}</p>
                                </div>
                            </div>
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
        <Drawer v-model:visible="showChatDrawer" position="right" :style="{ width: '400px' }" :dismissable="true">
            <template #header>
                <div class="flex items-center gap-3">
                    <Avatar :image="userData.avatarUrl" :label="userData.fullName?.charAt(0)" shape="circle"
                        class="bg-blue-500 text-white" />
                    <div>
                        <div class="font-semibold text-gray-900">{{ userData.fullName }}</div>
                        <div class="text-sm text-gray-500">@{{ userData.username }}</div>
                    </div>
                </div>
            </template>

            <div class="h-full flex flex-col">
                <!-- Messages Container -->
                <div class="flex-1 overflow-y-auto p-4">
                    <div class="text-center text-gray-500 py-8">
                        <i class="pi pi-comments text-4xl mb-3"></i>
                        <p>Start a conversation with {{ userData.fullName }}</p>
                    </div>
                </div>

                <!-- Message Input -->
                <div class="p-4 border-t border-gray-200">
                    <div class="flex gap-2">
                        <InputText v-model="messageText" placeholder="Type a message..." class="flex-1"
                            @keyup.enter="sendMessage" />
                        <Button icon="pi pi-send" @click="sendMessage" :disabled="!messageText.trim()" />
                    </div>
                </div>
            </div>
        </Drawer>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'

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
const loadingDatasets = ref(false)
const loadingFollowers = ref(false)
const loadingFollowing = ref(false)
const isFollowingLoading = ref(false)
const showChatDrawer = ref(false)
const messageText = ref('')

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
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
})

const isFollowing = computed(() => {
    if (!authStore.isLoggedIn) return false
    return followers.value.some(follower => follower.userId === authStore.user.userId)
})

/**
 * Lifecycle hooks
 */
onMounted(() => {
    loadProfileData()
})

watch(() => route.params.username, () => {
    loadProfileData()
})

/**
 * Loads all profile-related data
 */
const loadProfileData = async () => {
    await Promise.all([
        loadUserData(),
        loadUserDatasets(),
        loadFollowers(),
        loadFollowing()
    ])
}

/**
 * Fetches user profile information
 */
const loadUserData = async () => {
    try {
        const response = await fetch(`http://localhost:3000/api/users/${route.params.username}`)

        if (response.ok) {
            const data = await response.json()
            userData.value = data.user
        } else if (response.status === 404) {
            router.push('/')
            toast.add({
                severity: 'error',
                summary: 'User Not Found',
                detail: 'The requested user does not exist',
                life: 5000
            })
        } else {
            throw new Error('Failed to load user data')
        }
    } catch (error) {
        console.error('Error loading user data:', error)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load user profile',
            life: 5000
        })
    }
}

/**
 * Fetches user's datasets
 */
const loadUserDatasets = async () => {
    loadingDatasets.value = true
    try {
        const response = await fetch(`http://localhost:3000/api/datasets/user/${route.params.username}`)

        if (response.ok) {
            const data = await response.json()
            datasets.value = data.datasets || []
        } else {
            throw new Error('Failed to load datasets')
        }
    } catch (error) {
        console.error('Error loading datasets:', error)
        datasets.value = []
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
        const response = await fetch(`http://localhost:3000/api/users/${route.params.username}/followers`)

        if (response.ok) {
            const data = await response.json()
            followers.value = data.followers || []
        } else {
            throw new Error('Failed to load followers')
        }
    } catch (error) {
        console.error('Error loading followers:', error)
        followers.value = []
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
        const response = await fetch(`http://localhost:3000/api/users/${route.params.username}/following`)

        if (response.ok) {
            const data = await response.json()
            following.value = data.following || []
        } else {
            throw new Error('Failed to load following')
        }
    } catch (error) {
        console.error('Error loading following:', error)
        following.value = []
    } finally {
        loadingFollowing.value = false
    }
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
        const method = isFollowing.value ? 'DELETE' : 'POST'
        const response = await fetch(`http://localhost:3000/api/users/${route.params.username}/follow`, {
            method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        })

        if (response.ok) {
            // Reload followers to update the state
            await loadFollowers()

            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: isFollowing.value ? 'Started following user' : 'Unfollowed user',
                life: 3000
            })
        } else {
            throw new Error('Failed to update follow status')
        }
    } catch (error) {
        console.error('Error toggling follow:', error)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update follow status',
            life: 5000
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

    try {
        const response = await fetch(`http://localhost:3000/api/messages/${authStore.user.username}/${route.params.username}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: messageText.value.trim()
            })
        })

        if (response.ok) {
            messageText.value = ''
            toast.add({
                severity: 'success',
                summary: 'Message Sent',
                detail: 'Your message has been sent',
                life: 3000
            })
        } else {
            throw new Error('Failed to send message')
        }
    } catch (error) {
        console.error('Error sending message:', error)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message,
            life: 5000
        })
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
    router.push(`/profile/${username}`)
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
        day: 'numeric'
    })
}
</script>

<style scoped>
.profile-view {
    max-width: 1200px;
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
</style>