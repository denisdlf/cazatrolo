import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/bungee/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/800.css'
import './index.css'
import App from './App.tsx'
import { Capacitor } from '@capacitor/core'

// Service worker (modo offline / instalable) solo en la versión web
if (!Capacitor.isNativePlatform()) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
