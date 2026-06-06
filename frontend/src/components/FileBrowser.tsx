import { useEffect, useState } from 'react'
import { browseDir, detectTag, getProvenance, scanDir, getPoster, type BrowseEntry } from '../api/client'
import { useUploadStore } from '../store/uploadStore'

const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 8 },
  breadcrumb: { fontSize: 12, color: '#64748b', marginBottom: 4 },
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
  // List view (root level)
  list: { display: 'flex', flexDirection: 'column', gap: 2 },
  entry: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    background: '#1e293b',
    transition: 'box-shadow 0.15s',
  },
  // Grid view (content level)
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 16,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#1e293b',
    transition: 'box-shadow 0.15s',
  },
  cardHover: { boxShadow: '0 0 0 2px #3b82f6' },
  posterImg: {
    width: '100%',
    aspectRatio: '2/3',
    objectFit: 'cover',
  },
  posterPlaceholder: {
    width: '100%',
    aspectRatio: '2/3',
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
  },
  cardInfo: { padding: '8px 10px' },
  cardName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
}

function PosterCard({
  entry,
  onSelect,
}: {
  entry: BrowseEntry
  onSelect: (e: BrowseEntry) => void
}) {
  const [poster, setPoster] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPoster(entry.name).then((r) => {
      if (!cancelled) setPoster(r.data.poster_url)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [entry.name])

  return (
    <div
      style={{ ...s.card, ...(hovered ? s.cardHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(entry)}
    >
      {poster ? (
        <img src={poster} alt={entry.name} style={s.posterImg} loading="lazy" />
      ) : (
        <div style={s.posterPlaceholder}>{entry.is_dir ? '📁' : '🎬'}</div>
      )}
      <div style={s.cardInfo}>
        <div style={s.cardName} title={entry.name}>{entry.name}</div>
      </div>
    </div>
  )
}

export function FileBrowser() {
  const { setSelectedPath, setTag, setProvenance, setStep, setJobId } = useUploadStore()
  const [stack, setStack] = useState<string[]>([])
  const [entries, setEntries] = useState<BrowseEntry[]>([])
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const currentPath = stack.length > 0 ? stack[stack.length - 1] : undefined
  const isRoot = stack.length === 0
  // Show grid when we're 2 levels deep (inside a media root, listing content)
  const showGrid = stack.length >= 1

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

  function makeUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  async function handleSelect(entry: BrowseEntry) {
    let displayName = entry.name
    let tagPath = entry.path

    if (entry.is_dir) {
      try {
        const scan = await scanDir(entry.path)
        if (scan.data.video_path) {
          tagPath = scan.data.video_path
          displayName = scan.data.video_name ?? entry.name
        }
      } catch { /* ignore */ }
    }

    setSelectedPath(entry.path, displayName)
    setJobId(makeUUID())

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
    setStep('preview')
  }

  const dirs = entries.filter((e) => e.is_dir)
  const files = entries.filter((e) => !e.is_dir)

  return (
    <div style={s.root}>
      {!isRoot && (
        <button style={s.back} onClick={() => setStack((prev) => prev.slice(0, -1))}>
          ← Retour
        </button>
      )}
      <div style={s.breadcrumb}>
        {currentPath ? `📂 ${currentPath}` : 'Choisissez un dossier média'}
      </div>
      {loading && <div style={{ color: '#64748b', fontSize: 13 }}>Chargement…</div>}

      {/* Root level or non-grid: simple list for navigating into a media root */}
      {!showGrid && (
        <div style={s.list}>
          {entries.map((e) => (
            <div
              key={e.path}
              style={{ ...s.entry, ...(hoveredPath === e.path ? { boxShadow: '0 0 0 1px #3b82f6' } : {}) }}
              onMouseEnter={() => setHoveredPath(e.path)}
              onMouseLeave={() => setHoveredPath(null)}
              onClick={() => e.is_dir && setStack((prev) => [...prev, e.path])}
            >
              <span style={{ fontSize: 16 }}>{e.is_dir ? '📁' : '🎬'}</span>
              <span style={{ flex: 1, fontSize: 14 }}>{e.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content level: grid with covers for dirs, list for files */}
      {showGrid && (
        <>
          {dirs.length > 0 && (
            <div style={s.grid}>
              {dirs.map((e) => (
                <PosterCard
                  key={e.path}
                  entry={e}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div style={s.list}>
              {files.map((e) => (
                <div
                  key={e.path}
                  style={{ ...s.entry, ...(hoveredPath === e.path ? { boxShadow: '0 0 0 1px #3b82f6' } : {}) }}
                  onMouseEnter={() => setHoveredPath(e.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                  onClick={() => handleSelect(e)}
                >
                  <span style={{ fontSize: 16 }}>🎬</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{e.name}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
