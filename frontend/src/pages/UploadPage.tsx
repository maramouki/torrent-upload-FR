import { useUploadStore } from '../store/uploadStore'
import { FileBrowser } from '../components/FileBrowser'
import { TagInput } from '../components/TagInput'
import { PreviewPanel } from '../components/PreviewPanel'
import { ConfirmUpload } from '../components/ConfirmUpload'

const STEPS = ['browse', 'preview', 'confirm', 'done'] as const

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860, margin: '0 auto', padding: '24px 16px' },
  header: { fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#f1f5f9' },
  stepper: { display: 'flex', gap: 8, marginBottom: 24 },
  stepDot: {
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 12,
    background: '#1e293b',
    color: '#64748b',
  },
  stepActive: { background: '#1d4ed8', color: '#fff' },
  stepDone: { background: '#15803d', color: '#fff' },
  section: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '20px',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' },
  meta: { fontSize: 12, color: '#475569', marginBottom: 16 },
  resetBtn: {
    padding: '8px 16px',
    background: '#334155',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  divider: { borderTop: '1px solid #1e293b', margin: '16px 0' },
}

const STEP_LABELS: Record<string, string> = {
  browse: '1. Sélection',
  preview: '2. Tag & Prévisualisation',
  confirm: '3. Confirmation',
  done: '4. Terminé',
}

function stepStatus(current: string, step: string) {
  const ci = STEPS.indexOf(current as typeof STEPS[number])
  const si = STEPS.indexOf(step as typeof STEPS[number])
  if (si < ci) return 'done'
  if (si === ci) return 'active'
  return 'idle'
}

export function UploadPage() {
  const { step, selectedPath, selectedName, provenance, setStep, reset } = useUploadStore()

  return (
    <div style={s.page}>
      <div style={s.header}>torrent-upload-FR</div>

      <div style={s.stepper}>
        {STEPS.map((st) => {
          const status = stepStatus(step === 'uploading' ? 'confirm' : step, st)
          return (
            <div
              key={st}
              style={{
                ...s.stepDot,
                ...(status === 'active' ? s.stepActive : {}),
                ...(status === 'done' ? s.stepDone : {}),
              }}
            >
              {STEP_LABELS[st]}
            </div>
          )
        })}
      </div>

      {step === 'browse' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Choisir un contenu à uploader</div>
          <FileBrowser />
        </div>
      )}

      {(step === 'preview' || step === 'tag') && (
        <div style={s.section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button style={s.resetBtn} onClick={() => setStep('browse')}>← Retour</button>
            <div style={s.sectionTitle}>Tag & Prévisualisation</div>
          </div>
          {selectedPath && (
            <div style={s.meta}>
              <span>📄 {selectedName}</span>
              {provenance && <span> &nbsp;·&nbsp; 🔗 {provenance}</span>}
            </div>
          )}
          <TagInput />
          <div style={s.divider} />
          <PreviewPanel />
        </div>
      )}

      {(step === 'confirm' || step === 'uploading') && (
        <div style={s.section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button style={s.resetBtn} onClick={() => setStep('preview')}>← Retour</button>
            <div style={s.sectionTitle}>Confirmation de l'upload</div>
          </div>
          <ConfirmUpload />
        </div>
      )}

      {step === 'done' && (
        <div style={s.section}>
          <div style={{ color: '#4ade80', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            ✓ Upload terminé avec succès !
          </div>
          <button style={s.resetBtn} onClick={reset}>
            Nouvel upload
          </button>
        </div>
      )}
    </div>
  )
}
