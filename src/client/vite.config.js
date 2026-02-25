import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    minifier: 'terser',
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      },
      '/api': 'http://localhost:3001'
    }
  }
})