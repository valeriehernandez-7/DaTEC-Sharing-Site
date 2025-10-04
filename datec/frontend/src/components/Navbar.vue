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
        <Dialog v-model:visible="showSettingsDialog" modal header="Edit Profile" :style="{ width: '500px' }"
            :closable="false">
            <template #header>
                <div class="inline-flex items-center justify-center gap-3">
                    <Avatar :image="userData?.avatarUrl" :label="userData?.fullName?.charAt(0) || 'U'" size="large"
                        shape="circle" class="bg-blue-500 text-white" />
                    <span class="font-bold text-lg">{{ userData?.fullName || 'User' }}</span>
                </div>
            </template>

            <div class="space-y-4">
                <!-- Avatar Upload Section -->
                <div class="text-center mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-3">Profile Picture</label>
                    <FileUpload mode="basic" name="avatar" accept="image/*" :maxFileSize="5000000"
                        chooseLabel="Choose New Avatar" :auto="true" @select="onAvatarSelect" class="w-full" />
                    <small class="text-gray-500 block mt-2">Max file size: 5MB. Supported formats: JPG, PNG, GIF</small>
                </div>

                <!-- Form Fields -->

                <div class="flex items-center gap-4">
                    <label for="username" class="font-semibold w-32">Username</label>
                    <InputText id="username" v-model="userData.username" class="flex-auto" disabled
                        placeholder="Username" />
                </div>

                <div class="flex items-center gap-4">
                    <label for="fullName" class="font-semibold w-32">Full Name</label>
                    <InputText id="fullName" v-model="userData.fullName" class="flex-auto"
                        placeholder="Enter your full name" />
                </div>

                <div class="flex items-center gap-4">
                    <label for="email" class="font-semibold w-32">Email</label>
                    <InputText id="email" v-model="userData.emailAddress" type="email" class="flex-auto"
                        placeholder="Enter your email address" />
                </div>

                <div class="flex items-center gap-4">
                    <label for="birthDate" class="font-semibold w-32">Birth Date</label>
                    <DatePicker id="birthDate" v-model="userData.birthDate" class="flex-auto" dateFormat="yy-mm-dd"
                        :maxDate="maxDate" :minDate="minDate" showIcon iconDisplay="input"
                        placeholder="Select your birth date" />
                </div>

                <!-- Read-only Information -->
                <div class="bg-gray-50 p-4 rounded-lg mt-6">
                    <h4 class="font-semibold text-gray-700 mb-2">Account Information</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Member Since:</span>
                            <span class="font-medium">{{ formatDate(userData?.createdAt) }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Role:</span>
                            <span class="font-medium">
                                <Tag :value="userData?.isAdmin ? 'Administrator' : 'User'"
                                    :severity="userData?.isAdmin ? 'danger' : 'info'" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text severity="secondary" @click="closeSettingsDialog"
                    :disabled="isSaving" />
                <Button label="Save Changes" icon="pi pi-check" @click="saveSettings" :loading="isSaving"
                    :disabled="!hasChanges" />
            </template>
        </Dialog>

        <!-- Avatar Upload Dialog -->
        <Dialog v-model:visible="showAvatarUploadDialog" header="Upload Avatar" :style="{ width: '400px' }"
            :modal="true">
            <div class="text-center" v-if="selectedAvatarFile">
                <img :src="avatarPreviewUrl" alt="Avatar Preview"
                    class="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-2 border-gray-300" />
                <p class="text-sm text-gray-600 mb-4">{{ selectedAvatarFile.name }} ({{
                    formatFileSize(selectedAvatarFile.size)
                }})</p>

                <div class="flex gap-2 justify-center">
                    <Button label="Cancel" icon="pi pi-times" text @click="cancelAvatarUpload" />
                    <Button label="Upload" icon="pi pi-upload" @click="uploadAvatar" :loading="isUploadingAvatar" />
                </div>
            </div>
        </Dialog>
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
const userMenu = ref()
const notificationsMenu = ref()
const showContactDialog = ref(false)
const showSettingsDialog = ref(false)
const showAvatarUploadDialog = ref(false)
const contactUsername = ref('')
const notificationCount = ref(0)
const isCheckingUser = ref(false)
const usernameError = ref('')
const isSaving = ref(false)
const isUploadingAvatar = ref(false)
const userData = ref({})
const originalUserData = ref({})
const notifications = ref([])
const selectedAvatarFile = ref(null)
const avatarPreviewUrl = ref('')
const saveError = ref('')

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
    const colors = ['bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-800']
    const index = (authStore.user?.username?.charCodeAt(0) || 0) % colors.length
    return `${colors[index]} text-white`
})

const isValidUsername = computed(() => {
    return contactUsername.value.trim().length >= 2
})

// Update hasChanges computed to ignore empty password
const hasChanges = computed(() => {
    if (!userData.value || !originalUserData.value) return false

    const currentData = { ...userData.value }
    const originalData = { ...originalUserData.value }

    // Remove password from comparison if it's empty
    if (!currentData.password || currentData.password.trim() === '') {
        delete currentData.password
    }
    delete originalData.password // Always remove from original for comparison

    return JSON.stringify(currentData) !== JSON.stringify(originalData)
})

const maxDate = computed(() => {
    const today = new Date()
    return new Date(today.getFullYear() - 15, today.getMonth(), today.getDate())
})

const minDate = computed(() => {
    const today = new Date()
    return new Date(today.getFullYear() - 100, today.getMonth(), today.getDate()) // 100 years max
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
            summary: 'Failed to clear notifications',
            detail: error.message,
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
 * Handle avatar file selection
 */
const onAvatarSelect = (event) => {
    const file = event.files[0]
    if (file) {
        selectedAvatarFile.value = file
        // Create preview URL
        const reader = new FileReader()
        reader.onload = (e) => {
            avatarPreviewUrl.value = e.target.result
        }
        reader.readAsDataURL(file)
        showAvatarUploadDialog.value = true
    }
}

/**
 * Cancel avatar upload
 */
const cancelAvatarUpload = () => {
    selectedAvatarFile.value = null
    avatarPreviewUrl.value = ''
    showAvatarUploadDialog.value = false
}

/**
 * Upload avatar to server
 */
const uploadAvatar = async () => {
    if (!selectedAvatarFile.value) return

    isUploadingAvatar.value = true

    try {
        const formData = new FormData()
        formData.append('avatar', selectedAvatarFile.value)

        const response = await fetch(`http://localhost:3000/api/users/${authStore.user.username}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        })

        if (response.ok) {
            const data = await response.json()
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Avatar updated successfully',
                life: 3000
            })

            // Update auth store and close dialogs
            await authStore.fetchCurrentUser()
            cancelAvatarUpload()

            // Reload user data for settings dialog
            if (showSettingsDialog.value) {
                await loadUserData()
            }
        } else {
            throw new Error('Failed to upload avatar')
        }
    } catch (error) {
        console.error('Failed to upload avatar:', error)
        toast.add({
            severity: 'error',
            summary: 'Failed to upload avatar',
            detail: error.message,
            life: 5000
        })
    } finally {
        isUploadingAvatar.value = false
    }
}

/**
 * Format file size for display
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format date for display
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

/**
 * Load user data for settings
 */
const loadUserData = async () => {
    try {
        const response = await fetch(`http://localhost:3000/api/users/${authStore.user.username}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })

        if (response.ok) {
            const data = await response.json()
            userData.value = {
                ...data.user,
                password: '' // Initialize password as empty
            }
            originalUserData.value = { ...userData.value }

            // Format date for input
            if (userData.value.birthDate) {
                userData.value.birthDate = userData.value.birthDate.split('T')[0]
            }
        } else {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to load user data')
        }
    } catch (error) {
        console.error('Failed to load user data:', error)
        throw error
    }
}

/**
 * Open settings dialog
 */
const openSettingsDialog = async () => {
    showSettingsDialog.value = true
    isSaving.value = false

    try {
        await loadUserData()
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Failed to load user data',
            detail: error.message,
            life: 5000
        })
        showSettingsDialog.value = false
    }
}

/**
 * Save user settings - simplified without age validation
 */
const saveSettings = async () => {
    if (!userData.value || !hasChanges.value) return

    isSaving.value = true
    saveError.value = ''

    try {
        // Prepare update data - only include fields that changed and password if provided
        const updateData = {}

        if (userData.value.fullName !== originalUserData.value.fullName) {
            updateData.full_name = userData.value.fullName
        }

        if (userData.value.emailAddress !== originalUserData.value.emailAddress) {
            updateData.email_address = userData.value.emailAddress
        }

        if (userData.value.birthDate !== originalUserData.value.birthDate) {
            updateData.birth_date = userData.value.birthDate
        }

        // Only include password if provided
        if (userData.value.password && userData.value.password.trim() !== '') {
            updateData.password = userData.value.password
        }

        // If no fields to update, return early
        if (Object.keys(updateData).length === 0) {
            toast.add({
                severity: 'warn',
                summary: 'No Changes',
                detail: 'No changes detected to save',
                life: 3000
            })
            return
        }

        const response = await fetch(`http://localhost:3000/api/users/${authStore.user.username}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        })

        const responseData = await response.json()

        if (response.ok) {
            toast.add({
                severity: 'success',
                summary: 'Profile updated successfully',
                detail: responseData.message,
                life: 3000
            })

            // Update auth store with new data
            await authStore.fetchCurrentUser()

            // Clear password field
            userData.value.password = ''

            // Reload original data to reset change detection
            originalUserData.value = { ...userData.value }

        } else {
            // Handle server validation errors
            throw new Error(responseData.error || `Failed to update profile: ${response.status}`)
        }
    } catch (error) {
        console.error('Failed to save settings:', error)
        saveError.value = error.message || 'Failed to update profile. Please try again.'

        toast.add({
            severity: 'error',
            summary: 'Failed to save changes.',
            detail: error.message,
            life: 5000
        })
    } finally {
        isSaving.value = false
    }
}


/**
 * Close settings dialog and reset state
 */
const closeSettingsDialog = () => {
    showSettingsDialog.value = false
    userData.value = {}
    originalUserData.value = {}
    saveError.value = null
}

/**
 * Close contact dialog and reset state
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

        isCheckingUser.value = false
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