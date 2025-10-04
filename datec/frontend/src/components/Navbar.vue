<template>
    <div class="navbar-container">
        <Menubar :model="menuItems" class="custom-menubar">
            <template #start>
                <div class="flex items-center gap-2 cursor-pointer" @click="goHome">
                    <i class="pi pi-bullseye text-2xl text-sky-600"></i>
                    <span class="font-bold text-xl text-sky-600 hidden sm:block">DaTEC</span>
                </div>
            </template>

            <template #end>
                <div class="flex items-center gap-2">
                    <!-- Notifications -->
                    <Button icon="pi pi-bell" text rounded severity="secondary" @click="showNotifications"
                        :badge="notificationCount > 0 ? notificationCount.toString() : null"
                        badge-class="notification-badge" />

                    <!-- User Avatar (Visual only when logged in) -->
                    <Avatar v-if="authStore.isLoggedIn" :image="userAvatar" :label="userInitials" size="medium"
                        shape="circle" :class="avatarClasses" />

                    <!-- User Menu Button -->
                    <Button icon="pi pi-ellipsis-v" text rounded severity="secondary" @click="toggleUserMenu" />

                    <!-- User Menu (Dynamic based on auth) -->
                    <Menu ref="userMenu" :model="userMenuItems" :popup="true" class="user-menu-overlay" />
                </div>
            </template>
        </Menubar>

        <!-- Message Dialog -->
        <Dialog v-model:visible="showMessageDialog" header="New Message" :style="{ width: '450px' }" :modal="true">
            <div class="p-fluid">
                <div class="field">
                    <label for="username">Recipient Username</label>
                    <InputText id="username" v-model="messageUsername" placeholder="Enter username..."
                        class="w-full mt-2" @keyup.enter="startChat" />
                </div>
                <small class="text-gray-500 block mt-2">
                    Enter a username to start chatting
                </small>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="showMessageDialog = false" />
                <Button label="Contact" icon="pi pi-send" @click="startChat" :disabled="!isValidUsername" />
            </template>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Refs
const userMenu = ref()
const showMessageDialog = ref(false)
const messageUsername = ref('')
const notificationCount = ref(0)

// Computed properties
const userAvatar = computed(() => authStore.user?.avatarUrl || null)

const userInitials = computed(() => {
    if (!authStore.user?.fullName) return '?'
    return authStore.user.fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
})

const avatarClasses = computed(() => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500']
    const index = (authStore.user?.username?.charCodeAt(0) || 0) % colors.length
    return `${colors[index]} text-white`
})

const isValidUsername = computed(() => {
    return messageUsername.value.trim().length >= 2
})

// Main menu items for Menubar (empty for now, can add items later)
const menuItems = ref([])

// Dynamic user menu items based on authentication
const userMenuItems = computed(() => {
    const baseItems = [
        {
            label: 'Search',
            icon: 'pi pi-search',
            command: () => {
                router.push('/')
            }
        }
    ]

    if (authStore.isLoggedIn) {
        return [
            ...baseItems,
            {
                label: 'New Dataset',
                icon: 'pi pi-folder-plus',
                command: () => {
                    router.push('/datasets/create')
                }
            },
            {
                label: 'New Message',
                icon: 'pi pi-envelope',
                command: () => {
                    showMessageDialog.value = true
                }
            },
            {
                label: 'Settings',
                icon: 'pi pi-cog',
                command: () => {
                    router.push('/settings')
                }
            },
            { separator: true },
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
                }
            }
        ]
    } else {
        return [
            ...baseItems,
            {
                label: 'Log In',
                icon: 'pi pi-sign-in',
                command: () => {
                    router.push('/login')
                }
            }
        ]
    }
})

/**
 * Toggles user menu overlay
 */
const toggleUserMenu = (event) => {
    userMenu.value.toggle(event)
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
        showMessageDialog.value = false
        messageUsername.value = ''

        router.push(`/profile/${targetUsername}`)

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

/**
 * Navigates to home page
 */
const goHome = () => {
    router.push('/')
}
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
</style>