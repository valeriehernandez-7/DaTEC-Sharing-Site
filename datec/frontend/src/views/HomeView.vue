<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Header Section -->
        <div class="bg-white shadow-sm border-b">
            <div class="container mx-auto px-4 py-6">
                <div class="text-center mb-8">
                    <i class="pi pi-bullseye text-6xl text-sky-600 mb-4"></i>
                    <h1 class="text-4xl font-bold text-sky-600 mb-4">DaTEC</h1>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                        <i>Data Sharing Platform for collaborative research and analysis </i><i
                            class="pi pi-bolt text"></i>
                    </p>
                </div>

                <!-- Search Section -->
                <div class="max-w-2xl mx-auto">
                    <!-- Search Input -->
                    <div class="flex gap-2 mb-4">
                        <InputText v-model="searchQuery" placeholder="Search datasets or users..." class="flex-1"
                            @keyup.enter="performSearch" />
                        <Button icon="pi pi-search" @click="performSearch" :loading="isLoading" />
                    </div>

                    <!-- Search Type Toggle -->
                    <div class="flex justify-center gap-2 mb-6">
                        <Button label="Datasets" icon="pi pi-chart-line"
                            :severity="searchType === 'datasets' ? 'primary' : 'secondary'"
                            @click="setSearchType('datasets')" />
                        <Button label="Users" icon="pi pi-user"
                            :severity="searchType === 'users' ? 'primary' : 'secondary'"
                            @click="setSearchType('users')" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Content Section -->
        <div class="container mx-auto px-4 py-8">
            <!-- Empty State -->
            <div v-if="!hasSearched" class="text-left py-12">
                <Card class="max-w-2xl mx-auto">
                    <template #content>
                        <div class="space-y-4">
                            <div class="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                                <i class="pi pi-search text-2xl text-blue-600"></i>
                                <div>
                                    <h3 class="font-semibold text-blue-900">Start Searching</h3>
                                    <p class="text-blue-700 text-sm">Enter a search term to discover datasets and users
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                                <i class="pi pi-upload text-2xl text-green-600"></i>
                                <div>
                                    <h3 class="font-semibold text-green-900">Share Your Data</h3>
                                    <p class="text-green-700 text-sm">Upload and share your datasets with the community
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                                <i class="pi pi-users text-2xl text-orange-600"></i>
                                <div>
                                    <h3 class="font-semibold text-orange-900">Collaborate</h3>
                                    <p class="text-orange-700 text-sm">Connect with researchers and data scientists</p>
                                </div>
                            </div>
                        </div>

                        <div class="mt-6 text-center">
                            <router-link v-if="!authStore.isLoggedIn" to="/login"
                                class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                Get Started
                            </router-link>
                            <p v-else class="text-gray-600">
                                Use the search bar above to explore content.
                            </p>
                        </div>
                    </template>
                </Card>
            </div>

            <!-- Loading State -->
            <div v-else-if="isLoading" class="text-center py-12">
                <ProgressSpinner />
                <p class="mt-4 text-gray-600">Looking for results</p>
            </div>

            <!-- Results Section -->
            <div v-else-if="searchResults.length > 0">
                <!-- Results Count -->
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-800">
                        Found {{ searchResults.length }} {{ searchType }}
                    </h2>
                </div>

                <!-- Results Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <SearchResultCard v-for="item in searchResults" :key="`${item.type}-${item.id}`" :item="item" />
                </div>

                <!-- Pagination (Placeholder for future implementation) -->
                <div class="flex justify-center items-center gap-2">
                    <Button icon="pi pi-chevron-left" severity="secondary" :disabled="currentPage === 1"
                        @click="previousPage" />
                    <span class="px-4 py-2 text-sm text-gray-600">
                        Page {{ currentPage }}
                    </span>
                    <Button icon="pi pi-chevron-right" severity="secondary" @click="nextPage" />
                </div>
            </div>

            <!-- No Results State -->
            <div v-else class="text-center py-12">
                <Card class="max-w-md mx-auto">
                    <template #content>
                        <i class="pi pi-spin pi-compass text-4xl text-gray-400 mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">No results found</h3>
                        <p class="text-gray-500">
                            Try adjusting your search terms or<br>search for something else.
                        </p>
                    </template>
                </Card>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { searchService } from '@/services/search'
import { useToast } from 'primevue/usetoast'

// Components
import SearchResultCard from '@/components/SearchResultCard.vue'

const authStore = useAuthStore()
const toast = useToast()

// Reactive state
const searchQuery = ref('')
const searchType = ref('datasets')
const searchResults = ref([])
const isLoading = ref(false)
const hasSearched = ref(false)
const currentPage = ref(1)

/**
 * Sets the search type and performs search if query exists
 * @param {string} type - Search type ('datasets' or 'users')
 */
const setSearchType = (type) => {
    searchType.value = type
    if (searchQuery.value.trim()) {
        performSearch()
    }
}

/**
 * Validates search query to prevent empty searches
 * @returns {boolean} Validation result
 */
const isValidSearch = () => {
    const trimmedQuery = searchQuery.value.trim()
    return trimmedQuery.length >= 2 // Minimum 2 characters
}

/**
 * Performs search operation based on current query and type
 * @returns {Promise<void>}
 */
const performSearch = async () => {
    if (!isValidSearch()) {
        toast.add({
            severity: 'warn',
            summary: 'Search too short',
            detail: 'Please enter at least 2 characters to search',
            life: 3000
        })
        return
    }

    isLoading.value = true
    hasSearched.value = true

    try {
        const query = searchQuery.value.trim()

        if (searchType.value === 'datasets') {
            const datasets = await searchService.searchDatasets(query)
            searchResults.value = datasets.map(dataset => ({
                id: dataset.dataset_id,
                type: 'dataset',
                name: dataset.dataset_name,
                username: dataset.owner?.username || 'Unknown',
                updated_at: dataset.created_at,
                counter: dataset.vote_count || 0,
                thumbnail: dataset.header_photo_url,
                description: dataset.description,
                tags: dataset.tags
            }))
        } else {
            const users = await searchService.searchUsers(query)
            searchResults.value = users.map(user => ({
                id: user.userId,
                type: 'user',
                name: user.fullName,
                username: user.username,
                updated_at: user.createdAt,
                counter: 0, // Followers count would come from separate endpoint
                thumbnail: user.avatarUrl,
                isAdmin: user.isAdmin
            }))
        }

        currentPage.value = 1

    } catch (error) {
        console.error('Search failed:', error)
        toast.add({
            severity: 'error',
            summary: 'Search Error',
            detail: 'Failed to perform search. Please try again.',
            life: 5000
        })
        searchResults.value = []
    } finally {
        isLoading.value = false
    }
}

/**
 * Navigates to previous results page
 */
const previousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        // In future: implement actual pagination with API
    }
}

/**
 * Navigates to next results page
 */
const nextPage = () => {
    currentPage.value++
    // In future: implement actual pagination with API
}
</script>