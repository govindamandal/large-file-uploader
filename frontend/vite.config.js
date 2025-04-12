import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/upload-chunk': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/merge-chunks': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
