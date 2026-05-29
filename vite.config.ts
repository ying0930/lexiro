import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const appVersion = Date.now().toString()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'generate-version',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist')
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true })
        }
        writeFileSync(resolve(distDir, 'version.json'), JSON.stringify({ version: appVersion }))
      },
    },
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
        navigateFallbackAllowlist: [/./],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => (
              sameOrigin && ['script', 'style'].includes(request.destination)
            ),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wordmem-scripts',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) => (
              sameOrigin && ['image', 'font'].includes(request.destination)
            ),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wordmem-assets',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
