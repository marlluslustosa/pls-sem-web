import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AppWebR from './AppWebR.jsx'
import './App.css'

function AppSelector() {
  const [mode, setMode] = useState('backend') // 'backend' or 'webr'
  const [showInstructions, setShowInstructions] = useState(false)

  return (
    <>
      {mode === 'backend' ? <App /> : <AppWebR />}
      
      {/* Floating Mode Switcher */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-end'
      }}>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            background: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#666'
          }}
        >
          ℹ️ Info
        </button>
        
        <button
          onClick={() => setMode(mode === 'backend' ? 'webr' : 'backend')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: mode === 'backend' ? '#2563eb' : '#059669',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease'
          }}
        >
          {mode === 'backend' ? '🔄 Switch to WebR' : '🔄 Switch to Backend'}
        </button>
      </div>

      {/* Instructions Panel */}
      {showInstructions && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          maxWidth: '600px',
          zIndex: 10001
        }}>
          <h3 style={{ marginTop: 0 }}>🌐 Mode Selector</h3>
          <div style={{ marginBottom: '20px', lineHeight: '1.6' }}>
            <p><strong>Backend Mode:</strong></p>
            <ul>
              <li>Requires R API running on localhost:8000</li>
              <li>Fast performance</li>
              <li>Bootstrap up to 1000 iterations</li>
            </ul>
            
            <p><strong>WebR Mode:</strong></p>
            <ul>
              <li>No backend required</li>
              <li>Runs R in browser via WebAssembly</li>
              <li>First load: ~30-60 seconds</li>
              <li>Bootstrap limited to 100 iterations</li>
            </ul>
          </div>
          <button
            onClick={() => setShowInstructions(false)}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: '#2563eb',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Close
          </button>
        </div>
      )}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppSelector />
  </StrictMode>,
)
