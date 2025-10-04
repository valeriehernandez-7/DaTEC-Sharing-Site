import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

/**
 * Vite configuration for DaTEC frontend application
 * Defines build tools, development server, and project-specific settings
 */
export default defineConfig({
  /**
   * Plugin configuration for build tool extensions
   */
  plugins: [
    vue(),           // Vue 3 single-file component support
    vueDevTools(),   // Browser devtools integration for Vue debugging
    tailwindcss()    // Tailwind CSS utility framework integration
  ],

  /**
   * Module resolution configuration
   */
  resolve: {
    alias: {
      '@': '/src'    // Path alias for src directory (e.g., @/components)
    }
  },

  /**
   * CSS processing configuration
   */
  css: {
    preprocessorOptions: {
      css: {
        additionalData: '@import "@/assets/main.css";'
      }
    }
  },

  /**
   * Development server configuration
   */
  server: {
    port: 5173,     // Default development server port
    host: true,     // Enable network access (localhost + local IP)
    open: true      // Automatically open browser on server start
  }
})
