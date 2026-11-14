import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  cacheDir: process.env.VITE_TEST_CACHE_DIR,
  plugins: [react(), tailwindcss()],
})
