<template>
    <Card class="h-full cursor-pointer hover:shadow-lg transition-shadow" @click="handleCardClick">
        <template #header>
            <div class="relative h-32 bg-gradient-to-r from-blue-500 to-gray-300 rounded-t-lg">
                <!-- Thumbnail or default background -->
                <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.name"
                    class="w-full h-full object-cover rounded-t-lg" />
                <div v-else class="w-full h-full flex items-center justify-center text-white">
                    <i :class="item.type === 'dataset' ? 'pi pi-database' : 'pi pi-user'" class="text-2xl"></i>
                </div>

                <!-- Type badge -->
                <div class="absolute top-2 right-2">
                    <span :class="typeBadgeClasses" class="px-2 py-1 text-xs font-semibold rounded-full text-white">
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
                <Avatar v-if="item.type === 'user' && item.thumbnail" :image="item.thumbnail" size="small" />
                <Avatar v-else :label="item.username.charAt(0).toUpperCase()" size="small"
                    class="bg-blue-500 text-white" />
                <span class="text-sm text-gray-600">@{{ item.username }}</span>
                <i v-if="item.isAdmin" class="pi pi-verified text-blue-500 ml-1"></i>
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
                    class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {{ tag }}
                </span>
                <span v-if="item.tags.length > 3" class="px-2 py-1 text-gray-500 text-xs">
                    +{{ item.tags.length - 3 }}
                </span>
            </div>

            <!-- Stats -->
            <div class="flex justify-between items-center text-sm text-gray-500 mt-4">
                <div class="flex items-center gap-1">
                    <i :class="counterIcon"></i>
                    <span>{{ formattedCounter }}</span>
                </div>
                <div class="text-xs">
                    {{ formattedDate }}
                </div>
            </div>
        </template>
    </Card>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
    item: {
        type: Object,
        required: true,
        validator: (value) => {
            return ['id', 'type', 'name', 'username', 'updated_at', 'counter'].every(prop => prop in value)
        }
    }
})

/**
 * Computed property for type-specific badge styling
 */
const typeBadgeClasses = computed(() => {
    return props.item.type === 'dataset'
        ? 'bg-blue-500'
        : 'bg-green-500'
})

/**
 * Computed property for counter display icon
 */
const counterIcon = computed(() => {
    return props.item.type === 'dataset'
        ? 'pi pi-star text-yellow-500'
        : 'pi pi-users text-orange-500'
})

/**
 * Computed property for formatted counter value
 */
const formattedCounter = computed(() => {
    if (props.item.type === 'dataset') {
        return `${props.item.counter} ${props.item.counter === 1 ? 'vote' : 'votes'}`
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

    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
})

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
</style>