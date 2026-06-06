import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

export interface BrowseEntry {
  name: string
  path: string
  is_dir: boolean
  size?: number
  mtime?: number
}

export interface DuplicateCheckResult {
  duplicate: boolean
  existing?: Record<string, unknown> | null
}

export const browseDir = (path?: string) =>
  api.get<{ entries: BrowseEntry[] }>('/browse', { params: path ? { path } : {} })

export const detectTag = (path: string) =>
  api.get<{ tag: string | null }>('/tags/detect', { params: { path } })

export const suggestTags = (q: string) =>
  api.get<{ tags: string[] }>('/tags/suggest', { params: { q } })

export const startPreview = (path: string, tag: string, job_id: string) =>
  api.post<{ job_id: string }>('/upload/preview', { path, tag, job_id })

export const getPreviewResult = (job_id: string) =>
  api.get<{ job_id: string; c411_name: string | null; status: string }>(
    `/upload/preview-result/${job_id}`
  )

export const checkDuplicate = (path: string, tag: string) =>
  api.get<DuplicateCheckResult>('/duplicate-check', { params: { path, tag } })

export const getProvenance = (path: string) =>
  api.get<{ tracker: string | null }>('/provenance', { params: { path } })

export const renameFile = (job_id: string, new_name: string) =>
  api.post<{ new_path: string }>('/rename', { job_id, new_name })

export const startUpload = (job_id: string) =>
  api.post('/upload/start', { job_id, confirmed: true })

export const scanDir = (path: string) =>
  api.get<{ video_name: string | null; video_path: string | null }>('/browse/scan-dir', { params: { path } })
