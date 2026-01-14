import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))
const appVersion = packageJson.version

// Get git hash at build time
function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

// Get build datetime at build time
const buildDateTime = new Date().toISOString()
const gitHash = getGitHash()

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
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_HASH__: JSON.stringify(gitHash),
    __BUILD_DATETIME__: JSON.stringify(buildDateTime),
  },
})
