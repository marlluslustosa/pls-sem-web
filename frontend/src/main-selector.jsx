import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// import AppWebR from './AppWebR.jsx' // Descomente após instalar webr

function AppSelector() {
  const [mode, setMode] = useState('backend'); // 'backend' ou 'webr'

  return (
    <>
      {mode === 'backend' ? (
        <App />
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem',
          padding: '2rem'
        }}>
          <h2>🚧 WebR Mode</h2>
          <p>To enable WebR mode:</p>
          <ol style={{ textAlign: 'left', maxWidth: '600px' }}>
            <li>Install WebR: <code>npm install webr</code></li>
            <li>Uncomment the import in main.jsx</li>
            <li>Replace App with AppWebR in the ternary</li>
          </ol>
          <button 
            onClick={() => setMode('backend')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2c5aa0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            ← Back to Backend Mode
          </button>
        </div>
      )}
      
      {/* Floating mode switcher */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        gap: '0.5rem',
        background: 'white',
        padding: '0.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #dee2e6'
      }}>
        <button
          onClick={() => setMode('backend')}
          style={{
            padding: '0.5rem 1rem',
            background: mode === 'backend' ? '#2c5aa0' : 'white',
            color: mode === 'backend' ? 'white' : '#666',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: mode === 'backend' ? 600 : 400
          }}
        >
          🖥️ Backend (R API)
        </button>
        <button
          onClick={() => setMode('webr')}
          style={{
            padding: '0.5rem 1rem',
            background: mode === 'webr' ? '#28a745' : 'white',
            color: mode === 'webr' ? 'white' : '#666',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: mode === 'webr' ? 600 : 400
          }}
        >
          🌐 WebR (Browser)
        </button>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppSelector />
  </StrictMode>,
)
