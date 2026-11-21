import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vercelApiDev } from './dev/vite-api-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiDev()],
})
