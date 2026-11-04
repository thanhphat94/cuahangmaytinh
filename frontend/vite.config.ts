import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: {
    // Tách vendor bundle → cache lâu hơn, load nhanh hơn.
    // Vite 8 dùng Rolldown: manualChunks dạng object không còn được hỗ trợ,
    // phải khai báo qua output.codeSplitting.groups.
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[/\\](react|react-dom|scheduler|react-router|react-router-dom)[/\\]/,
            },
            {
              name: 'vendor-redux',
              test: /node_modules[/\\](@reduxjs[/\\]toolkit|react-redux|redux-thunk|immer)[/\\]/,
            },
            { name: 'vendor-ui', test: /node_modules[/\\](lucide-react)[/\\]/ },
            { name: 'vendor-http', test: /node_modules[/\\](axios)[/\\]/ },
          ],
        },
      },
    },
    // Cảnh báo nếu chunk > 500KB
    chunkSizeWarningLimit: 500,
  },
})
