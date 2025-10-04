<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <Navbar v-if="showNavbar" />
    <Toast />
    <RouterView />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Toast from 'primevue/toast'

const route = useRoute()

/**
 * Computed property to determine if navbar should be shown
 * Hide navbar on login/register pages for cleaner look
 */
const showNavbar = computed(() => {
  return !['login', 'register'].includes(route.name)
})
</script>