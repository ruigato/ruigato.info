import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Import em minúsculas alinha tipos (flip.d.ts) no TS; o ficheiro real é Flip.js (Linux).
      'gsap/flip.js': path.resolve(__dirname, 'node_modules/gsap/Flip.js'),
    },
  },
  server: {
    port: 7777,
    strictPort: true,
  },
})
