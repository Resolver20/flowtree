import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PwaShell from './pwa/PwaShell.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PwaShell />
  </StrictMode>,
)
