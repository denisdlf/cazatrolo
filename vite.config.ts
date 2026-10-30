import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // se registra en main.tsx solo en la web (no dentro del APK)
      includeAssets: ['favicon.svg', 'icon-192.png'],
      manifest: {
        name: 'CAZATROLO',
        short_name: 'CAZATROLO',
        description: 'Ve a un amigo, sácale foto y suma puntos. Quien caza más en el mes, gana.',
        lang: 'es-CL',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#16051f',
        theme_color: '#16051f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Nunca cachear Supabase (datos y fotos siempre frescos)
        runtimeCaching: [],
      },
    }),
  ],
})
