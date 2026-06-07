import type { BackupPayload, VocabSet } from '@/types'
import { APP_NAME, BACKUP_FILE_PREFIX, EXPORT_VERSION } from '@/constants'
import { buildExportZipBuffer, parseBackupZipBufferInWorker } from '@/lib/worker'
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
  return `${BACKUP_FILE_PREFIX}${datePart}-${timePart}.zip`
}

export async function buildExportZipBlob(selectedSets: VocabSet[]): Promise<Blob> {
  // Use JSON.parse + JSON.stringify to remove Vue reactive proxies which cannot be cloned to web workers
  const plainSets = JSON.parse(JSON.stringify(selectedSets))
  const payload = buildExportPayload(plainSets)
  const buffer = await buildExportZipBuffer(payload)
  return new Blob([buffer], { type: 'application/zip' })
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

export async function parseBackupZipBuffer(buffer: ArrayBuffer): Promise<ParsedZip> {
  const parsed = await parseBackupZipBufferInWorker(buffer)
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
