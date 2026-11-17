// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { trackVisit } from './utils/track'

// Before the first render, so every event (even the landing search) carries the campaign.
trackVisit()

// Installed app: when a new version is deployed, switch to it right away
// (reloads once) instead of waiting for the next visit. Also check hourly
// and whenever the app comes back to the foreground.
// When a new version takes control of this open page, show it:
// right away if the page just loaded, otherwise the next time the app is
// reopened (so nobody loses what they were typing).
if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  const loadedAt = Date.now()
  let pendingReload = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return // first install, not an update
    if (Date.now() - loadedAt < 15000) window.location.reload()
    else pendingReload = true
  })
  document.addEventListener('visibilitychange', () => {
    if (pendingReload && document.visibilityState === 'visible') window.location.reload()
  })
}

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    setInterval(() => registration.update(), 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update()
    })
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
