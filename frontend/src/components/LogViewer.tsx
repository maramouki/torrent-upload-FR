import { useEffect, useRef } from 'react'

const s: Record<string, React.CSSProperties> = {
  container: {
    background: '#020617',
    borderRadius: 8,
    padding: '12px 16px',
    fontFamily: 'monospace',
    fontSize: 13,
    overflowY: 'auto',
    maxHeight: 320,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  empty: { color: '#475569', fontStyle: 'italic' },
}

function lineColor(text: string): string {
  const l = text.toLowerCase()
  if (l.includes('error') || l.includes('erreur') || l.includes('failed')) return '#f87171'
  if (l.includes('warn') || l.includes('attention')) return '#fbbf24'
  if (l.includes('success') || l.includes('done') || l.includes('upload')) return '#4ade80'
  return '#94a3b8'
}

interface Props {
  logs: string[]
}

export function LogViewer({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div style={s.container}>
      {logs.length === 0 ? (
        <span style={s.empty}>En attente des logs…</span>
      ) : (
        logs.map((line, i) => (
          <div key={i} style={{ color: lineColor(line) }}>
            {line}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
