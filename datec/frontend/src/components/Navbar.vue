<template>
    <div class="navbar-container">
        <Menubar :model="menuItems" class="custom-menubar">
            <template #start>
                <div class="flex items-center gap-2 cursor-pointer" @click="goHome">
                    <i class="pi pi-bullseye text-2xl text-primary"></i>
                    <span class="font-bold text-xl text-primary hidden sm:block">DaTEC</span>
                </div>
            </template>

            <template #end>
                <div class="flex items-center gap-2">
                    <!-- Notifications -->
                    <Button icon="pi pi-bell" text rounded severity="secondary" @click="showNotifications"
                        :badge="notificationCount > 0 ? notificationCount.toString() : null"
                        badge-class="notification-badge" />

                    <!-- User Avatar -->
                    <Avatar :image="userAvatar" :label="userInitials" size="large"
                        class="cursor-pointer border-2 border-transparent hover:border-primary transition-colors"
                        @click="toggleUserMenu" :class="avatarClasses" />

                    <!-- User Menu -->
                    <OverlayPanel ref="userMenuOp" :dismissable="true" class="user-menu-overlay">
                        <div class="w-64">
                            <!-- User Info -->
                            <div class="p-3 border-b border-gray-200">
                                <div class="font-semibold text-gray-900">{{ authStore.user?.fullName }}</div>
                                <div class="text-sm text-gray-500">@{{ authStore.user?.username }}</div>
                            </div>

                            <!-- Menu Items -->
                            <div class="py-1">
                                <MenuItem v-for="item in userMenuItems" :key="item.label" :label="item.label"
                                    :icon="item.icon" :command="item.command"
                                    :class="{ 'text-red-600': item.label === 'Log Out' }" />
                            </div>
                        </div>
                    </OverlayPanel>
                </div>
            </template>
        </Menubar>

        <!-- Message Popover -->
        <OverlayPanel ref="messageOp" class="message-overlay">
            <div class="w-80 p-4">
                <h3 class="font-semibold mb-3">Send Message</h3>
                <div class="flex gap-2">
                    <InputText v-model="messageUsername" placeholder="Type username..." class="flex-1"
                        @keyup.enter="startChat" />
                    <Button icon="pi pi-send" @click="startChat" :disabled="!isValidUsername" />
                </div>
                <small class="text-gray-500 block mt-2">
                    Enter a username to start chatting
                </small>
            </div>
        </OverlayPanel>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Refs
const userMenuOp = ref()
const messageOp = ref()
const messageUsername = ref('')
const notificationCount = ref(0)

/**
 * Computed property for user avatar image
 */
const userAvatar = computed(() => {
    return authStore.user?.avatarUrl || null
})

/**
 * Computed property for user initials
 */
const userInitials = computed(() => {
    if (!authStore.user?.fullName) return '?'
    return authStore.user.fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
})

/**
 * Computed property for avatar styling
 */
const avatarClasses = computed(() => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500']
    const index = (authStore.user?.username?.charCodeAt(0) || 0) % colors.length
    return `${colors[index]} text-white`
})

/**
 * Computed property for username validation
 */
const isValidUsername = computed(() => {
    return messageUsername.value.trim().length >= 2
})

/**
 * Main menu items for Menubar
 */
const menuItems = ref([])

/**
 * User menu items for overlay panel
 */
const userMenuItems = computed(() => [
    {
        label: 'Search',
        icon: 'pi pi-search',
        command: () => {
            router.push('/')
            userMenuOp.value.hide()
        }
    },
    {
        label: 'New Dataset',
        icon: 'pi pi-folder-plus',
        command: () => {
            if (!authStore.isLoggedIn) {
                toast.add({
                    severity: 'warn',
                    summary: 'Authentication Required',
                    detail: 'Please log in to create datasets',
                    life: 3000
                })
                router.push('/login')
            } else {
                router.push('/datasets/create')
            }
            userMenuOp.value.hide()
        }
    },
    {
        label: 'New Message',
        icon: 'pi pi-envelope',
        command: () => {
            showMessagePopup()
            userMenuOp.value.hide()
        }
    },
    {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => {
            router.push('/settings')
            userMenuOp.value.hide()
        }
    },
    {
        separator: true
    },
    {
        label: 'Log Out',
        icon: 'pi pi-sign-out',
        command: () => {
            authStore.logout()
            toast.add({
                severity: 'info',
                summary: 'Logged Out',
                detail: 'You have been successfully logged out',
                life: 3000
            })
            router.push('/login')
            userMenuOp.value.hide()
        }
    }
])

/**
 * Navigates to home page
 */
const goHome = () => {
    router.push('/')
}

/**
 * Toggles user menu overlay
 */
const toggleUserMenu = (event) => {
    userMenuOp.value.toggle(event)
}

/**
 * Shows notifications (placeholder)
 */
const showNotifications = () => {
    toast.add({
        severity: 'info',
        summary: 'Notifications',
        detail: 'Notification system coming soon!',
        life: 3000
    })
}

/**
 * Shows message popup overlay
 */
const showMessagePopup = (event) => {
    if (!authStore.isLoggedIn) {
        toast.add({
            severity: 'warn',
            summary: 'Authentication Required',
            detail: 'Please log in to send messages',
            life: 3000
        })
        router.push('/login')
        return
    }

    messageUsername.value = ''
    messageOp.value.toggle(event)
}

/**
 * Starts chat with specified user
 */
const startChat = async () => {
    if (!isValidUsername.value) {
        toast.add({
            severity: 'warn',
            summary: 'Invalid Username',
            detail: 'Please enter a valid username',
            life: 3000
        })
        return
    }

    const targetUsername = messageUsername.value.trim()

    try {
        // Navigate to profile and open chat
        router.push(`/profile/${targetUsername}`)
        messageOp.value.hide()

        toast.add({
            severity: 'success',
            summary: 'Chat Started',
            detail: `Navigating to ${targetUsername}'s profile`,
            life: 3000
        })

    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to start chat. User may not exist.',
            life: 5000
        })
    }
}

// Initialize menu items
onMounted(() => {
    // Add dynamic menu items here if needed
})
</script>

<style scoped>
.navbar-container {
    position: sticky;
    top: 0;
    z-index: 1000;
}

.custom-menubar {
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.notification-badge) {
    background-color: #e74c3c;
    color: white;
    font-size: 0.7rem;
    min-width: 1.2rem;
    height: 1.2rem;
}

.user-menu-overlay {
    margin-top: 0.5rem;
}

.message-overlay {
    margin-top: 0.5rem;
}
</style>