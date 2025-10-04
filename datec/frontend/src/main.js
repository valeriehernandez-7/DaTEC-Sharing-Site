import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'

// Import PrimeVue Forms components
import Form from '@primevue/forms/form'
import FormField from '@primevue/forms/formfield'

import App from './App.vue'
import router from './router'

// Import PrimeVue components
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Card from 'primevue/card'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'
import Avatar from 'primevue/avatar'
import Message from 'primevue/message'
import Menubar from 'primevue/menubar'
import OverlayPanel from 'primevue/overlaypanel'
import MenuItem from 'primevue/menuitem'
import Badge from 'primevue/badge'

import './assets/main.css'

const app = createApp(App)

/**
 * PrimeVue configuration with Aura theme
 */
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
    ripple: true // Enable ripple effects if desired
})

/**
 * Global component registration
 */
app.component('Button', Button)
app.component('InputText', InputText)
app.component('Card', Card)
app.component('Toast', Toast)
app.component('ProgressSpinner', ProgressSpinner)
app.component('Avatar', Avatar)
app.component('Message', Message)
app.component('Form', Form)
app.component('FormField', FormField)
app.component('Menubar', Menubar)
app.component('OverlayPanel', OverlayPanel)
app.component('MenuItem', MenuItem)
app.component('Badge', Badge)

/**
 * Services and state management
 */
app.use(ToastService)

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')
