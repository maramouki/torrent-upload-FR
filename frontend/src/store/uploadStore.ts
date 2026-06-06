import { create } from 'zustand'
import type { DuplicateCheckResult } from '../api/client'

export type Step = 'browse' | 'tag' | 'preview' | 'confirm' | 'uploading' | 'done'

interface UploadStore {
  step: Step
  selectedPath: string | null
  selectedName: string | null
  tag: string
  jobId: string | null
  c411ProposedName: string | null
  renamedPath: string | null
  duplicateCheck: DuplicateCheckResult | null
  provenance: string | null
  logs: string[]
  uploadDone: boolean

  setStep: (step: Step) => void
  setSelectedPath: (path: string, name: string) => void
  setTag: (tag: string) => void
  setJobId: (id: string) => void
  setC411Name: (name: string) => void
  setRenamedPath: (path: string) => void
  setDuplicateCheck: (r: DuplicateCheckResult) => void
  setProvenance: (tracker: string | null) => void
  appendLog: (line: string) => void
  clearLogs: () => void
  setUploadDone: (done: boolean) => void
  reset: () => void
}

const initial = {
  step: 'browse' as Step,
  selectedPath: null,
  selectedName: null,
  tag: '',
  jobId: null,
  c411ProposedName: null,
  renamedPath: null,
  duplicateCheck: null,
  provenance: null,
  logs: [],
  uploadDone: false,
}

export const useUploadStore = create<UploadStore>((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setSelectedPath: (path, name) => set({ selectedPath: path, selectedName: name }),
  setTag: (tag) => set({ tag }),
  setJobId: (id) => set({ jobId: id }),
  setC411Name: (name) => set({ c411ProposedName: name }),
  setRenamedPath: (path) => set({ renamedPath: path }),
  setDuplicateCheck: (r) => set({ duplicateCheck: r }),
  setProvenance: (tracker) => set({ provenance: tracker }),
  appendLog: (line) => set((s) => ({ logs: [...s.logs, line] })),
  clearLogs: () => set({ logs: [] }),
  setUploadDone: (done) => set({ uploadDone: done }),
  reset: () => set(initial),
}))
