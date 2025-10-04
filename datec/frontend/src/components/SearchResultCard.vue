<template>
    <Card class="h-full cursor-pointer hover:shadow-lg transition-shadow" @click="handleCardClick">
        <template #header>
            <div class="relative h-32 bg-gradient-to-r from-blue-500 to-gray-300 rounded-t-lg overflow-hidden">
                <!-- Dynamic background based on type -->
                <div :class="headerBackgroundClasses" class="absolute inset-0"></div>

                <!-- Thumbnail image with error handling -->
                <img v-if="showImage && item.thumbnail" :src="item.thumbnail" :alt="item.name"
                    class="w-full h-full object-cover" @error="handleImageError" @load="handleImageLoad" />

                <!-- Fallback content -->
                <div v-else class="w-full h-full flex items-center justify-center text-white">
                    <div class="text-center">
                        <i :class="defaultIcon" class="text-3xl mb-2"></i>
                        <p class="text-sm font-medium">{{ fallbackText }}</p>
                    </div>
                </div>

                <!-- Type badge -->
                <div class="absolute top-2 right-2">
                    <span :class="typeBadgeClasses"
                        class="px-2 py-1 text-xs font-semibold rounded-full text-white shadow-sm">
                        {{ item.type === 'dataset' ? 'Dataset' : 'User' }}
                    </span>
                </div>
            </div>
        </template>

        <template #title>
            <div class="flex items-start justify-between">
                <h3 class="text-lg font-semibold text-gray-900 line-clamp-2">
                    {{ item.name }}
                </h3>
            </div>
        </template>

        <template #subtitle>
            <div class="flex items-center gap-2 mt-1">
                <!-- Avatar with better fallback -->
                <div class="relative">
                    <Avatar v-if="showAvatar && item.thumbnail && item.type === 'user'" :image="item.thumbnail"
                        size="small" @error="handleAvatarError" @load="handleAvatarLoad" />
                    <Avatar v-else :label="avatarLabel" size="small" :class="avatarClasses" />
                </div>
                <span class="text-sm text-gray-600">@{{ item.username }}</span>
                <i v-if="item.isAdmin" class="pi pi-verified text-blue-500 ml-1" title="Admin"></i>
            </div>
        </template>

        <template #content>
            <!-- Description for datasets -->
            <p v-if="item.type === 'dataset' && item.description" class="text-gray-600 text-sm line-clamp-3 mb-3">
                {{ item.description }}
            </p>

            <!-- Tags for datasets -->
            <div v-if="item.type === 'dataset' && item.tags && item.tags.length" class="flex flex-wrap gap-1 mb-3">
                <span v-for="tag in item.tags.slice(0, 3)" :key="tag"
                    class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border">
                    {{ tag }}
                </span>
                <span v-if="item.tags.length > 3" class="px-2 py-1 text-gray-500 text-xs">
                    +{{ item.tags.length - 3 }}
                </span>
            </div>

            <!-- Stats Section -->
            <div class="border-t pt-3 mt-3">
                <!-- For Datasets: Multiple metrics -->
                <div v-if="item.type === 'dataset'" class="flex justify-between text-xs text-gray-600">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-1" :title="`${item.counter} votes`">
                            <i class="pi pi-star text-yellow-500"></i>
                            <span>{{ item.counter }}</span>
                        </div>
                        <div class="flex items-center gap-1" v-if="item.download_count > 0"
                            :title="`${item.download_count} downloads`">
                            <i class="pi pi-download text-blue-500"></i>
                            <span>{{ item.download_count }}</span>
                        </div>
                        <div class="flex items-center gap-1" v-if="item.comment_count > 0"
                            :title="`${item.comment_count} comments`">
                            <i class="pi pi-comments text-green-500"></i>
                            <span>{{ item.comment_count }}</span>
                        </div>
                    </div>
                </div>

                <!-- For Users: Followers only -->
                <div v-else class="flex justify-between items-center text-xs text-gray-600">
                    <div class="flex items-center gap-1" :title="`${item.counter} followers`">
                        <i class="pi pi-users text-orange-500"></i>
                        <span>{{ item.counter }}</span>
                    </div>
                    <div class="text-xs text-gray-500" :title="`Joined ${formattedDate}`">
                        {{ formattedDate }}
                    </div>
                </div>
            </div>
        </template>
    </Card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
    item: {
        type: Object,
        required: true
    }
})

// State for image loading
const showImage = ref(true)
const showAvatar = ref(true)
const imageLoaded = ref(false)
const avatarLoaded = ref(false)

/**
 * Computed property for header background gradient
 */
const headerBackgroundClasses = computed(() => {
    if (props.item.type === 'dataset') {
        return 'bg-gradient-to-tr from-emerald-400 to-gray-200'
    } else {
        return 'bg-gradient-to-tr from-sky-400 to-gray-200'
    }
})

/**
 * Computed property for type-specific badge styling
 */
const typeBadgeClasses = computed(() => {
    return props.item.type === 'dataset'
        ? 'bg-emerald-600'
        : 'bg-sky-600'
})

/**
 * Computed property for default icon
 */
const defaultIcon = computed(() => {
    return props.item.type === 'dataset'
        ? 'pi pi-database'
        : 'pi pi-user'
})

/**
 * Computed property for fallback text
 */
const fallbackText = computed(() => {
    return props.item.type === 'dataset'
        ? 'Dataset'
        : 'User'
})

/**
 * Computed property for avatar label
 */
const avatarLabel = computed(() => {
    return props.item.username.charAt(0).toUpperCase()
})

/**
 * Computed property for avatar background color
 */
const avatarClasses = computed(() => {
    const colors = [
        'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-800'
    ]
    const index = props.item.username.charCodeAt(0) % colors.length
    return `${colors[index]} text-white`
})

/**
 * Computed property for formatted counter value
 */
const formattedCounter = computed(() => {
    if (props.item.type === 'dataset') {
        return `${item.counter} ${props.item.counter === 1 ? 'vote' : 'votes'}`
    } else {
        return `${props.item.counter} ${props.item.counter === 1 ? 'follower' : 'followers'}`
    }
})

/**
 * Computed property for formatted date
 */
const formattedDate = computed(() => {
    const date = new Date(props.item.updated_at)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
    return date.toLocaleDateString()
})

/**
 * Handles header image loading errors
 */
const handleImageError = () => {
    console.warn(`Failed to load image: ${props.item.thumbnail}`)
    showImage.value = false
    imageLoaded.value = false
}

/**
 * Handles header image successful load
 */
const handleImageLoad = () => {
    imageLoaded.value = true
}

/**
 * Handles avatar image loading errors
 */
const handleAvatarError = () => {
    console.warn(`Failed to load avatar: ${props.item.thumbnail}`)
    showAvatar.value = false
    avatarLoaded.value = false
}

/**
 * Handles avatar image successful load
 */
const handleAvatarLoad = () => {
    avatarLoaded.value = true
}

/**
 * Handles card click navigation
 */
const handleCardClick = () => {
    if (props.item.type === 'dataset') {
        router.push(`/datasets/${props.item.id}`)
    } else {
        router.push(`/profile/${props.item.username}`)
    }
}
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* Smooth transitions for images */
img {
    transition: opacity 0.3s ease;
}
</style>