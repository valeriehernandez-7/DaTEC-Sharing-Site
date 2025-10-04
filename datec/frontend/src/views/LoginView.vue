<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <div class="w-full max-w-md">
      <Card>
        <template #title>
          <div class="text-center">
            <i class="pi pi-bullseye text-4xl text-sky-600 mb-2"></i>
            <p style="color: #0084d1; font-size: 25px; font-family:'Segoe UI';"><b>DaTEC</b></p>
            <h1 class="text-2xl font-bold text-gray-900">Welcome!</h1>
          </div>
        </template>

        <template #content>
          <form @submit.prevent="handleLoginSubmission" class="flex flex-col gap-4">
            <div class="w-full">
              <InputText v-model="loginForm.username" placeholder="Username" class="w-full" />
            </div>

            <div class="w-full">
              <InputText v-model="loginForm.password" type="password" placeholder="Password" class="w-full" />
            </div>

            <Button type="submit" label="Login" class="w-full" :loading="isLoading" />
          </form>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              Don't have an account?
              <router-link to="/register" class="text-blue-600 hover:underline font-medium">
                Register here
              </router-link>
            </p>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const isLoading = ref(false)

/**
 * Login form data structure
 * @type {import('vue').Reactive<{username: string, password: string}>}
 */
const loginForm = reactive({
  username: '',
  password: ''
})

/**
 * Handles user authentication form submission
 * Validates input and processes login request
 * @returns {Promise<void>}
 */
const handleLoginSubmission = async () => {
  if (!loginForm.username.trim() || !loginForm.password.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all fields',
      life: 5000
    })
    return
  }

  isLoading.value = true

  try {
    const response = await authStore.login({
      username: loginForm.username,
      password: loginForm.password
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: response.message,
      life: 3000
    })

    router.push('/')

  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Authentication failed'
    toast.add({
      severity: 'error',
      summary: 'Login Error',
      detail: errorMessage,
      life: 5000
    })

    loginForm.username = ''
    loginForm.password = ''

  } finally {
    isLoading.value = false
  }
}
</script>