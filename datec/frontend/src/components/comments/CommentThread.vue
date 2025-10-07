<template>
    <div class="comment-thread" :style="{ marginLeft: `${nestingLevel * 24}px` }">
        <div
            v-for="comment in comments"
            :key="comment.comment_id"
            :class="[
                'comment-item',
                {
                    nested: nestingLevel > 0,
                },
            ]"
        >
            <!-- Comment Header -->
            <div class="comment-header">
                <div class="user-info">
                    <div class="flex" @click="goToProfile(comment.author.username)">
                        <Avatar
                            v-if="comment.author.avatar_url"
                            :image="getAvatarUrl(comment.author)"
                            shape="circle"
                            size="small"
                            class="comment-avatar"
                        />
                        <Avatar
                            v-else
                            :label="getInitials(comment.author.full_name)"
                            shape="circle"
                            size="small"
                            :class="getUserAvatarClasses(comment.author.username)"
                            class="comment-avatar"
                        />
                    </div>
                    <div class="user-details">
                        <span class="username">{{ comment.author.username }}</span>
                        <span class="timestamp">{{ formatDate(comment.created_at) }}</span>
                    </div>
                </div>

                <div class="comment-badges">
                    <Tag
                        v-if="!comment.is_active"
                        icon="pi pi-ban"
                        severity="danger"
                        size="small"
                    />
                    <Tag
                        v-else-if="comment.author.username === datasetOwnerUsername"
                        icon="pi pi-flag-fill"
                        severity="info"
                        size="small"
                    />
                    <Tag
                        v-else-if="comment.is_own_comment"
                        icon="pi pi-bullseye"
                        severity="secondary"
                        size="small"
                    />
                </div>
            </div>

            <!-- Comment Content -->
            <div class="comment-content">
                <div v-if="comment.is_active || isAdmin" class="active-content">
                    <p class="comment-text">{{ comment.content }}</p>
                </div>
                <div v-else class="disabled-content">
                    <i class="pi pi-ban text-gray-400 mr-2"></i>
                    <span class="text-gray-500 text-sm"
                        ><i>This comment has been moderated by an administrator.</i></span
                    >
                </div>
            </div>

            <!-- Comment Actions -->
            <div class="comment-actions" v-if="comment.is_active || isAdmin">
                <!-- Reply Button -->
                <Button
                    v-if="comment.is_active && nestingLevel < 5 && authStore.isLoggedIn"
                    label="Reply"
                    icon="pi pi-reply"
                    text
                    size="small"
                    severity="secondary"
                    @click="openReplyForm(comment.comment_id)"
                />

                <!-- Admin Actions -->
                <Button
                    v-if="isAdmin && comment.is_active"
                    label="Disable"
                    icon="pi pi-ban"
                    text
                    severity="danger"
                    size="small"
                    @click="disableComment(comment.comment_id)"
                />
                <Button
                    v-else-if="isAdmin && !comment.is_active"
                    label="Enable"
                    icon="pi pi-check"
                    text
                    severity="success"
                    size="small"
                    @click="enableComment(comment.comment_id)"
                />
            </div>

            <!-- Reply Form -->
            <CommentForm
                v-if="showReplyForm === comment.comment_id"
                :parentId="comment.comment_id"
                :datasetId="route.params.id"
                :nestingLevel="nestingLevel"
                @submit="handleReplySubmit"
                @cancel="closeReplyForm"
                class="reply-form"
            />

            <!-- Nested Replies (Recursive) -->
            <CommentThread
                v-if="comment.replies && comment.replies.length > 0"
                :comments="comment.replies"
                :nestingLevel="nestingLevel + 1"
                :datasetOwnerUsername="datasetOwnerUsername"
                @comment-updated="$emit('comment-updated')"
                class="nested-replies"
            />
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import CommentForm from './CommentForm.vue'
import api from '@/services/api'

const props = defineProps({
    comments: {
        type: Array,
        default: () => [],
    },
    nestingLevel: {
        type: Number,
        default: 0,
    },
    datasetOwnerUsername: {
        type: String,
        default: '',
    },
})

const emit = defineEmits(['comment-updated'])

const authStore = useAuthStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const showReplyForm = ref(null)

// Computed properties
const isAdmin = authStore.user?.isAdmin

// Methods
const getAvatarUrl = (user) => {
    if (!user?.avatar_url) return null
    try {
        const url = new URL(user.avatar_url)
        const pathParts = url.pathname.split('/').filter((part) => part)
        if (pathParts.length < 3) return null

        const documentId = pathParts[1]
        const filename = pathParts[2]
        return `http://localhost:3000/api/files/${documentId}/${filename}`
    } catch {
        return null
    }
}

const getInitials = (fullName) => {
    if (!fullName) return 'U'
    return fullName
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
}

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

const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffMins = Math.floor(diffTime / (1000 * 60))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    })
}

const openReplyForm = (commentId) => {
    if (!authStore.isLoggedIn) return
    showReplyForm.value = commentId
}

const closeReplyForm = () => {
    showReplyForm.value = null
}

const handleReplySubmit = async (content, parentId) => {
    try {
        emit('comment-updated')
        closeReplyForm()
    } catch (error) {
        console.error('Error in reply submission:', error)
        toast.add({
            severity: 'error',
            summary: 'Failed in reply submission',
            detail: error.message,
            life: 5000,
        })
    }
}

const disableComment = async (commentId) => {
    if (!isAdmin) return

    try {
        await api.patch(`/admin/comments/${commentId}/disable`)
        toast.add({
            severity: 'success',
            summary: 'Comment Disabled',
            detail: 'Comment has been disabled successfully',
            life: 3000,
        })
        emit('comment-updated')
    } catch (error) {
        console.error('Error disabling comment:', error)
        toast.add({
            severity: 'error',
            summary: 'Failed to disable comment',
            detail: error.message,
            life: 5000,
        })
    }
}

const enableComment = async (commentId) => {
    if (!isAdmin) return

    try {
        await api.patch(`/admin/comments/${commentId}/enable`)
        toast.add({
            severity: 'success',
            summary: 'Comment Enabled',
            detail: 'Comment has been enabled successfully',
            life: 3000,
        })
        emit('comment-updated')
    } catch (error) {
        console.error('Error enabling comment:', error)
        toast.add({
            severity: 'error',
            summary: 'Failed to enable comment',
            detail: error.message,
            life: 5000,
        })
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
.comment-thread {
    transition: all 0.3s ease;
}

.comment-item {
    padding: 1rem 0;
    border-bottom: 1px solid #e5e7eb;
}

.comment-item:last-child {
    border-bottom: none;
}

.comment-item.nested {
    border-left: 2px solid #e5e7eb;
    padding-left: 1rem;
}

.comment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.comment-avatar {
    flex-shrink: 0;
}

.user-details {
    display: flex;
    flex-direction: column;
}

.username {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
}

.timestamp {
    font-size: 0.75rem;
    color: #6b7280;
}

.comment-badges {
    display: flex;
    gap: 0.25rem;
}

.comment-content {
    margin-bottom: 0.5rem;
}

.comment-text {
    margin: 0;
    line-height: 1.5;
    color: #374151;
}

.comment-actions {
    display: flex;
    gap: 0.5rem;
}

.reply-form {
    margin-top: 1rem;
    margin-bottom: 1rem;
}

.nested-replies {
    margin-top: 0.5rem;
}
</style>
