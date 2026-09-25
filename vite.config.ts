import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { validateBasePath } from './base-path.ts'

const base = validateBasePath(process.env.VITE_BASE_PATH)
const updateTestRevision = process.env.PWA_UPDATE_TEST_REVISION
export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    manifest: {
      name: 'Kanji Dojo', short_name: 'Kanji Dojo', description: `Writing-only kanji practice${updateTestRevision ? ` · update test ${updateTestRevision}` : ''}`,
      start_url: base, scope: base, display: 'standalone', background_color: '#f5f1e8', theme_color: '#244739',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      cacheId: `kanji-dojo-${base.replaceAll('/', '-')}`,
      globPatterns: ['**/*.{js,css,html,json,svg,png,webmanifest}'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      navigateFallback: `${base}index.html`,
      skipWaiting: false,
      clientsClaim: false,
    },
  })],
})
