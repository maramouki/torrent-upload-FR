import { useEffect, useRef, useState } from 'react'
import { suggestTags } from '../api/client'
import { useUploadStore } from '../store/uploadStore'

const s: Record<string, React.CSSProperties> = {
  root: { position: 'relative' },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 15,
    outline: 'none',
  },
  badge: {
    fontSize: 11,
    padding: '2px 6px',
    background: '#1d4ed8',
    borderRadius: 4,
    marginLeft: 8,
    color: '#bfdbfe',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    zIndex: 10,
    marginTop: 2,
  },
  option: {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13,
    color: '#cbd5e1',
  },
  warn: {
    marginTop: 6,
    color: '#fbbf24',
    fontSize: 12,
  },
}

const TAG_RE = /^[A-Z0-9]{3,10}$/

export function TagInput() {
  const { tag, setTag, selectedName } = useUploadStore()
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoDetected = useRef(tag !== '')

  useEffect(() => {
    if (!tag) { setSuggestions([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await suggestTags(tag)
      setSuggestions(res.data.tags)
      setOpen(res.data.tags.length > 0)
    }, 200)
  }, [tag])

  const valid = TAG_RE.test(tag)
  const showNoTagWarn = !tag || tag === 'NOTAG'

  return (
    <div style={s.root}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>Tag de groupe</span>
        {autoDetected.current && tag && (
          <span style={s.badge}>auto-détecté depuis "{selectedName}"</span>
        )}
      </div>
      <input
        style={{ ...s.input, borderColor: !valid && tag ? '#ef4444' : '#334155' }}
        value={tag}
        placeholder="ex. AZAZE, FLOP, NOTA…"
        onChange={(e) => { autoDetected.current = false; setTag(e.target.value.toUpperCase()) }}
        onFocus={() => setOpen(suggestions.length > 0)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div style={s.dropdown}>
          {suggestions.map((t) => (
            <div key={t} style={s.option} onMouseDown={() => { setTag(t); setOpen(false) }}>
              {t}
            </div>
          ))}
        </div>
      )}
      {showNoTagWarn && (
        <div style={s.warn}>
          ⚠ Aucun tag — l'upload peut être rejeté DETAG si une source taguée existe
        </div>
      )}
      {tag && !valid && (
        <div style={{ ...s.warn, color: '#f87171' }}>
          Format invalide (3-10 caractères alphanumériques)
        </div>
      )}
    </div>
  )
}
