import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/wordmem.svg'],
      manifest: {
        name: 'Wordmem',
        short_name: 'Wordmem',
        description: 'Wordmem vocabulary practice and backup app.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#111827',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icons/wordmem.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wordmem-pages',
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) => (
              sameOrigin && ['script', 'style', 'image', 'font'].includes(request.destination)
            ),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wordmem-assets',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
