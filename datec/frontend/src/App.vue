<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <Toast />
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
</script>