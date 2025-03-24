import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: '/index.html',
    },
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000
  }
});
