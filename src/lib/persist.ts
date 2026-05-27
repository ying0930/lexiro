import { get, set } from 'idb-keyval'
import { STORAGE_SAVE_DELAY_MS } from '@/constants'

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingData: Record<string, string> = {}

async function flush() {
  const data = { ...pendingData }
  pendingData = {}
  saveTimer = null

  for (const [key, value] of Object.entries(data)) {
    try {
      await set(key, value)
    }
    catch {
      // IndexedDB write failed
    }
  }
}

export function scheduleSave(key: string, data: unknown) {
  pendingData[key] = JSON.stringify(data)
  if (saveTimer)
    return
  saveTimer = setTimeout(flush, STORAGE_SAVE_DELAY_MS)
}

export async function loadFromStorage(key: string): Promise<string | null> {
  const local = localStorage.getItem(key)
  if (local)
    return local

  try {
    const idb = await get<string>(key)
    return idb ?? null
  }
  catch {
    return null
  }
}
