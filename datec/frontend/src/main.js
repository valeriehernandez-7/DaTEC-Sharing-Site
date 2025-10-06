import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'

// Import PrimeVue Forms components
import Form from '@primevue/forms/form'
import FormField from '@primevue/forms/formfield'

// Import PrimeVue components
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Card from 'primevue/card'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'
import Avatar from 'primevue/avatar'
import Message from 'primevue/message'
import Menubar from 'primevue/menubar'
import Menu from 'primevue/menu'
import Dialog from 'primevue/dialog'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import FileUpload from 'primevue/fileupload'
import DatePicker from 'primevue/datepicker'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataView from 'primevue/dataview'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Drawer from 'primevue/drawer'
import Textarea from 'primevue/textarea'
import Tooltip from 'primevue/tooltip'
import Rating from 'primevue/rating'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Chart from 'primevue/chart'

import App from './App.vue'
import router from './router'
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
app.component('Menu', Menu)
app.component('Dialog', Dialog)
app.component('Badge', Badge)
app.component('Tag', Tag)
app.component('FileUpload', FileUpload)
app.component('DatePicker', DatePicker)
app.component('Tabs', Tabs)
app.component('TabList', TabList)
app.component('Tab', Tab)
app.component('TabPanels', TabPanels)
app.component('TabPanel', TabPanel)
app.component('DataView', DataView)
app.component('Drawer', Drawer)
app.component('Textarea', Textarea)
app.component('Tooltip', Tooltip)
app.component('Accordion', Accordion);
app.component('AccordionPanel', AccordionPanel);
app.component('AccordionHeader', AccordionHeader);
app.component('AccordionContent', AccordionContent);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('Rating', Rating);
app.component('Chart', Chart);

/**
 * Services and state management
 */
app.use(ToastService)

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')