let nextId = 0
const pending = new Map<string, { resolve: (v: any) => void, reject: (e: Error) => void }>()
let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('@/workers/backup.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      const { id, error, ...rest } = e.data
      const p = pending.get(id)
      if (!p)
        return
      pending.delete(id)
      if (error)
        p.reject(new Error(error))
      else
        p.resolve(rest)
    }
    worker.onerror = (e) => {
      console.error('Backup Worker 錯誤:', e)
    }
  }
  return worker
}

function postAndWait(message: Record<string, unknown>, transfer?: Transferable[]): Promise<any> {
  const id = String(++nextId)
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const w = getWorker()
    if (transfer)
      w.postMessage({ id, ...message }, transfer)
    else
      w.postMessage({ id, ...message })
  })
}

export async function buildExportZipBuffer(payload: unknown): Promise<ArrayBuffer> {
  const { buffer } = await postAndWait({ type: 'export', payload })
  return buffer as ArrayBuffer
}

export async function parseBackupZipBufferInWorker(buffer: ArrayBuffer): Promise<unknown> {
  const { result, error } = await postAndWait({ type: 'import', payload: { buffer } }, [buffer])
  if (error)
    throw new Error(error)
  return result
}
