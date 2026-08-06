import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sheet-csv': {
        target: 'https://docs.google.com',
        changeOrigin: true,
        rewrite: (path) => {
          const match = path.match(/gid=(\d+)/);
          const gid = match ? match[1] : '0';
          return `/spreadsheets/d/1D3-mLBlTAmJVOVgjspEY1w5kbVPrerSZALkyPY_C5UQ/export?format=csv&gid=${gid}`;
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Google Sheets requires a valid User-Agent
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          });
        },
      },
    },
  },
})
