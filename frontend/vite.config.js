import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5001,
    proxy: {
      // API прокси с улучшенными заголовками
      '/api': {
        target: 'http://0.0.0.0:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          // Логирование проксируемых запросов для отладки
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxy request to:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy response from:', req.url, 'status:', proxyRes.statusCode);
          });
        }
      },
      // Медиа прокси для доступа к загруженным файлам
      '/media': {
        target: 'http://0.0.0.0:5000',
        changeOrigin: true,
        secure: false
      },
      // WebSocket прокси с улучшенными настройками
      '/ws': {
        target: 'ws://0.0.0.0:5000',
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          // WebSocket прокси логирование
          proxy.on('error', (err, req, res) => {
            console.log('WebSocket proxy error:', err);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('WebSocket connection:', req.url);
          });
          proxy.on('open', (proxySocket) => {
            console.log('WebSocket connection opened');
          });
          proxy.on('close', (proxyRes, proxySocket, proxyHead) => {
            console.log('WebSocket connection closed');
          });
        }
      }
    },
    watch: {
      usePolling: true
    },
    // Разрешаем CORS для всех источников
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      credentials: true
    },
    // Настройки HMR для работы в Replit
    hmr: {
      clientPort: 443,
      port: 5001,
      host: '0.0.0.0',
      protocol: 'wss'
    },
    // Разрешаем доступ с перечисленных доменов
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.replit.dev',
      '.replit.app',
      '.repl.co',
      'e1ea509e-b514-4939-b2c3-596440b7f110-00-1htv5oy57vx25.pike.replit.dev',
      'all'
    ]
  },
  preview: {
    port: 5001,
    host: '0.0.0.0'
  }
});