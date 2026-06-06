import { useEffect } from 'react'
import { useUploadStore } from '../store/uploadStore'

export function useWebSocket(jobId: string | null, onDone?: () => void) {
  const appendLog = useUploadStore((s) => s.appendLog)

  useEffect(() => {
    if (!jobId) return
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/logs/${jobId}`)
    let done = false
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as { type: string; text?: string }
      if (msg.type === 'log' && msg.text !== undefined) {
        appendLog(msg.text)
      }
      if ((msg.type === 'done' || msg.type === 'timeout') && !done) {
        done = true
        onDone?.()
      }
    }
    ws.onerror = () => { ws.close() }
    return () => ws.close()
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps
}
