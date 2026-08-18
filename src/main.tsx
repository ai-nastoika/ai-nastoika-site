import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TRPCProvider } from '@/providers/trpc'
import './index.css'
import App from './App.tsx'

// Service worker нужен только для того, чтобы Chrome/Android предлагал
// установку на главный экран (см. public/sw.js). В dev-режиме не регистрируем,
// чтобы не мешать обычной разработке/HMR.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Не критично, если не удалось — сайт продолжит работать как обычно,
      // просто без автоматического предложения установки на Android.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </StrictMode>,
)
