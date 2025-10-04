<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <div class="w-full max-w-md">
      <Card>
        <template #title>
          <div class="text-center">
            <i class="pi pi-bullseye text-4xl font-bold text-sky-600 mb-2"></i>
            <p style="color: #0084d1; font-size: 25px; font-family:'Segoe UI';"><b>DaTEC</b></p>
            <h1 class="text-2xl font-bold text-gray-900">Join us!</h1>
          </div>
        </template>

        <template #content>
          <form @submit.prevent="handleRegistrationSubmission" class="flex flex-col gap-4">
            <div class="w-full">
              <InputText v-model="registrationForm.username" placeholder="Username" class="w-full" />
            </div>

            <div class="w-full">
              <InputText v-model="registrationForm.email" type="email" placeholder="Email Address" class="w-full" />
            </div>

            <div class="w-full">
              <InputText v-model="registrationForm.fullName" placeholder="Full Name" class="w-full" />
            </div>

            <div class="w-full">
              <InputText v-model="registrationForm.birthDate" type="date" class="w-full" />
            </div>

            <div class="w-full">
              <InputText v-model="registrationForm.password" type="password" placeholder="Password" class="w-full" />
            </div>

            <Button type="submit" label="Create Account" class="w-full" :loading="isLoading" />
          </form>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              Already have an account?
              <router-link to="/login" class="text-blue-600 hover:underline font-medium">
                Login here
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

// Usar reactive en lugar de Form de PrimeVue
const registrationForm = reactive({
  username: '',
  email: '',
  fullName: '',
  birthDate: '',
  password: ''
})

/**
 * Handle user registration form submission
 * @returns {Promise<void>}
 */
const handleRegistrationSubmission = async () => {
  if (!registrationForm.username.trim() ||
    !registrationForm.email.trim() ||
    !registrationForm.fullName.trim() ||
    !registrationForm.birthDate ||
    !registrationForm.password.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all fields',
      life: 5000
    })
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(registrationForm.email)) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please enter a valid email address',
      life: 5000
    })
    return
  }

  isLoading.value = true
  try {
    const userData = {
      username: registrationForm.username,
      email_address: registrationForm.email,
      full_name: registrationForm.fullName,
      birth_date: registrationForm.birthDate,
      password: registrationForm.password
    }

    const response = await authStore.register(userData)

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: response.message,
      life: 3000
    })

    router.push('/login')
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Registration failed'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000
    })
  } finally {
    isLoading.value = false
  }
}
</script>