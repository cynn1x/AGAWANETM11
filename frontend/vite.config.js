import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['prop-types'], // ensures Vite prebundles CJS properly
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true },
  },
})