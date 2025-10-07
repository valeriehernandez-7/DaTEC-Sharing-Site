<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Header Section -->
        <div class="bg-white shadow-sm">
            <div class="container mx-auto px-4 py-8">
                <div class="text-center mb-8">
                    <i class="pi pi-bullseye text-6xl text-sky-600 mb-4"></i>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                        <i>Data Sharing Platform for collaborative research and analysis</i>
                    </p>
                </div>

                <!-- Search Section -->
                <div class="max-w-2xl mx-auto">
                    <!-- Search Input -->
                    <div class="flex gap-2 mb-4">
                        <InputText
                            v-model="searchQuery"
                            placeholder="Search datasets or users..."
                            class="flex-1"
                            @keyup.enter="performSearch"
                        />
                        <Button
                            icon="pi pi-search"
                            label="Search"
                            @click="performSearch"
                            :loading="isLoading"
                        />
                    </div>

                    <!-- Search Type Toggle -->
                    <div class="flex justify-center gap-2">
                        <Button
                            label="Datasets"
                            icon="pi pi-box"
                            :severity="searchType === 'datasets' ? 'primary' : 'secondary'"
                            @click="setSearchType('datasets')"
                        />
                        <Button
                            label="Users"
                            icon="pi pi-users"
                            :severity="searchType === 'users' ? 'primary' : 'secondary'"
                            @click="setSearchType('users')"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Content Section -->
        <div class="container mx-auto px-4 py-8">
            <!-- Empty State / Welcome -->
            <div v-if="!hasSearched" class="max-w-4xl mx-auto">
                <Card>
                    <template #content>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div class="text-center p-4">
                                <i class="pi pi-search text-3xl text-blue-500 mb-3"></i>
                                <h3 class="font-semibold text-gray-900 mb-2">Discover Data</h3>
                                <p class="text-gray-600 text-sm">
                                    Find datasets shared by the community
                                </p>
                            </div>
                            <div class="text-center p-4">
                                <i class="pi pi-upload text-3xl text-green-500 mb-3"></i>
                                <h3 class="font-semibold text-gray-900 mb-2">Share Insights</h3>
                                <p class="text-gray-600 text-sm">
                                    Upload and share your own datasets
                                </p>
                            </div>
                            <div class="text-center p-4">
                                <i class="pi pi-users text-3xl text-orange-500 mb-3"></i>
                                <h3 class="font-semibold text-gray-900 mb-2">Collaborate</h3>
                                <p class="text-gray-600 text-sm">
                                    Connect with researchers worldwide
                                </p>
                            </div>
                        </div>

                        <div class="text-center border-t pt-6 text-gray-300">
                            <div v-if="!authStore.isLoggedIn" class="space-y-4">
                                <p class="text-gray-600">
                                    Join the community to start sharing data
                                </p>
                                <div class="flex gap-3 justify-center">
                                    <Button
                                        label="Sign Up"
                                        icon="pi pi-user-plus"
                                        @click="router.push('/register')"
                                    />
                                    <Button
                                        label="Login"
                                        icon="pi pi-sign-in"
                                        severity="secondary"
                                        @click="router.push('/login')"
                                    />
                                </div>
                            </div>
                            <div v-else class="space-y-4">
                                <p class="text-gray-600"><i>Ready to explore and share data?</i></p>
                                <div class="flex gap-3 justify-center">
                                    <Button
                                        label="Create Dataset"
                                        icon="pi pi-plus"
                                        @click="router.push('/datasets/create')"
                                    />
                                    <Button
                                        label="My Profile"
                                        icon="pi pi-user"
                                        severity="secondary"
                                        @click="router.push(`/profile/${authStore.user.username}`)"
                                    />
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>
            </div>

            <!-- Loading State -->
            <div v-else-if="isLoading" class="flex justify-center items-center py-12">
                <ProgressSpinner />
                <p class="ml-4 text-gray-600">Searching...</p>
            </div>

            <!-- Results Section -->
            <div v-else-if="searchResults.length > 0">
                <!-- Results Header -->
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">
                        {{ searchResults.length }}
                        {{ searchType === 'datasets' ? 'Datasets' : 'Users' }} Found
                    </h2>
                    <span class="text-gray-500 text-sm"> for "{{ searchQuery }}" </span>
                </div>

                <!-- Datasets Results -->
                <DataView
                    v-if="searchType === 'datasets'"
                    :value="searchResults"
                    :paginator="true"
                    :rows="9"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} datasets"
                >
                    <template #list="slotProps">
                        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            <Card
                                v-for="dataset in slotProps.items"
                                :key="dataset.id"
                                class="cursor-pointer hover:shadow-lg transition-all duration-300 h-full"
                                @click="navigateToDataset(dataset.id)"
                            >
                                <template #header>
                                    <div class="relative h-32 rounded-t-lg overflow-hidden">
                                        <!-- Header Photo or Fallback -->
                                        <img
                                            v-if="dataset.header_photo_url"
                                            :src="getDatasetHeaderUrl(dataset)"
                                            :alt="dataset.name"
                                            class="object-cover"
                                        />
                                        <div
                                            v-else
                                            class="w-full h-full bg-gradient-to-br from-blue-400 to-gray-500 flex items-center justify-center text-white"
                                        >
                                            <i class="pi pi-box text-3xl"></i>
                                        </div>
                                    </div>
                                </template>
                                <template #title>
                                    <h3 class="text-lg font-semibold text-gray-900 line-clamp-1">
                                        {{ dataset.name }}
                                    </h3>
                                </template>
                                <template #subtitle>
                                    <div class="flex items-center gap-2 mt-1">
                                        <Avatar
                                            v-if="dataset.owner?.avatarUrl"
                                            :image="getUserAvatarUrl(dataset.owner)"
                                            size="small"
                                            shape="circle"
                                        />
                                        <Avatar
                                            v-else
                                            :label="getUserInitials(dataset.owner)"
                                            size="small"
                                            shape="circle"
                                            :class="getUserAvatarClasses(dataset.owner?.username)"
                                        />
                                        <span class="text-sm text-gray-600"
                                            >@{{ dataset.owner?.username || 'unknown' }}</span
                                        >
                                    </div>
                                </template>
                                <template #content>
                                    <p class="text-gray-600 text-sm line-clamp-2 mb-3">
                                        {{ dataset.description }}
                                    </p>
                                    <div
                                        class="flex items-center justify-between text-xs text-gray-500"
                                    >
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
                </DataView>

                <!-- Users Results -->
                <DataView
                    v-else
                    :value="searchResults"
                    :paginator="true"
                    :rows="12"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} users"
                >
                    <template #list="slotProps">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Card
                                v-for="user in slotProps.items"
                                :key="user.id"
                                class="cursor-pointer hover:shadow-md transition-all"
                                @click="navigateToProfile(user.username)"
                            >
                                <template #content>
                                    <div class="flex items-center gap-3">
                                        <Avatar
                                            v-if="user.avatarUrl"
                                            :image="getUserAvatarUrl(user)"
                                            shape="circle"
                                            size="large"
                                        />
                                        <Avatar
                                            v-else
                                            :label="getUserInitials(user)"
                                            shape="circle"
                                            size="large"
                                            :class="getUserAvatarClasses(user.username)"
                                        />
                                        <div class="flex-1">
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="font-semibold text-gray-900">{{
                                                    user.fullName
                                                }}</span>
                                                <i
                                                    v-if="user.isAdmin"
                                                    class="pi pi-verified text-blue-500"
                                                    title="Administrator"
                                                ></i>
                                            </div>
                                            <p class="text-gray-500 text-sm mb-2">
                                                @{{ user.username }}
                                            </p>
                                            <div
                                                class="flex items-center gap-4 text-xs text-gray-500"
                                            >
                                                <div class="flex items-center gap-1">
                                                    <i class="pi pi-box text-blue-500"></i>
                                                    <span>{{ user.datasets || 0 }} datasets</span>
                                                </div>
                                                <div class="flex items-center gap-1">
                                                    <i class="pi pi-users text-orange-500"></i>
                                                    <span>{{ user.followers || 0 }} followers</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>
                        </div>
                    </template>
                </DataView>
            </div>

            <!-- No Results State -->
            <div v-else-if="hasSearched" class="text-center py-12">
                <Card class="max-w-md mx-auto">
                    <template #content>
                        <i class="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">No results found</h3>
                        <p class="text-gray-500 mb-4">
                            No {{ searchType }} found for "{{ searchQuery }}"
                        </p>
                        <Button
                            label="Clear Search"
                            icon="pi pi-times"
                            severity="secondary"
                            @click="clearSearch"
                        />
                    </template>
                </Card>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { searchService } from '@/services/search'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Reactive state
const searchQuery = ref('')
const searchType = ref('datasets')
const searchResults = ref([])
const isLoading = ref(false)
const hasSearched = ref(false)

/**
 * Sets the search type and performs search if query exists
 */
const setSearchType = (type) => {
    searchType.value = type
    if (searchQuery.value.trim()) {
        performSearch()
    }
}

/**
 * Validates search query
 */
const isValidSearch = () => {
    const trimmedQuery = searchQuery.value.trim()
    return trimmedQuery.length >= 2
}

/**
 * Performs search operation
 */
const performSearch = async () => {
    if (!isValidSearch()) {
        toast.add({
            severity: 'warn',
            summary: 'Search too short',
            detail: 'Please enter at least 2 characters',
            life: 3000,
        })
        return
    }

    isLoading.value = true
    hasSearched.value = true

    try {
        const query = searchQuery.value.trim()

        if (searchType.value === 'datasets') {
            const datasets = await searchService.searchDatasets(query)

            searchResults.value = datasets.map((dataset) => ({
                id: dataset.dataset_id,
                name: dataset.dataset_name,
                description: dataset.description,
                owner: dataset.owner,
                status: dataset.status,
                vote_count: dataset.vote_count,
                download_count: dataset.download_count,
                created_at: dataset.created_at,
                updated_at: dataset.updated_at,
                header_photo_url: dataset.header_photo_url,
            }))
        } else {
            const users = await searchService.searchUsers(query)

            // Enrich user data with additional information
            const enrichedUsers = await Promise.all(
                users.map(async (user) => {
                    const [followers, datasets] = await Promise.all([
                        searchService.getUserFollowerCount(user.username),
                        searchService.getUserDatasetCount(user.username),
                    ])

                    return {
                        id: user.userId,
                        fullName: user.fullName,
                        username: user.username,
                        isAdmin: user.isAdmin,
                        avatarUrl: user.avatarUrl,
                        followers: followers,
                        datasets: datasets,
                    }
                }),
            )

            searchResults.value = enrichedUsers
        }
    } catch (error) {
        console.error('Search failed:', error)
        toast.add({
            severity: 'error',
            summary: 'Search failed',
            detail: error.message || 'Please try again',
            life: 5000,
        })
        searchResults.value = []
    } finally {
        isLoading.value = false
    }
}

/**
 * Clears search results
 */
const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = []
    hasSearched.value = false
}

/**
 * Gets dataset header image URL
 */
const getDatasetHeaderUrl = (dataset) => {
    if (!dataset.header_photo_url) return null

    try {
        const url = new URL(dataset.header_photo_url)
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
 * Gets user avatar URL
 */
const getUserAvatarUrl = (user) => {
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
 * Gets user avatar classes
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
 * Gets user initials
 */
const getUserInitials = (user) => {
    if (!user?.fullName) return '*'
    return user.fullName
        .split(' ')
        .map((fullName) => fullName.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
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
 * Navigates to dataset detail
 */
const navigateToDataset = (datasetId) => {
    router.push(`/datasets/${datasetId}`)
}

/**
 * Navigates to user profile
 */
const navigateToProfile = (username) => {
    router.push(`/profile/${username}`)
}
</script>

<style scoped>
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
</style>
