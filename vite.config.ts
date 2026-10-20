import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import hosting from './vercel.json';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'IBAN Fresquinho',
        short_name: 'IBAN Fresquinho',
        lang: 'pt-PT',
        id: '.',
        scope: '.',
        description: 'Gerador local de IBANs e NIFs portugueses para testes de software',
        theme_color: '#f7f3ee',
        background_color: '#f7f3ee',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'icons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        sourcemap: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  preview: {
    headers: Object.fromEntries(hosting.headers[0]!.headers.map(({ key, value }) => [key, value])),
  },
  server: {
    port: 3000,
    open: true,
  },
});
