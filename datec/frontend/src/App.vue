<script setup>
import { RouterView } from 'vue-router'

import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Card from 'primevue/card'

const handlePrimaryAction = () => {
  console.log('Primary action triggered: Explore Data')
  useToast().add({
    severity: 'success',
    summary: 'Welcome!',
    detail: 'Starting your data journey now.',
    life: 3000,
  })
}

import { useToast } from 'primevue/usetoast'
</script>

<template>
  <!-- Global Toast Component -->
  <Toast position="top-right" />

  <!-- Header (Navbar) -->
  <header class="bg-celadon-blue shadow-lg">
    <nav class="p-4 flex items-center max-w-7xl mx-auto">
      <!-- Logo: DaTEC Brand -->
      <div class="flex items-center space-x-2">
        <i class="pi pi-database text-light text-2xl"></i>
        <span class="text-light text-xl font-bold">DaTEC</span>
      </div>

      <!-- Navigation/Login Placeholder -->
      <div class="ml-auto flex items-center space-x-4">
        <RouterLink to="/" class="text-light hover:text-accent font-medium transition duration-200 hidden sm:block">
          Home
        </RouterLink>
        <Button label="Sign In" icon="pi pi-user" severity="secondary" text
          class="text-light hover:bg-celadon-blue/50" />
      </div>
    </nav>
  </header>

  <!-- Main Content Wrapper -->
  <div class="min-h-screen">
    <section class="bg-light py-16 md:py-24 text-center border-b-4 border-accent">
      <div class="max-w-4xl mx-auto px-4">
        <h1 class="text-5xl md:text-6xl font-extrabold text-dark mb-4">
          Share and Explore Data Insights
        </h1>
        <p class="text-xl text-celadon-blue mb-8">
          The collaborative platform for data scientists and analysts.
        </p>
        <Button label="Explore Datasets Now" icon="pi pi-search" iconPos="right" @click="handlePrimaryAction"
          class="bg-primary hover:bg-red-700 text-light font-bold text-lg py-3 px-8 rounded-xl transition duration-300 shadow-lg hover:shadow-xl" />
      </div>
    </section>
  </div>
  <!-- End Main Content Wrapper -->

  <!-- Footer -->
  <footer class="bg-dark text-light p-6 text-center">
    <p class="text-sm">&copy; {{ new Date().getFullYear() }} DaTEC. All rights reserved.</p>
  </footer>
</template>
