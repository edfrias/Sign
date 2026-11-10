import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Sign · Aprende lengua de signos',
        short_name: 'Sign',
        description: 'Aprende lenguas de signos con lecciones, repaso y práctica con cámara.',
        lang: 'es',
        theme_color: '#1f6feb',
        background_color: '#0d1117',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'],
        // El vocabulario (~10 MB, 539 fotos) no se descarga al instalar: cada foto se guarda
        // en caché la primera vez que se ve (regla /media/ de abajo). El alfabeto sí se precarga.
        globIgnores: ['**/media/lse/vocabulario/**'],
        runtimeCaching: [
          {
            // WASM de MediaPipe y modelo de manos: se guardan para uso offline
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net\/npm\/@mediapipe|storage\.googleapis\.com\/mediapipe-models)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sign-media',
              expiration: { maxEntries: 1000 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Ficheros separados: el contenido cambia más a menudo que el código, y MediaPipe es grande
        manualChunks(id) {
          if (id.includes('/content/') && id.endsWith('.json')) return 'content';
          if (id.includes('@mediapipe')) return 'mediapipe';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
