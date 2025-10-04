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
                    <!-- Notifications (only when logged in) -->
                    <Button v-if="authStore.isLoggedIn" icon="pi pi-bell" text rounded severity="secondary"
                        @click="showNotifications" :badge="notificationCount > 0 ? notificationCount.toString() : null"
                        badge-class="notification-badge" />

                    <!-- User Avatar (only when logged in) -->
                    <Avatar v-if="authStore.isLoggedIn" :image="userAvatar" :label="userInitials" size="medium"
                        shape="circle" :class="avatarClasses" />

                    <!-- User Menu Button (only when logged in) -->
                    <Button v-if="authStore.isLoggedIn" icon="pi pi-ellipsis-v" text rounded severity="secondary"
                        @click="toggleUserMenu" />

                    <!-- Login Button when not authenticated -->
                    <Button v-else label="Log In" icon="pi pi-sign-in" @click="goToLogin" rounded class="bg-sky-600" />

                    <!-- User Menu (only when logged in) -->
                    <Menu v-if="authStore.isLoggedIn" ref="userMenu" :model="userMenuItems" :popup="true"
                        class="user-menu-overlay" />
                </div>
            </template>
        </Menubar>

        <!-- Contact Dialog -->
        <Dialog v-model:visible="showContactDialog" header="Contact User" :style="{ width: '450px' }" :modal="true">
            <div class="p-fluid">
                <div class="field">
                    <label for="username">Username</label>
                    <InputText id="username" v-model="contactUsername" placeholder="Enter username to contact..."
                        class="w-full mt-2" @keyup.enter="findUser" :class="{ 'p-invalid': usernameError }" />
                    <small v-if="usernameError" class="p-error">{{ usernameError }}</small>
                </div>
                <small class="text-gray-500 block mt-2">
                    Enter a username to start a conversation
                </small>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="closeContactDialog" />
                <Button label="Contact" icon="pi pi-user" @click="findUser" :loading="isCheckingUser"
                    :disabled="!isValidUsername" />
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
const showContactDialog = ref(false)
const contactUsername = ref('')
const notificationCount = ref(0)
const isCheckingUser = ref(false)
const usernameError = ref('')

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
    return contactUsername.value.trim().length >= 2
})

// Main menu items for Menubar
const menuItems = ref([])

// User menu items (only shown when logged in)
const userMenuItems = computed(() => [
    {
        label: 'Search',
        icon: 'pi pi-search',
        command: () => {
            router.push('/')
        }
    },
    {
        label: 'New Dataset',
        icon: 'pi pi-folder-plus',
        command: () => {
            router.push('/datasets/create')
        }
    },
    {
        label: 'Contact User',
        icon: 'pi pi-envelope',
        command: () => {
            showContactDialog.value = true
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
])

/**
 * Toggles user menu overlay
 */
const toggleUserMenu = (event) => {
    userMenu.value.toggle(event)
}

/**
 * Navigates to login page
 */
const goToLogin = () => {
    router.push('/login')
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
 * Closes contact dialog and resets state
 */
const closeContactDialog = () => {
    showContactDialog.value = false
    contactUsername.value = ''
    usernameError.value = ''
    isCheckingUser.value = false
}

/**
 * Checks if user exists and navigates to their profile
 */
const findUser = async () => {
    if (!isValidUsername.value) {
        usernameError.value = 'Please enter a valid username (min 2 characters)'
        return
    }

    const targetUsername = contactUsername.value.trim()

    // Don't allow contacting yourself
    if (targetUsername === authStore.user?.username) {
        usernameError.value = 'You cannot contact yourself'
        return
    }

    isCheckingUser.value = true
    usernameError.value = ''

    try {
        // Check if user exists by calling the API
        const response = await fetch(`http://localhost:3000/api/users/${targetUsername}`)

        if (response.ok) {
            const userData = await response.json()

            if (userData.success) {
                // User exists, navigate to their profile
                closeContactDialog()
                router.push(`/profile/${targetUsername}`)

                toast.add({
                    severity: 'success',
                    summary: 'User Found',
                    detail: `Navigating to ${targetUsername}'s profile`,
                    life: 3000
                })
            } else {
                usernameError.value = 'User not found'
            }
        } else if (response.status === 404) {
            usernameError.value = 'User not found'
        } else {
            usernameError.value = 'Error checking user'
        }

    } catch (error) {
        console.error('Error finding user:', error)
        usernameError.value = 'Failed to check user. Please try again.'
    } finally {
        isCheckingUser.value = false
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