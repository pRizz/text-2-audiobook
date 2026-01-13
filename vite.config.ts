import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  // Change 'text-2-audiobook' to your repo name if different
  base: process.env.GITHUB_PAGES === 'true' ? '/text-2-audiobook/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  worker: {
    format: 'es',
  },
})
