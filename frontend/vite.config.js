import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Para funcionar em qualquer caminho
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Otimizações para WebR
    chunkSizeWarningLimit: 3000, // WebR é grande
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'reactflow': ['reactflow'],
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['webr'] // WebR deve ser carregado dinamicamente
  },
  server: {
    headers: {
      // Headers necessários para SharedArrayBuffer (WebR)
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
})

