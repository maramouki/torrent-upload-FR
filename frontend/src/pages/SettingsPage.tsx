import { useEffect, useState } from 'react'
import { api } from '../api/client'

interface ConfigEntry {
  key: string
  label: string
  value: string
  is_secret: boolean
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 700, margin: '0 auto', padding: '24px 16px' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#f1f5f9' },
  section: {
    background: '#1e293b',
    borderRadius: 10,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: '#94a3b8' },
  row: { display: 'flex', gap: 8 },
  input: {
    flex: 1,
    padding: '9px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
  },
  saveBtn: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  savedBadge: {
    fontSize: 11,
    color: '#4ade80',
    alignSelf: 'center',
    marginLeft: 4,
  },
}

export function SettingsPage() {
  const [entries, setEntries] = useState<ConfigEntry[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    api.get<{ entries: ConfigEntry[] }>('/config').then((r) => {
      setEntries(r.data.entries)
      const initial: Record<string, string> = {}
      r.data.entries.forEach((e) => { initial[e.key] = e.value })
      setValues(initial)
    })
  }, [])

  async function handleSave(key: string) {
    await api.put('/config', { key, value: values[key] ?? '' })
    setSaved((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000)
  }

  const BOOLEAN_KEYS = new Set(['debug_upload'])

  async function handleToggle(key: string) {
    const next = values[key] === 'true' ? 'false' : 'true'
    setValues((prev) => ({ ...prev, [key]: next }))
    await api.put('/config', { key, value: next })
    setSaved((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000)
  }

  return (
    <div style={s.page}>
      <div style={s.title}>Configuration</div>
      <div style={s.section}>
        {entries.map((e) => (
          <div key={e.key} style={s.field}>
            <div style={s.label}>{e.label}</div>
            {BOOLEAN_KEYS.has(e.key) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  onClick={() => handleToggle(e.key)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: values[e.key] === 'true' ? '#3b82f6' : '#334155',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, borderRadius: '50%',
                    width: 18, height: 18, background: '#fff',
                    left: values[e.key] === 'true' ? 23 : 3,
                    transition: 'left 0.2s',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: values[e.key] === 'true' ? '#60a5fa' : '#64748b' }}>
                  {values[e.key] === 'true' ? 'Activé (ne publie pas sur C411)' : 'Désactivé (upload réel)'}
                </span>
                {saved[e.key] && <span style={s.savedBadge}>✓ Sauvegardé</span>}
              </div>
            ) : (
              <div style={s.row}>
                <input
                  style={s.input}
                  type={e.is_secret ? 'password' : 'text'}
                  value={values[e.key] ?? ''}
                  placeholder={e.is_secret ? '••••••••' : ''}
                  onChange={(ev) => setValues((prev) => ({ ...prev, [e.key]: ev.target.value }))}
                  onKeyDown={(ev) => ev.key === 'Enter' && handleSave(e.key)}
                />
                <button style={s.saveBtn} onClick={() => handleSave(e.key)}>
                  Sauvegarder
                </button>
                {saved[e.key] && <span style={s.savedBadge}>✓ Sauvegardé</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
