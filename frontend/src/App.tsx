import { useState } from 'react'
import { UploadPage } from './pages/UploadPage'
import { SettingsPage } from './pages/SettingsPage'

type View = 'upload' | 'settings'

const s: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  borderBottom: '1px solid #1e293b',
  padding: '0 16px',
  background: '#0a1628',
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '14px 20px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: active ? 600 : 400,
  color: active ? '#60a5fa' : '#64748b',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
})

export default function App() {
  const [view, setView] = useState<View>('upload')

  return (
    <div>
      <nav style={s}>
        <button style={tabStyle(view === 'upload')} onClick={() => setView('upload')}>
          Upload
        </button>
        <button style={tabStyle(view === 'settings')} onClick={() => setView('settings')}>
          Paramètres
        </button>
      </nav>
      {view === 'upload' ? <UploadPage /> : <SettingsPage />}
    </div>
  )
}
