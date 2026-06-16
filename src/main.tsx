import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ensureSeed } from './db/seed'

// Keep IndexedDB data from being evicted by the browser (important on iOS).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {})
}

ensureSeed().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
})
