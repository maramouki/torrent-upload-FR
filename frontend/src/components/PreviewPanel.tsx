import { useState } from 'react'
import { startPreview, checkDuplicate, getPreviewResult, renameFile, skipRename } from '../api/client'
import { useUploadStore } from '../store/uploadStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { LogViewer } from './LogViewer'

const s: Record<string, React.CSSProperties> = {
  section: { display: 'flex', flexDirection: 'column', gap: 12 },
  btn: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  dupWarn: {
    background: '#7f1d1d',
    border: '1px solid #ef4444',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    color: '#fca5a5',
  },
  nameBox: {
    background: '#1e293b',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 13,
  },
  label: { color: '#64748b', fontSize: 11, marginBottom: 2 },
  old: { color: '#94a3b8', textDecoration: 'line-through' },
  proposed: { color: '#4ade80', fontWeight: 600 },
  applyBtn: {
    padding: '8px 16px',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    marginTop: 8,
  },
}

export function PreviewPanel() {
  const {
    selectedPath, selectedName, tag, jobId, c411ProposedName,
    logs, setJobId, setC411Name, setDuplicateCheck, duplicateCheck,
    setStep, setRenamedPath, clearLogs,
  } = useUploadStore()

  const [running, setRunning] = useState(false)
  const [previewDone, setPreviewDone] = useState(false)
  const [renamed, setRenamed] = useState(false)
  const [checking, setChecking] = useState(false)

  useWebSocket(jobId, async () => {
    setRunning(false)
    setPreviewDone(true)
    if (jobId) {
      const res = await getPreviewResult(jobId)
      if (res.data.c411_name) setC411Name(res.data.c411_name)
    }
  })

  async function handlePreview() {
    if (!selectedPath || !jobId) return
    clearLogs()
    setRunning(true)
    setPreviewDone(false)
    await Promise.allSettled([
      startPreview(selectedPath, tag, jobId),
      checkDuplicate(selectedPath, tag).then((r) => setDuplicateCheck(r.data)),
    ])
  }

  function makeUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  async function handleStart() {
    if (!jobId) setJobId(makeUUID())
    handlePreview()
  }

  async function handleRename() {
    if (!jobId || !c411ProposedName) return
    const res = await renameFile(jobId, c411ProposedName)
    setRenamedPath(res.data.new_path)
    setRenamed(true)
  }

  async function handleCheckResult() {
    if (!jobId) return
    setChecking(true)
    try {
      const res = await getPreviewResult(jobId)
      if (res.data.c411_name) setC411Name(res.data.c411_name)
      if (res.data.status === 'preview' || res.data.status === 'renamed') {
        setRunning(false)
        setPreviewDone(true)
      }
    } finally {
      setChecking(false)
    }
  }

  async function handleSkipRename() {
    if (!jobId) return
    await skipRename(jobId)
    setRenamed(true)
  }

  if (!jobId) {
    return (
      <div style={s.section}>
        <button style={s.btn} onClick={() => setJobId(makeUUID())}>
          Générer un job ID
        </button>
      </div>
    )
  }

  return (
    <div style={s.section}>
      {duplicateCheck?.duplicate && (
        <div style={s.dupWarn}>
          ⚠ Doublon détecté sur C411 dans le même slot de qualité
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <button
          style={{ ...s.btn, ...(running ? s.btnDisabled : {}) }}
          onClick={handleStart}
          disabled={running}
        >
          {running ? 'Prévisualisation en cours…' : 'Lancer la prévisualisation'}
        </button>
        {running && (
          <button
            style={{ ...s.btn, background: '#475569', ...(checking ? s.btnDisabled : {}) }}
            onClick={handleCheckResult}
            disabled={checking}
          >
            {checking ? 'Vérification…' : 'Vérifier le résultat'}
          </button>
        )}
      </div>

      {logs.length > 0 && <LogViewer logs={logs} />}

      {previewDone && c411ProposedName && (
        <div style={s.nameBox}>
          <div style={s.label}>Nom actuel</div>
          <div style={s.old}>{selectedName}</div>
          <div style={s.label}>Nom proposé par C411</div>
          <div style={s.proposed}>{c411ProposedName}</div>
          {!renamed && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' as const }}>
              <button style={s.applyBtn} onClick={handleRename}>
                Appliquer le renommage + vider le cache
              </button>
              <button
                style={{ ...s.applyBtn, background: '#475569' }}
                onClick={handleSkipRename}
              >
                Garder le nom actuel
              </button>
            </div>
          )}
          {renamed && (
            <div style={{ color: '#4ade80', marginTop: 8, fontSize: 13 }}>
              ✓ Prêt pour l'upload
            </div>
          )}
        </div>
      )}

      {previewDone && !c411ProposedName && !renamed && (
        <div style={s.nameBox}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
            Aucun renommage proposé par C411
          </div>
          <button style={{ ...s.applyBtn, background: '#475569' }} onClick={handleSkipRename}>
            Continuer sans renommer
          </button>
        </div>
      )}

      {renamed && (
        <button style={{ ...s.btn, background: '#16a34a' }} onClick={() => setStep('confirm')}>
          Continuer vers la confirmation →
        </button>
      )}
    </div>
  )
}
