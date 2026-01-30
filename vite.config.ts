import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Dynamic ports: allow running alongside production instance
const backendPort = process.env.CLAUDEDESK_PORT || '8787';
const vitePort = parseInt(process.env.VITE_DEV_PORT || '5173', 10);

export default defineConfig({
  plugins: [react()],
  root: 'src/ui/app',
  publicDir: 'public',
  build: {
    outDir: '../../../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: vitePort,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://localhost:${backendPort}`,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/ui/app'),
    },
  },
});
