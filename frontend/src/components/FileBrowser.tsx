import { useEffect, useState } from 'react'
import { browseDir, detectTag, getProvenance, scanDir, type BrowseEntry } from '../api/client'
import { useUploadStore } from '../store/uploadStore'

const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 8 },
  breadcrumb: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  list: { display: 'flex', flexDirection: 'column', gap: 2 },
  entry: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    background: '#1e293b',
    border: '1px solid transparent',
  },
  entryHover: { border: '1px solid #3b82f6' },
  icon: { fontSize: 16 },
  name: { flex: 1, fontSize: 14 },
  selectBtn: {
    padding: '4px 10px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap' as const,
  },
  back: {
    padding: '6px 12px',
    background: '#334155',
    border: 'none',
    borderRadius: 4,
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
}

export function FileBrowser() {
  const { setSelectedPath, setTag, setProvenance, setStep } = useUploadStore()
  // Stack of paths: empty = root, last item = current path
  const [stack, setStack] = useState<string[]>([])
  const [entries, setEntries] = useState<BrowseEntry[]>([])
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const currentPath = stack.length > 0 ? stack[stack.length - 1] : undefined

  useEffect(() => {
    load(currentPath)
  }, [currentPath])

  async function load(path?: string) {
    setLoading(true)
    try {
      const res = await browseDir(path)
      setEntries(res.data.entries)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function navigateInto(path: string) {
    setStack((prev) => [...prev, path])
  }

  function navigateBack() {
    setStack((prev) => prev.slice(0, -1))
  }

  async function handleSelect(entry: BrowseEntry) {
    setSelectedPath(entry.path, entry.name)

    let tagPath = entry.path
    if (entry.is_dir) {
      try {
        const scan = await scanDir(entry.path)
        if (scan.data.video_path) tagPath = scan.data.video_path
      } catch { /* ignore */ }
    }

    const [tagRes, provRes] = await Promise.allSettled([
      detectTag(tagPath),
      getProvenance(entry.path),
    ])
    if (tagRes.status === 'fulfilled' && tagRes.value.data.tag) {
      setTag(tagRes.value.data.tag)
    }
    if (provRes.status === 'fulfilled') {
      setProvenance(provRes.value.data.tracker)
    }
    setStep('tag')
  }

  return (
    <div style={s.root}>
      {stack.length > 0 && (
        <button style={s.back} onClick={navigateBack}>
          ← Retour
        </button>
      )}
      <div style={s.breadcrumb}>
        {currentPath ? `📂 ${currentPath}` : 'Choisissez un dossier média'}
      </div>
      {loading && <div style={{ color: '#64748b', fontSize: 13 }}>Chargement…</div>}
      <div style={s.list}>
        {entries.map((e) => (
          <div
            key={e.path}
            style={{
              ...s.entry,
              ...(hoveredPath === e.path ? s.entryHover : {}),
            }}
            onMouseEnter={() => setHoveredPath(e.path)}
            onMouseLeave={() => setHoveredPath(null)}
            onClick={() => e.is_dir && navigateInto(e.path)}
          >
            <span style={s.icon}>{e.is_dir ? '📁' : '🎬'}</span>
            <span style={s.name}>{e.name}</span>
            {!e.is_dir && (
              <button style={s.selectBtn} onClick={(ev) => { ev.stopPropagation(); handleSelect(e) }}>
                Sélectionner
              </button>
            )}
            {e.is_dir && currentPath && (
              <button style={s.selectBtn} onClick={(ev) => { ev.stopPropagation(); handleSelect(e) }}>
                Sélectionner
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
