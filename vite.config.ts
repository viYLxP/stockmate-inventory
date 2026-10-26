/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `base: './'` produces relative asset paths, so the same build works on
// Netlify/Vercel/Cloudflare (served at /) and on GitHub Pages (served at /<repo>/).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
