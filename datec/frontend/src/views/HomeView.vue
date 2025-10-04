<template>
    <div class="min-h-screen bg-gray-50">
        <div class="container mx-auto px-4 py-8">
            <div class="text-center mb-12">
                <i class="pi pi-bullseye text-6xl text-sky-600 mb-4"></i>
                <h1 class="text-4xl font-bold text-gray-900 mb-4">Welcome to DaTEC</h1>
                <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                    <i>Data Sharing Platform for collaborative research and analysis.</i>
                </p>
            </div>

            <Card class="max-w-2xl mx-auto">
                <template #title>
                    <div class="text-center">
                        <h2 class="text-2xl font-semibold text-gray-800">Getting Started</h2>
                    </div>
                </template>

                <template #content>
                    <div class="space-y-4">
                        <div class="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                            <i class="pi pi-search text-blue-600"></i>
                            <div>
                                <h3 class="font-semibold text-blue-900">Explore Datasets</h3>
                                <p class="text-blue-700 text-sm">Browse and search through public datasets</p>
                            </div>
                        </div>

                        <div class="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                            <i class="pi pi-upload text-green-600"></i>
                            <div>
                                <h3 class="font-semibold text-green-900">Share Your Data</h3>
                                <p class="text-green-700 text-sm">Upload and share your datasets with the community</p>
                            </div>
                        </div>

                        <div class="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                            <i class="pi pi-users text-purple-600"></i>
                            <div>
                                <h3 class="font-semibold text-purple-900">Collaborate</h3>
                                <p class="text-purple-700 text-sm">Connect with researchers and data scientists</p>
                            </div>
                        </div>
                    </div>

                    <div class="mt-6 text-center">
                        <router-link v-if="!authStore.isLoggedIn" to="/login"
                            class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Get Started
                        </router-link>
                        <p v-else class="text-gray-600">
                            Start exploring datasets or create your own.
                        </p>
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>