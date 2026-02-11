import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initUTMTracking } from './lib/utmTracking.js'
import './index.css'

// Captura UTM + fbclid da URL (Facebook Ads → site)
initUTMTracking()

const container = document.getElementById('root')
if (!container) throw new Error('Elemento root não encontrado')

const root = ReactDOM.createRoot(container)

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
) 