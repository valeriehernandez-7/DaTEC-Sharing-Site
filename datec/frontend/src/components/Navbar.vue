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
                        @click="toggleNotifications"
                        :badge="notificationCount > 0 ? notificationCount.toString() : null"
                        badge-class="notification-badge" />

                    <!-- Notifications Menu -->
                    <Menu v-if="authStore.isLoggedIn" ref="notificationsMenu" :model="notificationItems" :popup="true"
                        class="notifications-overlay" />

                    <!-- User Avatar (clickable to profile) -->
                    <Avatar v-if="authStore.isLoggedIn" :image="userAvatar" :label="userInitials" size="medium"
                        shape="circle" :class="avatarClasses" class="cursor-pointer" @click="goToProfile" />

                    <!-- User Menu Button -->
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

        <!-- Settings Dialog -->
        <Dialog v-model:visible="showSettingsDialog" header="Settings" :style="{ width: '600px' }" :modal="true"
            :closable="false">
            <div class="p-fluid" v-if="userData">
                <div class="field grid">
                    <label for="avatar" class="col-12 mb-2">Profile Picture</label>
                    <div class="col-12 flex items-center gap-4">
                        <Avatar :image="userData.avatarUrl" :label="userData.fullName?.charAt(0) || 'U'" size="xlarge"
                            shape="circle" class="bg-blue-500 text-white" />
                        <FileUpload mode="basic" name="avatar" accept="image/*" :maxFileSize="5000000"
                            chooseLabel="Change Avatar" @select="onAvatarSelect" />
                    </div>
                </div>

                <div class="field grid">
                    <label for="fullName" class="col-12 mb-1">Full Name</label>
                    <div class="col-12">
                        <InputText id="fullName" v-model="userData.fullName" class="w-full" />
                    </div>
                </div>

                <div class="field grid">
                    <label for="email" class="col-12 mb-1">Email Address</label>
                    <div class="col-12">
                        <InputText id="email" v-model="userData.emailAddress" type="email" class="w-full" />
                    </div>
                </div>

                <div class="field grid">
                    <label for="birthDate" class="col-12 mb-1">Birth Date</label>
                    <div class="col-12">
                        <InputText id="birthDate" v-model="userData.birthDate" type="date" class="w-full" />
                    </div>
                </div>

                <div class="field grid">
                    <label class="col-12 mb-1">Account Information</label>
                    <div class="col-12">
                        <InputText v-model="userData.username" class="w-full" disabled placeholder="Username" />
                        <small class="text-gray-500">Username cannot be changed</small>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="closeSettingsDialog" :disabled="isSaving" />
                <Button label="Save Changes" icon="pi pi-check" @click="saveSettings" :loading="isSaving"
                    :disabled="!hasChanges" />
            </template>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Refs
const userMenu = ref()
const notificationsMenu = ref()
const showContactDialog = ref(false)
const showSettingsDialog = ref(false)
const contactUsername = ref('')
const notificationCount = ref(0)
const isCheckingUser = ref(false)
const usernameError = ref('')
const isSaving = ref(false)
const userData = ref(null)
const originalUserData = ref(null)
const notifications = ref([])

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

const hasChanges = computed(() => {
    if (!userData.value || !originalUserData.value) return false
    return JSON.stringify(userData.value) !== JSON.stringify(originalUserData.value)
})

// Notification items
const notificationItems = computed(() => {
    if (notifications.value.length === 0) {
        return [
            {
                label: 'No notifications',
                icon: 'pi pi-inbox',
                disabled: true
            }
        ]
    }

    const items = notifications.value.map(notification => ({
        label: formatNotification(notification),
        icon: getNotificationIcon(notification.type),
        command: () => handleNotificationClick(notification)
    }))

    items.push({ separator: true })
    items.push({
        label: 'Clear All',
        icon: 'pi pi-trash',
        command: clearAllNotifications
    })

    return items
})

// Main menu items for Menubar
const menuItems = ref([])

// User menu items
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
            openSettingsDialog()
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

// Lifecycle
onMounted(() => {
    if (authStore.isLoggedIn) {
        loadNotificationCount()
        loadNotifications()
    }
})

// Methods
const toggleUserMenu = (event) => {
    userMenu.value.toggle(event)
}

const toggleNotifications = (event) => {
    notificationsMenu.value.toggle(event)
}

const goToLogin = () => {
    router.push('/login')
}

const goToProfile = () => {
    if (authStore.isLoggedIn) {
        router.push(`/profile/${authStore.user.username}`)
    }
}

/**
 * Load notification count
 */
const loadNotificationCount = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/notifications/count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })

        if (response.ok) {
            const data = await response.json()
            notificationCount.value = data.count || 0
        }
    } catch (error) {
        console.error('Failed to load notification count:', error)
    }
}

/**
 * Load notifications
 */
const loadNotifications = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/notifications', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })

        if (response.ok) {
            const data = await response.json()
            notifications.value = data.notifications || []
        }
    } catch (error) {
        console.error('Failed to load notifications:', error)
    }
}

/**
 * Clear all notifications
 */
const clearAllNotifications = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/notifications', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })

        if (response.ok) {
            notifications.value = []
            notificationCount.value = 0
            toast.add({
                severity: 'success',
                summary: 'Cleared',
                detail: 'All notifications cleared',
                life: 3000
            })
        }
    } catch (error) {
        console.error('Failed to clear notifications:', error)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to clear notifications',
            life: 5000
        })
    }
}

/**
 * Format notification message
 */
const formatNotification = (notification) => {
    const messages = {
        'new_follower': `${notification.from_username} started following you`,
        'new_dataset': `${notification.from_username} published a new dataset`,
        'dataset_approved': `Your dataset "${notification.dataset_name}" was approved`,
        'dataset_rejected': `Your dataset "${notification.dataset_name}" was rejected`
    }

    return messages[notification.type] || notification.message || 'New notification'
}

/**
 * Get notification icon
 */
const getNotificationIcon = (type) => {
    const icons = {
        'new_follower': 'pi pi-user-plus',
        'new_dataset': 'pi pi-database',
        'dataset_approved': 'pi pi-check',
        'dataset_rejected': 'pi pi-times'
    }

    return icons[type] || 'pi pi-bell'
}

/**
 * Handle notification click
 */
const handleNotificationClick = (notification) => {
    if (notification.dataset_id) {
        router.push(`/datasets/${notification.dataset_id}`)
    } else if (notification.from_username) {
        router.push(`/profile/${notification.from_username}`)
    }
}

/**
 * Open settings dialog and load user data
 */
const openSettingsDialog = async () => {
    showSettingsDialog.value = true
    isSaving.value = false

    try {
        const response = await fetch(`http://localhost:3000/api/users/${authStore.user.username}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })

        if (response.ok) {
            const data = await response.json()
            userData.value = { ...data.user }
            originalUserData.value = { ...data.user }

            // Format date for input
            if (userData.value.birthDate) {
                userData.value.birthDate = userData.value.birthDate.split('T')[0]
            }
        } else {
            throw new Error('Failed to load user data')
        }
    } catch (error) {
        console.error('Failed to load user data:', error)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load user data',
            life: 5000
        })
        showSettingsDialog.value = false
    }
}

/**
 * Close settings dialog
 */
const closeSettingsDialog = () => {
    showSettingsDialog.value = false
    userData.value = null
    originalUserData.value = null
}

/**
 * Handle avatar file selection
 */
const onAvatarSelect = (event) => {
    // TODO: Implement avatar upload
    toast.add({
        severity: 'info',
        summary: 'Avatar Upload',
        detail: 'Avatar upload functionality coming soon',
        life: 3000
    })
}

/**
 * Save user settings
 */
const saveSettings = async () => {
    if (!userData.value || !hasChanges.value) return

    isSaving.value = true

    try {
        const response = await fetch(`http://localhost:3000/api/users/${authStore.user.username}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: userData.value.fullName,
                email_address: userData.value.emailAddress,
                birth_date: userData.value.birthDate
                // avatar will be handled separately with file upload
            })
        })

        if (response.ok) {
            const data = await response.json()
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: data.message || 'Profile updated successfully',
                life: 3000
            })

            // Update auth store with new data
            await authStore.fetchCurrentUser()
            closeSettingsDialog()
        } else {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to update profile')
        }
    } catch (error) {
        console.error('Failed to save settings:', error)
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to update profile',
            life: 5000
        })
    } finally {
        isSaving.value = false
    }
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

.user-menu-overlay,
.notifications-overlay {
    margin-top: 0.5rem;
}
</style>