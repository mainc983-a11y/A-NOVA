import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
      proxy: {
        '/api': {
          target: 'https://ais-dev-cani2npmpszcm6egelanep-266602237293.asia-east1.run.app',
          changeOrigin: true,
        },
      },
    },
  };
});
