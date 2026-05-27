import type { BackupPayload, VocabSet } from '@/types'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { APP_NAME, EXPORT_VERSION, ZIP_INTERNAL_FILENAME } from '@/constants'
import { normalizeExportPayload } from './validation'

export function buildExportPayload(selectedSets: VocabSet[]): BackupPayload {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appName: APP_NAME,
    sets: selectedSets,
  }
}

export function buildExportFileName(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  return `wordmem-backup-${datePart}-${timePart}.zip`
}

export function buildExportZipBlob(selectedSets: VocabSet[]): Blob {
  const payload = buildExportPayload(selectedSets)
  const jsonText = JSON.stringify(payload, null, 2)
  const zipped = zipSync({ [ZIP_INTERNAL_FILENAME]: strToU8(jsonText) }, { level: 0 })
  return new Blob([zipped as BlobPart], { type: 'application/zip' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export interface ParsedZip {
  payload: unknown
  sets: VocabSet[]
  exportedAt: string
}

export function parseBackupZipBuffer(buffer: ArrayBuffer): ParsedZip {
  const entries = unzipSync(new Uint8Array(buffer))
  const entryNames = Object.keys(entries)
  const jsonEntry
    = entryNames.find(name => name.toLowerCase().endsWith(ZIP_INTERNAL_FILENAME))
      || entryNames.find(name => name.toLowerCase().endsWith('.json'))
  if (!jsonEntry)
    throw new Error('找不到 JSON 檔案')

  let parsed: unknown
  try {
    parsed = JSON.parse(strFromU8(entries[jsonEntry]))
  }
  catch {
    throw new Error('JSON 格式錯誤')
  }

  return {
    payload: parsed,
    sets: normalizeExportPayload(parsed),
    exportedAt: (parsed as Record<string, unknown>)?.exportedAt as string ?? '',
  }
}

export function formatBackupPreview(targetSets: VocabSet[], exportedAt = ''): string {
  const wordCount = targetSets.reduce((sum, set) => sum + set.items.length, 0)
  return `備份時間：${exportedAt ? new Date(exportedAt).toLocaleString() : '未提供'}，單字集 ${targetSets.length} 個，單字 ${wordCount} 個`
}

export function countWords(targetSets: VocabSet[]): number {
  return targetSets.reduce((sum, set) => sum + set.items.length, 0)
}
