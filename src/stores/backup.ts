import type { ImportMode, VocabSet } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { buildExportFileName, buildExportZipBlob, formatBackupPreview, parseBackupZipBuffer } from '@/lib/file'
import {
  downloadBackupFile,
  hasDriveToken,
  listBackupFiles,
  pruneOldBackupFiles,
  requestDriveAccess,
  revokeDriveAccess,
  uploadBackupZip,
} from '@/lib/googleDrive'
import { i18n } from '@/lib/i18n'
import { useSetsStore } from './sets'
import { useUIStore } from './ui'

const t = i18n.global.t

export const useBackupStore = defineStore('backup', () => {
  const driveConfigured = ref(Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID))
  const driveSignedIn = ref(false)
  const driveAccountLabel = ref('')
  const driveBackupLoading = ref(false)
  const driveImportLoading = ref(false)
  const driveListLoading = ref(false)
  const driveError = ref('')
  const driveBackups = ref<{ id: string, name: string, size: string, createdTime: string, modifiedTime: string }[]>([])
  const driveSelectedFileId = ref('')
  const driveSelectedFileName = ref('')
  const driveImportPreview = ref('')
  const driveImportSets = ref<VocabSet[] | null>(null)
  const driveImportExportedAt = ref('')

  const zipImportError = ref('')
  const zipImportPreview = ref('')
  const zipImportSets = ref<VocabSet[] | null>(null)
  const zipImportName = ref('')
  const zipImportInputKey = ref(0)

  // Drive auth
  async function ensureDriveSignedIn(prompt?: string | null): Promise<{ accessToken: string, expiresAt: number }> {
    driveError.value = ''
    if (!driveConfigured.value) {
      driveError.value = t('backup.driveNotConfigured')
      throw new Error(driveError.value)
    }

    const token = await requestDriveAccess(
      import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
      prompt ?? (hasDriveToken() ? '' : 'consent'),
    ) as { accessToken: string, expiresAt: number }
    driveSignedIn.value = hasDriveToken()
    driveAccountLabel.value = token.expiresAt
      ? t('backup.driveAuthorized', { time: new Date(token.expiresAt).toLocaleTimeString() })
      : t('backup.signedIn')
    return token
  }

  async function signInDrive() {
    try {
      await ensureDriveSignedIn('consent select_account')
      const uiStore = useUIStore()
      uiStore.showToast(t('backup.signedIn'))
    }
    catch (error) {
      driveSignedIn.value = false
      driveError.value = (error as Error).message || 'Google 登入失敗'
    }
  }

  function signOutDrive() {
    revokeDriveAccess()
    driveSignedIn.value = false
    driveAccountLabel.value = ''
    driveBackups.value = []
    resetDriveImportState()
    const uiStore = useUIStore()
    uiStore.showToast(t('backup.signedOut'))
  }

  // Drive backup
  async function backupToDrive() {
    const uiStore = useUIStore()
    const setsStore = useSetsStore()
    driveError.value = ''

    if (!setsStore.sets.length) {
      driveError.value = '沒有可備份的單字集'
      return
    }

    driveBackupLoading.value = true
    try {
      await ensureDriveSignedIn()
      const filename = buildExportFileName()
      await uploadBackupZip(await buildExportZipBlob(setsStore.sets), filename)
      const pruneResult = await pruneOldBackupFiles(10)
      driveBackups.value = pruneResult.kept
      let toastMsg = t('backup.backupSuccess', { filename })
      if (pruneResult.deleted.length) {
        toastMsg += t('backup.backupDeleted', { count: pruneResult.deleted.length })
      }
      uiStore.showToast(toastMsg)
    }
    catch (error) {
      driveError.value = (error as Error).message || t('backup.backupFailed')
    }
    finally {
      driveBackupLoading.value = false
    }
  }

  // Drive restore
  async function refreshDriveBackups() {
    driveError.value = ''
    driveListLoading.value = true
    try {
      await ensureDriveSignedIn()
      driveBackups.value = await listBackupFiles()
      if (!driveBackups.value.length) {
        resetDriveImportState()
      }
    }
    catch (error) {
      driveError.value = (error as Error).message || '讀取 Google Drive 備份列表失敗'
    }
    finally {
      driveListLoading.value = false
    }
  }

  async function selectDriveBackup(fileId: string) {
    driveError.value = ''
    const file = driveBackups.value.find(item => item.id === fileId)
    driveSelectedFileId.value = fileId
    driveSelectedFileName.value = file?.name ?? ''
    driveImportPreview.value = ''
    driveImportSets.value = null
    driveImportExportedAt.value = ''

    if (!fileId)
      return

    driveImportLoading.value = true
    try {
      await ensureDriveSignedIn()
      const buffer = await downloadBackupFile(fileId)
      const parsed = await parseBackupZipBuffer(buffer)
      driveImportSets.value = parsed.sets
      driveImportExportedAt.value = parsed.exportedAt
      driveImportPreview.value = formatBackupPreview(parsed.sets, parsed.exportedAt)
      const setsStore = useSetsStore()
      setsStore.refreshDiffs(parsed.sets)
    }
    catch (error) {
      driveError.value = (error as Error).message || '讀取 Google Drive 備份失敗'
      driveImportSets.value = null
    }
    finally {
      driveImportLoading.value = false
    }
  }

  async function applyDriveImport() {
    const setsStore = useSetsStore()
    driveError.value = ''
    if (!driveImportSets.value || !driveImportSets.value.length) {
      driveError.value = '請先選擇 Google Drive 備份檔'
      return
    }

    driveImportLoading.value = true
    try {
      const result = setsStore.applyImported(driveImportSets.value, setsStore.importMode as ImportMode)
      if (!result)
        return
      resetDriveImportState()
      const uiStore = useUIStore()
      uiStore.closeTransfer()
    }
    catch (error) {
      driveError.value = (error as Error).message || '從 Google Drive 導入失敗'
    }
    finally {
      driveImportLoading.value = false
    }
  }

  // ZIP import
  function resetZipImportState(resetInput = true) {
    zipImportError.value = ''
    zipImportPreview.value = ''
    zipImportSets.value = null
    zipImportName.value = ''
    const setsStore = useSetsStore()
    setsStore.duplicateSummary = null as any
    setsStore.resetImportVersionDiffs()
    if (resetInput) {
      zipImportInputKey.value += 1
    }
  }

  async function handleZipImportChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    const setsStore = useSetsStore()
    resetZipImportState(false)
    if (!file)
      return

    zipImportName.value = file.name

    try {
      const buffer = await file.arrayBuffer()
      const parsed = await parseBackupZipBuffer(buffer)
      zipImportSets.value = parsed.sets
      zipImportPreview.value = formatBackupPreview(parsed.sets, parsed.exportedAt)
      setsStore.refreshDiffs(parsed.sets)
    }
    catch (error) {
      zipImportError.value = (error as Error).message || '匯入失敗'
    }
  }

  async function applyZipImport() {
    const setsStore = useSetsStore()
    const uiStore = useUIStore()
    zipImportError.value = ''
    if (!zipImportSets.value || !zipImportSets.value.length) {
      zipImportError.value = t('backup.zipImportError')
      return
    }

    const result = setsStore.applyImported(zipImportSets.value, setsStore.importMode as ImportMode)
    if (!result)
      return
    resetZipImportState()
    uiStore.closeTransfer()
  }

  function resetDriveImportState() {
    driveSelectedFileId.value = ''
    driveSelectedFileName.value = ''
    driveImportPreview.value = ''
    driveImportSets.value = null
    driveImportExportedAt.value = ''
    const setsStore = useSetsStore()
    setsStore.duplicateSummary = null as any
    setsStore.resetImportVersionDiffs()
  }

  return {
    driveConfigured,
    driveSignedIn,
    driveAccountLabel,
    driveBackupLoading,
    driveImportLoading,
    driveListLoading,
    driveError,
    driveBackups,
    driveSelectedFileId,
    driveSelectedFileName,
    driveImportPreview,
    driveImportSets,
    driveImportExportedAt,
    zipImportError,
    zipImportPreview,
    zipImportSets,
    zipImportName,
    zipImportInputKey,
    ensureDriveSignedIn,
    signInDrive,
    signOutDrive,
    backupToDrive,
    refreshDriveBackups,
    selectDriveBackup,
    applyDriveImport,
    resetZipImportState,
    handleZipImportChange,
    applyZipImport,
    resetDriveImportState,
  }
})
