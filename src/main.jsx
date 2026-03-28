import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'

function applyStoredTheme() {
  const stored = localStorage.getItem('theme')
  const root = document.documentElement
  if (stored === 'dark') {
    root.classList.add('dark')
  } else if (stored === 'light') {
    root.classList.remove('dark')
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.classList.add('dark')
  }
}

applyStoredTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-center" richColors closeButton duration={2000} />
    </BrowserRouter>
  </StrictMode>,
)
