import { Buffer } from 'buffer'
import process from 'process'
window.Buffer = Buffer
window.process = process

import { createApp } from 'vue'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'


// The vite-plugin-monaco-editor-esm will handle worker configuration
// We don't need to set MonacoEnvironment here

createApp(App).mount('#app')