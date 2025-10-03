import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import 'primeicons/primeicons.css'

const app = createApp(App)

// PrimeVue configuration
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            prefix: 'p',
            darkModeSelector: 'light', // system | light | dark
            cssLayer: {
                name: 'primevue',
                order: 'theme, base, primevue'
            }
        },
    },
})

// Register global services
app.use(ToastService)
app.use(ConfirmationService)
app.use(createPinia())
app.use(router)

app.mount('#app')
