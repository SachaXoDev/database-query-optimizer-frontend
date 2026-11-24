import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const backend = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3108';
const proxy = {
  '/api': { target: backend, changeOrigin: true },
  '^/assets/default_index\\.svg(?:\\?|$)': { target: backend, changeOrigin: true },
  '/media': { target: backend, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    proxy,
  },
  preview: { proxy },
});
