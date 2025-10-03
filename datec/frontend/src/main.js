import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

// Styles
import './assets/main.css'

const app = createApp(App)

// PrimeVue configuration
app.use(PrimeVue, {
    ripple: true,
    inputStyle: 'filled'
})

app.use(ToastService)
app.use(ConfirmationService)
app.use(router)

app.mount('#app')