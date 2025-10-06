<template>
    <div class="comment-form" :class="{ 'nested-form': nestingLevel > 0 }">
        <div class="form-header">
            <Avatar v-if="authStore.user?.avatarUrl" :image="getUserAvatarUrl()" shape="circle" size="small" />
            <Avatar v-else :label="getUserInitials()" shape="circle" size="small" :class="getUserAvatarClasses()" />
            <span class="reply-label">
                {{ parentId ? `Replying to comment` : 'Write your comment' }}
            </span>
        </div>

        <div class="form-content">
            <Textarea v-model="content" :placeholder="parentId ? 'Write your reply...' : 'Write your comment...'"
                :rows="4" class="w-full" :class="{ 'p-invalid': contentError }" @input="clearError"
                @keydown="handleKeydown" />

            <div class="form-footer">
                <div class="char-counter" :class="{ 'text-red-500': content.length > 2000 }">
                    {{ content.length }}/2000
                </div>

                <div class="form-actions">
                    <Button label="Cancel" text size="small" severity="secondary" @click="$emit('cancel')"
                        v-if="parentId" />
                    <Button :label="parentId ? 'Reply' : 'Comment'" icon="pi pi-send" size="small"
                        :disabled="!canSubmit" :loading="loading" @click="submitComment" />
                </div>
            </div>

            <small v-if="contentError" class="p-error mt-2 block">{{ contentError }}</small>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import Avatar from 'primevue/avatar'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import api from '@/services/api'

const props = defineProps({
    parentId: {
        type: String,
        default: null
    },
    nestingLevel: {
        type: Number,
        default: 0
    }
})

const emit = defineEmits(['submit', 'cancel'])

const authStore = useAuthStore()
const toast = useToast()

const content = ref('')
const loading = ref(false)
const contentError = ref('')

// Computed properties
const canSubmit = computed(() => {
    return content.value.trim().length > 0 &&
        content.value.length <= 2000 &&
        !loading.value
})

// Methods
const getUserAvatarUrl = () => {
    if (!authStore.user?.avatarUrl) return null
    try {
        const url = new URL(authStore.user.avatarUrl)
        const pathParts = url.pathname.split('/').filter(part => part)
        if (pathParts.length < 3) return null

        const documentId = pathParts[1]
        const filename = pathParts[2]
        return `http://localhost:3000/api/files/${documentId}/${filename}`
    } catch {
        return null
    }
}

const getUserInitials = () => {
    if (!authStore.user?.fullName) return 'U'
    return authStore.user.fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
}

const getUserAvatarClasses = () => {
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
    const index = (authStore.user?.username?.charCodeAt(0) || 0) % colors.length
    return `${colors[index]} text-white`
}

const clearError = () => {
    contentError.value = ''
}

const handleKeydown = (event) => {
    if (event.key === 'Enter' && event.ctrlKey && canSubmit.value) {
        event.preventDefault()
        submitComment()
    }
}

const submitComment = async () => {
    if (!canSubmit.value) return

    // Validation
    if (content.value.trim().length === 0) {
        contentError.value = 'Comment cannot be empty'
        return
    }

    if (content.value.length > 2000) {
        contentError.value = 'Comment cannot exceed 2000 characters'
        return
    }

    loading.value = true

    try {
        const payload = {
            content: content.value.trim()
        }

        if (props.parentId) {
            payload.parent_comment_id = props.parentId
        }

        await api.post(`/datasets/${getCurrentDatasetId()}/comments`, payload)

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: props.parentId ? 'Reply posted successfully' : 'Comment posted successfully',
            life: 3000
        })

        // Emit success and reset
        emit('submit', content.value, props.parentId)
        content.value = ''
        contentError.value = ''

    } catch (error) {
        console.error('Error posting comment:', error)
        contentError.value = error.response?.data?.error || 'Failed to post comment'

        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.response?.data?.error || 'Failed to post comment',
            life: 5000
        })
    } finally {
        loading.value = false
    }
}

const getCurrentDatasetId = () => {
    // This should be passed as prop or from route in actual implementation
    const route = useRoute()
    return route.params.id
}
</script>

<style scoped>
.comment-form {
    background-color: #f9fafb;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #e5e7eb;
}

.comment-form.nested-form {
    background-color: #ffffff;
    border: 1px solid #d1d5db;
}

.form-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.reply-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
}

.form-content {
    margin-left: 2.5rem;
}

.form-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
}

.char-counter {
    font-size: 0.75rem;
    color: #6b7280;
}

.form-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

:deep(.p-textarea) {
    width: 100%;
}
</style>