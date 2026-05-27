import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

const ZIP_INTERNAL_FILENAME = 'vocp-sets.json'

const ctx = globalThis as any
const pm = ctx.postMessage.bind(ctx)

ctx.onmessage = (e: MessageEvent) => {
  const { id, type, payload } = e.data

  if (type === 'export') {
    const jsonText = JSON.stringify(payload, null, 2)
    const zipped = zipSync({ [ZIP_INTERNAL_FILENAME]: strToU8(jsonText) }, { level: 5 })
    pm({ id, type: 'export', buffer: zipped.buffer }, [zipped.buffer])
    return
  }

  if (type === 'import') {
    try {
      const entries = unzipSync(new Uint8Array(payload.buffer))
      const entryNames = Object.keys(entries)
      const jsonEntry = entryNames.find(name => name.toLowerCase().endsWith(ZIP_INTERNAL_FILENAME))
        || entryNames.find(name => name.toLowerCase().endsWith('.json'))
      if (!jsonEntry) {
        pm({ id, type: 'import', error: '找不到 JSON 檔案' })
        return
      }

      const result = JSON.parse(strFromU8(entries[jsonEntry]))
      pm({ id, type: 'import', result })
    }
    catch (err) {
      pm({ id, type: 'import', error: (err as Error).message })
    }
    return
  }

  pm({ id, type, error: '未知的 Worker 請求類型' })
}
