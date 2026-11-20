import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Two pages on the website: the landing page at / and the game at /play/.
// The iOS/Android apps use the game only (see scripts/app-dist.mjs).
// Which build is running (shown small on the parents' page), so a report can be matched to code.
let build = 'dev'
try {
  build = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  /* not a git checkout */
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __BUILD__: JSON.stringify(build) },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        play: resolve(__dirname, 'play/index.html'),
      },
    },
  },
})
