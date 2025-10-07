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
                    <!-- Notifications Menu (only when logged in) -->
                    <Button
                        v-if="authStore.isLoggedIn"
                        icon="pi pi-bell"
                        text
                        rounded
                        severity="secondary"
                        @click="toggleNotifications"
                        :badge="notificationCount > 0 ? notificationCount.toString() : null"
                        badge-class="notification-badge"
                    />

                    <Button
                        v-if="authStore.isLoggedIn && authStore.user?.isAdmin"
                        icon="pi pi-shield"
                        text
                        rounded
                        aria-label="DaTEC Management"
                        severity="secondary"
                        @click="router.push(`/admin`)"
                    />

                    <Menu
                        v-if="authStore.isLoggedIn"
                        ref="notificationsMenu"
                        :model="notificationItems"
                        :popup="true"
                        class="notifications-overlay"
                    />

                    <!-- User Section (only when logged in) -->
                    <div v-if="authStore.isLoggedIn" class="flex items-center gap-2">
                        <Avatar
                            v-if="authStore.user?.avatarUrl"
                            :image="userAvatarUrl"
                            size="medium"
                            shape="circle"
                            class="cursor-pointer"
                            @click="goToProfile"
                        />
                        <Avatar
                            v-else
                            :label="userInitials"
                            size="medium"
                            shape="circle"
                            :class="avatarClasses"
                            class="cursor-pointer"
                            @click="goToProfile"
                        />

                        <Button
                            icon="pi pi-ellipsis-v"
                            text
                            rounded
                            severity="secondary"
                            @click="toggleUserMenu"
                        />

                        <Menu
                            ref="userMenu"
                            :model="userMenuItems"
                            :popup="true"
                            class="user-menu-overlay"
                        />
                    </div>

                    <!-- Login Button (when not authenticated) -->
                    <Button
                        v-else
                        label="Log In"
                        icon="pi pi-sign-in"
                        @click="goToLogin"
                        rounded
                        class="bg-sky-600"
                    />
                </div>
            </template>
        </Menubar>

        <!-- Contact Dialog -->
        <Dialog
            v-model:visible="showContactDialog"
            header="Contact User"
            :style="{ width: '450px' }"
            :modal="true"
        >
            <div class="p-fluid">
                <div class="field">
                    <label for="username">Username</label>
                    <InputText
                        id="username"
                        v-model="contactUsername"
                        placeholder="Enter username to contact..."
                        class="w-full mt-2"
                        @keyup.enter="findUser"
                        :class="{ 'p-invalid': usernameError }"
                    />
                    <small v-if="usernameError" class="p-error">{{ usernameError }}</small>
                </div>
                <small class="text-gray-500 block mt-2">
                    Enter a username to start a conversation
                </small>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="closeContactDialog" />
                <Button
                    label="Contact"
                    icon="pi pi-user"
                    @click="findUser"
                    :loading="isCheckingUser"
                    :disabled="!isValidUsername"
                />
            </template>
        </Dialog>

        <!-- Settings Dialog -->
        <Dialog
            v-model:visible="showSettingsDialog"
            modal
            header="Edit Profile"
            :style="{ width: '500px' }"
            :closable="false"
        >
            <template #header>
                <div class="inline-flex items-center justify-center gap-3">
                    <Avatar
                        v-if="authStore.user?.avatarUrl"
                        :image="userAvatarUrl"
                        size="xlarge"
                        shape="circle"
                    />
                    <Avatar
                        v-else
                        :label="userInitials"
                        size="xlarge"
                        shape="circle"
                        :class="avatarClasses"
                    />
                    <span class="font-bold text-lg">{{ userData?.fullName || 'User' }}</span>
                </div>
            </template>

            <div class="space-y-4">
                <!-- Avatar Upload Section -->
                <div class="text-center mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-3"
                        >Profile Picture</label
                    >
                    <FileUpload
                        mode="basic"
                        name="avatar"
                        accept="image/*"
                        :maxFileSize="5000000"
                        chooseLabel="Choose New Avatar"
                        :auto="true"
                        @select="onAvatarSelect"
                        class="w-full"
                    />
                    <small class="text-gray-500 block mt-2">
                        Max file size: 5MB. Supported formats: JPG, PNG, GIF
                    </small>
                </div>

                <!-- Form Fields -->
                <div class="flex items-center gap-4">
                    <label for="username" class="font-semibold w-32">Username</label>
                    <InputText
                        id="username"
                        v-model="userData.username"
                        class="flex-auto"
                        disabled
                        placeholder="Username"
                    />
                </div>

                <div class="flex items-center gap-4">
                    <label for="fullName" class="font-semibold w-32">Full Name</label>
                    <InputText
                        id="fullName"
                        v-model="userData.fullName"
                        class="flex-auto"
                        placeholder="Enter your full name"
                    />
                </div>

                <div class="flex items-center gap-4">
                    <label for="email" class="font-semibold w-32">Email</label>
                    <InputText
                        id="email"
                        v-model="userData.emailAddress"
                        type="email"
                        class="flex-auto"
                        placeholder="Enter your email address"
                    />
                </div>

                <div class="flex items-center gap-4">
                    <label for="birthDate" class="font-semibold w-32">Birth Date</label>
                    <DatePicker
                        id="birthDate"
                        v-model="userData.birthDate"
                        class="flex-auto"
                        dateFormat="yy-mm-dd"
                        :maxDate="maxDate"
                        :minDate="minDate"
                        showIcon
                        iconDisplay="input"
                        placeholder="Select your birth date"
                    />
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
                                <Tag
                                    :value="userData?.isAdmin ? 'Administrator' : 'User'"
                                    :severity="userData?.isAdmin ? 'danger' : 'info'"
                                />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button
                    label="Cancel"
                    icon="pi pi-times"
                    text
                    severity="secondary"
                    @click="closeSettingsDialog"
                    :disabled="isSaving"
                />
                <Button
                    label="Save Changes"
                    icon="pi pi-check"
                    @click="saveSettings"
                    :loading="isSaving"
                    :disabled="!hasChanges"
                />
            </template>
        </Dialog>

        <!-- Avatar Upload Dialog -->
        <Dialog
            v-model:visible="showAvatarUploadDialog"
            header="Upload Avatar"
            :style="{ width: '400px' }"
            :modal="true"
        >
            <div class="text-center" v-if="selectedAvatarFile">
                <img
                    :src="avatarPreviewUrl"
                    alt="Avatar Preview"
                    class="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-2 border-gray-300"
                />
                <p class="text-sm text-gray-600 mb-4">
                    {{ selectedAvatarFile.name }} ({{ formatFileSize(selectedAvatarFile.size) }})
                </p>

                <div class="flex gap-2 justify-center">
                    <Button label="Cancel" icon="pi pi-times" text @click="cancelAvatarUpload" />
                    <Button
                        label="Upload"
                        icon="pi pi-upload"
                        @click="uploadAvatar"
                        :loading="isUploadingAvatar"
                    />
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

/**
 * Computed property for user avatar URL with proper CouchDB file handling
 * @returns {string|null} Formatted avatar URL or null if not available
 */
const userAvatarUrl = computed(() => {
    if (!authStore.user?.avatarUrl) return null

    try {
        const url = new URL(authStore.user.avatarUrl)
        const pathParts = url.pathname.split('/').filter((part) => part)

        if (pathParts.length < 3) return null

        const documentId = pathParts[1]
        const filename = pathParts[2]

        return `http://localhost:3000/api/files/${documentId}/${filename}`
    } catch {
        return null
    }
})

/**
 * Computed property for user initials for avatar fallback
 * @returns {string} User initials or default 'U'
 */
const userInitials = computed(() => {
    if (!authStore.user?.fullName) return 'U'
    return authStore.user.fullName
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
})

/**
 * Computed property for avatar background color classes
 * @returns {string} CSS classes for avatar background
 */
const avatarClasses = computed(() => {
    const colors = [
        'bg-emerald-500',
        'bg-blue-500',
        'bg-purple-500',
        'bg-amber-500',
        'bg-rose-500',
        'bg-cyan-500',
    ]
    const index = (authStore.user?.username?.charCodeAt(0) || 0) % colors.length
    return `${colors[index]} text-white`
})

/**
 * Computed property to validate username input
 * @returns {boolean} True if username is valid
 */
const isValidUsername = computed(() => {
    return contactUsername.value.trim().length >= 2
})

/**
 * Computed property to detect changes in user data
 * @returns {boolean} True if user data has been modified
 */
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

/**
 * Computed property for maximum allowed birth date (15 years ago)
 * @returns {Date} Maximum allowed date
 */
const maxDate = computed(() => {
    const today = new Date()
    return new Date(today.getFullYear() - 15, today.getMonth(), today.getDate())
})

/**
 * Computed property for minimum allowed birth date (100 years ago)
 * @returns {Date} Minimum allowed date
 */
const minDate = computed(() => {
    const today = new Date()
    return new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
})

/**
 * Computed property for notification menu items
 * @returns {Array} Array of notification menu items
 */
const notificationItems = computed(() => {
    if (notifications.value.length === 0) {
        return [
            {
                label: 'No notifications',
                icon: 'pi pi-inbox',
                disabled: true,
            },
        ]
    }

    const items = notifications.value.map((notification) => ({
        label: formatNotification(notification),
        icon: getNotificationIcon(notification.type),
        command: () => handleNotificationClick(notification),
    }))

    items.push({ separator: true })
    items.push({
        label: 'Clear All',
        icon: 'pi pi-trash',
        command: clearAllNotifications,
    })

    return items
})

/**
 * Main menu items for Menubar - only show when logged in
 */
const menuItems = computed(() => {
    if (!authStore.isLoggedIn) {
        return [] // Hide menu items when not logged in
    }

    return [
        // Menu items would go here if needed for the main menubar
        // Currently using the user menu for all actions
    ]
})

/**
 * User menu items - only available when logged in
 */
const userMenuItems = computed(() => [
    {
        label: 'Search',
        icon: 'pi pi-search',
        command: () => {
            router.push('/')
        },
    },
    {
        label: 'New Dataset',
        icon: 'pi pi-folder-plus',
        command: () => {
            router.push('/datasets/create')
        },
    },
    {
        label: 'Contact User',
        icon: 'pi pi-envelope',
        command: () => {
            showContactDialog.value = true
        },
    },
    {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => {
            openSettingsDialog()
        },
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
                life: 3000,
            })
            router.push('/login')
        },
    },
])

// Lifecycle hooks
onMounted(() => {
    if (authStore.isLoggedIn) {
        loadNotificationCount()
        loadNotifications()
    }
})

/**
 * Toggles user menu visibility
 * @param {Event} event - Click event
 */
const toggleUserMenu = (event) => {
    userMenu.value.toggle(event)
}

/**
 * Toggles notifications menu visibility
 * @param {Event} event - Click event
 */
const toggleNotifications = (event) => {
    notificationsMenu.value.toggle(event)
}

/**
 * Navigates to login page
 */
const goToLogin = () => {
    router.push('/login')
}

/**
 * Navigates to user's profile page
 */
const goToProfile = () => {
    if (authStore.isLoggedIn) {
        router.push(`/profile/${authStore.user.username}`)
    }
}

/**
 * Loads notification count from API
 */
const loadNotificationCount = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/notifications/count', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
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
 * Loads notifications from API
 */
const loadNotifications = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/notifications', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
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
 * Clears all notifications
 */
const clearAllNotifications = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/notifications', {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        })

        if (response.ok) {
            notifications.value = []
            notificationCount.value = 0
            toast.add({
                severity: 'success',
                summary: 'Cleared',
                detail: 'All notifications cleared',
                life: 3000,
            })
        }
    } catch (error) {
        console.error('Failed to clear notifications:', error)
        toast.add({
            severity: 'error',
            summary: 'Failed to clear notifications',
            detail: error.message,
            life: 5000,
        })
    }
}

/**
 * Formats notification message based on type
 * @param {Object} notification - Notification object
 * @returns {string} Formatted notification message
 */
const formatNotification = (notification) => {
    const messages = {
        new_follower: `${notification.from_username} started following you`,
        new_dataset: `${notification.from_username} published a new dataset`,
        dataset_approved: `Your dataset "${notification.dataset_name}" was approved`,
        dataset_rejected: `Your dataset "${notification.dataset_name}" was rejected`,
    }

    return messages[notification.type] || notification.message || 'New notification'
}

/**
 * Gets appropriate icon for notification type
 * @param {string} type - Notification type
 * @returns {string} PrimeVue icon class
 */
const getNotificationIcon = (type) => {
    const icons = {
        new_follower: 'pi pi-user-plus',
        new_dataset: 'pi pi-database',
        dataset_approved: 'pi pi-check',
        dataset_rejected: 'pi pi-times',
    }

    return icons[type] || 'pi pi-bell'
}

/**
 * Handles notification click action
 * @param {Object} notification - Clicked notification
 */
const handleNotificationClick = (notification) => {
    if (notification.dataset_id) {
        router.push(`/datasets/${notification.dataset_id}`)
    } else if (notification.from_username) {
        router.push(`/profile/${notification.from_username}`)
    }
}

/**
 * Handles avatar file selection
 * @param {Object} event - File upload event
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
 * Cancels avatar upload and resets state
 */
const cancelAvatarUpload = () => {
    selectedAvatarFile.value = null
    avatarPreviewUrl.value = ''
    showAvatarUploadDialog.value = false
}

/**
 * Uploads avatar to server
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
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
        })

        if (response.ok) {
            const data = await response.json()
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Avatar updated successfully',
                life: 3000,
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
            life: 5000,
        })
    } finally {
        isUploadingAvatar.value = false
    }
}

/**
 * Formats file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Formats date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

/**
 * Loads user data for settings dialog
 */
const loadUserData = async () => {
    try {
        const response = await fetch(`http://localhost:3000/api/users/${authStore.user.username}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        })

        if (response.ok) {
            const data = await response.json()
            userData.value = {
                ...data.user,
                password: '', // Initialize password as empty
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
 * Opens settings dialog and loads user data
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
            life: 5000,
        })
        showSettingsDialog.value = false
    }
}

/**
 * Saves user settings to server
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
                life: 3000,
            })
            return
        }

        const response = await fetch(`http://localhost:3000/api/users/${authStore.user.username}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        })

        const responseData = await response.json()

        if (response.ok) {
            toast.add({
                severity: 'success',
                summary: 'Profile updated successfully',
                detail: responseData.message,
                life: 3000,
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
            life: 5000,
        })
    } finally {
        isSaving.value = false
        closeSettingsDialog()
    }
}

/**
 * Closes settings dialog and resets state
 */
const closeSettingsDialog = () => {
    showSettingsDialog.value = false
    userData.value = {}
    originalUserData.value = {}
    saveError.value = null
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
                    life: 3000,
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
