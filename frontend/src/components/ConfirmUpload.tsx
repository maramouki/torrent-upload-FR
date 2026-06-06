import { useEffect, useState } from 'react'
import { startUpload, getPreviewResult } from '../api/client'
import { api } from '../api/client'
import { useUploadStore } from '../store/uploadStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { LogViewer } from './LogViewer'

const s: Record<string, React.CSSProperties> = {
  card: {
    background: '#1e293b',
    borderRadius: 8,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontSize: 14,
  },
  row: { display: 'flex', gap: 8 },
  label: { color: '#64748b', minWidth: 120 },
  value: { color: '#e2e8f0', wordBreak: 'break-all' },
  dupWarn: {
    background: '#7f1d1d',
    border: '1px solid #ef4444',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    color: '#fca5a5',
  },
  btn: {
    padding: '12px 24px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  success: { color: '#4ade80', fontWeight: 600, fontSize: 16 },
}

function Loader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0' }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '3px solid #334155',
        borderTopColor: '#3b82f6',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }} />
      <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function ConfirmUpload() {
  const {
    jobId, tag, selectedName, selectedPath, c411ProposedName, provenance, duplicateCheck,
    renamedPath, logs, setStep, clearLogs, setUploadDone,
  } = useUploadStore()

  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [uploadError, setUploadError] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    api.get<{ entries: { key: string; value: string }[] }>('/config').then((r) => {
      const entry = r.data.entries.find((e) => e.key === 'debug_upload')
      setDebugMode(entry?.value === 'true')
    }).catch(() => {})
  }, [])

  useWebSocket(uploading ? jobId : null, async () => {
    setUploading(false)
    try {
      if (jobId) {
        const res = await getPreviewResult(jobId)
        if (res.data.status === 'error') {
          setUploadError(true)
          return
        }
      }
    } catch {
      // If status check fails, still show success (logs confirmed completion)
    }
    setDone(true)
    setUploadDone(true)
  })

  async function handleUpload() {
    if (!jobId) return
    clearLogs()
    setUploading(true)
    await startUpload(jobId)
  }

  const displayName = renamedPath ? c411ProposedName ?? selectedName : selectedName
  const displayPath = renamedPath ?? selectedPath

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={s.card}>
        <div style={s.row}>
          <span style={s.label}>Nom final</span>
          <span style={s.value}>{displayName ?? '—'}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Tag</span>
          <span style={s.value}>{tag || '—'}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Provenance</span>
          <span style={s.value}>{provenance ?? 'Inconnue'}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Chemin</span>
          <span style={s.value}>{displayPath ?? '—'}</span>
        </div>
        {debugMode && (
          <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>
            ⚠ Mode debug activé — ne publiera pas sur C411
          </div>
        )}
      </div>

      {duplicateCheck?.duplicate && (
        <div style={s.dupWarn}>⚠ Doublon détecté — confirmer quand même ?</div>
      )}

      {!done && !uploadError && (
        <button
          style={{ ...s.btn, ...(uploading ? s.btnDisabled : {}) }}
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'Upload en cours…' : '🚀 Uploader maintenant'}
        </button>
      )}

      {uploading && !debugMode && <Loader label="Upload en cours…" />}
      {uploading && debugMode && logs.length > 0 && <LogViewer logs={logs} />}
      {uploading && debugMode && logs.length === 0 && <Loader label="Démarrage…" />}

      {!uploading && logs.length > 0 && debugMode && <LogViewer logs={logs} />}

      {done && (
        <button style={{ ...s.btn, background: '#16a34a' }} onClick={() => setStep('done')}>
          ✓ Upload terminé avec succès !
        </button>
      )}
      {uploadError && (
        <div style={{ color: '#f87171', fontWeight: 600, fontSize: 14 }}>
          ✗ Erreur lors de l'upload — consulte les logs ci-dessus pour le détail.
        </div>
      )}
    </div>
  )
}
