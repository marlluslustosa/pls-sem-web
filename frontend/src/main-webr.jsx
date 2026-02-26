import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppWebR from './AppWebR.jsx'
import './App.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppWebR />
  </StrictMode>,
)
