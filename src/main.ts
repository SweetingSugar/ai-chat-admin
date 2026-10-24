import 'element-plus/dist/index.css'
import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import App from './App.vue'
import { configureApiClient } from './api/client'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
const auth = useAuthStore(pinia)

configureApiClient({
  readToken: () => auth.token,
  onUnauthorized: () => auth.clear(),
})

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
