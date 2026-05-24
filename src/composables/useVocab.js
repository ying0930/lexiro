import { ref, computed, watch, nextTick } from 'vue'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import prompts from '../../prompts.js'
import {
  downloadBackupFile,
  hasDriveToken,
  listBackupFiles,
  pruneOldBackupFiles,
  requestDriveAccess,
  revokeDriveAccess,
  uploadBackupZip,
} from '../lib/googleDrive.js'

// Singleton reactive state shared across all component imports
const sets = ref([])
const activeSetId = ref(null)
const currentView = ref('home')
const currentSession = ref(null)
const flashcardIndex = ref(0)
const importOpen = ref(false)
const importStep = ref(1)
const importWords = ref('')
const confirmOpen = ref(false)
const importJson = ref('')
const importError = ref('')
const importPreview = ref('')
const confirmTitle = ref('')
const confirmMessage = ref('')
const toastMessage = ref('')
const toastVisible = ref(false)
const pendingDeleteId = ref(null)
const transferOpen = ref(false)
const exportSelectedIds = ref([])
const exportError = ref('')
const zipImportError = ref('')
const zipImportPreview = ref('')
const zipImportSets = ref(null)
const zipImportName = ref('')
const zipImportInputKey = ref(0)
const importMode = ref('append')
const duplicateSummary = ref(null)
const importVersionDiffs = ref([])
const importVersionChoices = ref({})
const driveConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
const driveSignedIn = ref(false)
const driveAccountLabel = ref('')
const driveBackupLoading = ref(false)
const driveImportLoading = ref(false)
const driveListLoading = ref(false)
const driveError = ref('')
const driveBackups = ref([])
const driveSelectedFileId = ref('')
const driveSelectedFileName = ref('')
const driveImportPreview = ref('')
const driveImportSets = ref(null)
const driveImportExportedAt = ref('')
const setEditorOpen = ref(false)
const setEditorMode = ref('create')
const setEditorId = ref(null)
const setEditorName = ref('')
const setEditorError = ref('')
const setEditorDraftItems = ref([])
const pendingSetItems = ref([])
const practiceCounts = ref({})
const practiceDialogOpen = ref(false)
const practiceDialogMode = ref('quiz')
const practiceDialogSetId = ref(null)
const practiceDialogCount = ref(1)

const theme = ref('light')

let confirmResolver = null
let toastTimer = null

const STORAGE_KEY = 'vocab_study_data'

// Helper utilities
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeQuestion(question, itemIndex) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    throw new Error(`第 ${itemIndex + 1} 筆的 question 格式錯誤`)
  }
  if (!isNonEmptyString(question.prompt)) {
    throw new Error(`第 ${itemIndex + 1} 筆缺少 question.prompt`)
  }
  if (!Array.isArray(question.opts) || question.opts.length !== 4) {
    throw new Error(`第 ${itemIndex + 1} 筆的 question.opts 必須剛好有 4 個選項`)
  }
  if (question.opts.some((option) => !isNonEmptyString(option))) {
    throw new Error(`第 ${itemIndex + 1} 筆的 question.opts 需全部為非空字串`)
  }
  if (!Number.isInteger(question.ans) || question.ans < 0 || question.ans > 3) {
    throw new Error(`第 ${itemIndex + 1} 筆的 question.ans 需為 0 到 3`)
  }

  return {
    prompt: question.prompt.trim(),
    opts: question.opts.map((option) => option.trim()),
    ans: question.ans,
  }
}

function normalizeItem(item, itemIndex) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`第 ${itemIndex + 1} 筆資料格式錯誤`)
  }
  if (!isNonEmptyString(item.word)) {
    throw new Error(`第 ${itemIndex + 1} 筆缺少 word`)
  }
  if (!isNonEmptyString(item.meaning)) {
    throw new Error(`第 ${itemIndex + 1} 筆缺少 meaning`)
  }
  if (!isNonEmptyString(item.example)) {
    throw new Error(`第 ${itemIndex + 1} 筆缺少 example`)
  }
  if (!item.question) {
    throw new Error(`第 ${itemIndex + 1} 筆缺少 question`)
  }

  return {
    id: isNonEmptyString(item.id) ? item.id.trim() : `item-${itemIndex + 1}`,
    word: item.word.trim(),
    pos: isNonEmptyString(item.pos) ? item.pos.trim() : '',
    meaning: item.meaning.trim(),
    example: item.example.trim(),
    question: normalizeQuestion(item.question, itemIndex),
  }
}

function normalizeSet(data, fallbackId = `${Date.now()}`) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('最外層必須是單一 JSON object')
  }
  if (!Array.isArray(data.items)) {
    throw new Error('缺少 items 陣列')
  }
  if (!data.items.length) {
    throw new Error('items 不可為空')
  }

  const now = new Date()
  const fallbackName = `單字集 ${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return {
    id: isNonEmptyString(data.id) ? data.id.trim() : fallbackId,
    setName: isNonEmptyString(data.setName) ? data.setName.trim() : fallbackName,
    items: data.items.map((item, index) => normalizeItem(item, index)),
  }
}

function createEditorQuestion(question = null) {
  return {
    prompt: question?.prompt ?? '',
    opts: Array.isArray(question?.opts) && question.opts.length === 4 ? [...question.opts] : ['', '', '', ''],
    ans: Number.isInteger(question?.ans) ? question.ans : 0,
  }
}

function createEditorItem(item = null, index = 0) {
  return {
    id: isNonEmptyString(item?.id) ? item.id.trim() : `editor-${Date.now()}-${index}`,
    word: item?.word ?? '',
    pos: item?.pos ?? '',
    meaning: item?.meaning ?? '',
    example: item?.example ?? '',
    question: createEditorQuestion(item?.question),
  }
}

function createBlankEditorItem(index = 0) {
  return createEditorItem(null, index)
}

function createEditorItems(items = []) {
  return items.map((item, index) => createEditorItem(item, index))
}

function openSetEditor(mode, set = null) {
  setEditorMode.value = mode
  setEditorId.value = set?.id ?? null
  setEditorName.value = set?.setName ?? ''
  setEditorDraftItems.value = mode === 'edit' && set ? createEditorItems(set.items) : []
  pendingSetItems.value = mode === 'create' ? [...(pendingSetItems.value ?? [])] : []
  setEditorError.value = ''
  setEditorOpen.value = true
}

function closeSetEditor() {
  setEditorOpen.value = false
}

function saveSetEditor() {
  try {
    if (!isNonEmptyString(setEditorName.value)) {
      throw new Error('請輸入單字集名稱')
    }

    const sourceItems = setEditorMode.value === 'create' ? pendingSetItems.value : setEditorDraftItems.value
    const items = sourceItems.map((item, index) => normalizeItem(item, index))

    if (!Array.isArray(items) || !items.length) {
      throw new Error('items 不可為空')
    }

    if (setEditorMode.value === 'create') {
      const nextSet = {
        id: `${Date.now()}`,
        setName: setEditorName.value.trim(),
        items,
      }
      sets.value = [...sets.value, nextSet]
      activeSetId.value = nextSet.id
      showToast(`已新增「${nextSet.setName}」 (${nextSet.items.length} 個單字)`)
    } else {
      const targetIndex = sets.value.findIndex((set) => set.id === setEditorId.value)
      if (targetIndex === -1) throw new Error('找不到要編輯的單字集')

      const nextSet = {
        ...sets.value[targetIndex],
        setName: setEditorName.value.trim(),
        items,
      }
      sets.value = sets.value.map((set) => (set.id === setEditorId.value ? nextSet : set))
      if (currentSession.value?.sourceSetId === nextSet.id) {
        resetStudyView()
      }
      showToast(`已更新「${nextSet.setName}」 (${nextSet.items.length} 個單字)`)
    }

    saveState()
    setEditorOpen.value = false
    importOpen.value = false
  } catch (error) {
    setEditorError.value = error.message
  }
}

function addEditorItem() {
  setEditorDraftItems.value = [...setEditorDraftItems.value, createBlankEditorItem(setEditorDraftItems.value.length)]
}

function removeEditorItem(index) {
  setEditorDraftItems.value = setEditorDraftItems.value.filter((_, itemIndex) => itemIndex !== index)
}

function parseImportJson(text) {
  const json = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

  let data
  try {
    data = JSON.parse(json)
  } catch {
    return { valid: false, error: 'JSON 格式錯誤' }
  }

  try {
    return { valid: true, data: normalizeSet(data) }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

function toSessionEntries(items) {
  return items.map((item, index) => ({
    item,
    originalIndex: index,
  }))
}

function shuffleEntries(entries) {
  const cloned = [...entries]
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]]
  }
  return cloned
}

function getPracticeCount(setId, totalItems) {
  const storedCount = practiceCounts.value[setId]
  if (!Number.isInteger(storedCount)) return totalItems
  return Math.min(Math.max(storedCount, 1), totalItems)
}

function buildPracticeEntries(setId, items) {
  const shuffled = shuffleEntries(toSessionEntries(items))
  const count = getPracticeCount(setId, shuffled.length)
  return shuffled.slice(0, count)
}

function createSession(mode, entries, review = false, sourceSetId = null) {
  return {
    sourceSetId,
    mode,
    entries,
    index: 0,
    correctCount: 0,
    wrongEntries: [],
    answers: [],
    drafts: [],
    review,
    status: 'in-progress',
  }
}

function normalizeSession(session, validSetIds, view = 'home') {
  if (!session || typeof session !== 'object' || Array.isArray(session)) return null
  if (!isNonEmptyString(session.sourceSetId)) return null
  if (!validSetIds.has(session.sourceSetId)) return null
  if (!isNonEmptyString(session.mode)) return null
  if (!Array.isArray(session.entries) || !session.entries.length) return null

  return {
    sourceSetId: session.sourceSetId,
    mode: session.mode,
    entries: session.entries,
    index: Number.isInteger(session.index) && session.index >= 0 ? session.index : 0,
    correctCount: Number.isInteger(session.correctCount) && session.correctCount >= 0 ? session.correctCount : 0,
    wrongEntries: Array.isArray(session.wrongEntries) ? session.wrongEntries : [],
    answers: Array.isArray(session.answers) ? session.answers : [],
    drafts: Array.isArray(session.drafts) ? session.drafts : [],
    review: Boolean(session.review),
    status: session.status === 'completed' || view === 'result' ? 'completed' : 'in-progress',
  }
}

// Computeds
const hasSets = computed(() => sets.value.length > 0)
const activeSet = computed(() => sets.value.find((set) => set.id === activeSetId.value) ?? null)
const sessionEntries = computed(() => currentSession.value?.entries ?? [])
const totalItems = computed(() => sessionEntries.value.length)
const currentEntry = computed(() => sessionEntries.value[currentSession.value?.index ?? 0] ?? null)
const progressCount = computed(() => {
  if (!currentSession.value) return 0
  if (currentView.value === 'flashcard') return flashcardIndex.value + 1
  return currentSession.value.drafts.filter((draft) => {
    if (!draft) return false
    return (draft.selectedIndex !== null && draft.selectedIndex !== undefined) || isNonEmptyString(draft.answer)
  }).length
})
const progressPercent = computed(() => {
  if (!totalItems.value) return 0
  return Math.round((progressCount.value / totalItems.value) * 100)
})
const resultSummary = computed(() => {
  if (!currentSession.value) return null
  const total = currentSession.value.entries.length
  const correctCount = currentSession.value.correctCount
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0
  return {
    mode: currentSession.value.mode,
    review: currentSession.value.review,
    total,
    correctCount,
    wrongCount: currentSession.value.wrongEntries.length,
    score,
  }
})
const resultRows = computed(() => {
  if (!currentSession.value) return []
  return currentSession.value.entries.map((entry, index) => ({
    entry,
    record: currentSession.value.answers[index] ?? null,
    index,
  }))
})
const totalWordCount = computed(() => sets.value.reduce((sum, set) => sum + set.items.length, 0))
const exportSelectedSets = computed(() =>
  sets.value.filter((set) => exportSelectedIds.value.includes(set.id)),
)
const exportSelectedCount = computed(() => exportSelectedSets.value.length)
const exportSelectedWordCount = computed(() =>
  exportSelectedSets.value.reduce((sum, set) => sum + set.items.length, 0),
)
const exportAllSelected = computed(() =>
  sets.value.length > 0 && exportSelectedCount.value === sets.value.length,
)

function formatQuestionOptions(question) {
  return question.opts
    .map((option, index) => `- (${String.fromCharCode(65 + index)}) ${option}`)
    .join('\n')
}

function getQuizUserAnswerText(entry, selectedIndex) {
  if (selectedIndex === null || selectedIndex === undefined) return '未作答'
  return entry.item.question.opts[selectedIndex] ?? '未作答'
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  
  // Fast path: restore UI view first
  let parsed = {}
  try {
    parsed = JSON.parse(raw)
    const savedView = typeof parsed.currentView === 'string' ? parsed.currentView : 'home'
    currentView.value = savedView
  } catch (e) {
    return
  }

  // Defer heavy parsing
  setTimeout(() => {
    try {
      if (!Array.isArray(parsed.sets)) return

      const sanitizedSets = parsed.sets
        .map((set, index) => {
          try {
            return normalizeSet(set, set?.id ?? `saved-${index + 1}`)
          } catch {
            return null
          }
        })
        .filter(Boolean)

      sets.value = sanitizedSets
      const validSetIds = new Set(sanitizedSets.map((set) => set.id))
      const savedView = currentView.value
      const savedSession = normalizeSession(parsed.currentSession, validSetIds, savedView)
      practiceCounts.value = parsed.practiceCounts && typeof parsed.practiceCounts === 'object' && !Array.isArray(parsed.practiceCounts)
        ? parsed.practiceCounts
        : {}

      currentSession.value = savedSession
      flashcardIndex.value = Number.isInteger(parsed.flashcardIndex) && parsed.flashcardIndex >= 0 ? parsed.flashcardIndex : 0

      if (savedSession) {
        activeSetId.value = validSetIds.has(parsed.activeSetId) ? parsed.activeSetId : savedSession.sourceSetId
      } else {
        activeSetId.value = validSetIds.has(parsed.activeSetId) ? parsed.activeSetId : sanitizedSets[0]?.id ?? null
        currentView.value = 'home'
        flashcardIndex.value = 0
        practiceCounts.value = {}
      }
    } catch {
      // Ignored
    }
  }, 0)

  // Verify and restore Google Drive login status on page refresh/initialization
  if (hasDriveToken()) {
    driveSignedIn.value = true
    const expiresAt = Number(localStorage.getItem('wordmem_drive_token_expires_at') || '0')
    driveAccountLabel.value = expiresAt ? `Google Drive 已授權，約 ${new Date(expiresAt).toLocaleTimeString()} 前有效` : 'Google Drive 已授權'
  } else {
    driveSignedIn.value = false
    driveAccountLabel.value = ''
  }
}

let saveTimer = null
function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveState()
    saveTimer = null
  }, 500)
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      sets: sets.value,
      activeSetId: activeSetId.value,
      currentView: currentView.value,
      currentSession: currentSession.value,
      flashcardIndex: flashcardIndex.value,
      practiceCounts: practiceCounts.value,
    }),
  )
}

function clearStudyProgress() {
  currentSession.value = null
  flashcardIndex.value = 0
}

function resetStudyView() {
  currentView.value = 'home'
  clearStudyProgress()
}

function returnHome() {
  currentView.value = 'home'
}

function isResumableSession(setId, mode) {
  if (!currentSession.value) return false
  if (currentSession.value.sourceSetId !== setId) return false
  if (currentSession.value.mode !== mode) return false
  if (currentView.value === 'result') return false

  if (mode === 'flashcard') {
    return flashcardIndex.value < (currentSession.value.entries?.length ?? 0)
  }

  return currentSession.value.index < currentSession.value.entries.length
}

function showToast(message) {
  toastMessage.value = message
  toastVisible.value = true
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false
  }, 2200)
}

function openImport() {
  importStep.value = 1
  importWords.value = ''
  importJson.value = ''
  importError.value = ''
  importPreview.value = ''
  importOpen.value = true
}

function closeImport() {
  importOpen.value = false
}

function nextImportStep() {
  importStep.value = 2
}

async function copyImportPrompt() {
  try {
    const text = prompts.generateWordSet.replace('{{WORDS}}', importWords.value.trim() || '(未輸入單字)')
    await copyToClipboard(text)
    showToast('已複製 AI 指令，請貼至 AI 平台產生單字集')
  } catch {
    showToast('複製失敗')
  }
}

function openTransfer() {
  transferOpen.value = true
  exportSelectedIds.value = sets.value.map((set) => set.id)
  exportError.value = ''
  driveError.value = ''
  resetZipImportState()
  resetDriveImportState()
}

function closeTransfer() {
  transferOpen.value = false
}

function toggleExportAll() {
  exportSelectedIds.value = exportAllSelected.value ? [] : sets.value.map((set) => set.id)
}

function buildExportPayload(selectedSets) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'Wordmem',
    sets: selectedSets,
  }
}

function buildExportFileName() {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  return `wordmem-backup-${datePart}-${timePart}.zip`
}

function buildExportZipBlob(selectedSets) {
  const payload = buildExportPayload(selectedSets)
  const jsonText = JSON.stringify(payload, null, 2)
  const zipped = zipSync({ 'vocp-sets.json': strToU8(jsonText) }, { level: 0 })
  return new Blob([zipped], { type: 'application/zip' })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function exportSelectedSetsToZip() {
  exportError.value = ''
  if (!exportSelectedSets.value.length) {
    exportError.value = '請至少選擇一個單字集'
    return
  }

  downloadBlob(buildExportZipBlob(exportSelectedSets.value), buildExportFileName())
  showToast(`已匯出 ${exportSelectedSets.value.length} 個單字集`)
}

function resetZipImportState(resetInput = true) {
  zipImportError.value = ''
  zipImportPreview.value = ''
  zipImportSets.value = null
  zipImportName.value = ''
  duplicateSummary.value = null
  resetImportVersionDiffs()
  if (resetInput) {
    zipImportInputKey.value += 1
  }
}

function normalizeExportPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('匯入資料必須是 JSON object')
  }

  const timestamp = Date.now()
  if (Array.isArray(data.sets)) {
    if (!data.sets.length) throw new Error('sets 不可為空')
    return data.sets.map((set, index) => normalizeSet(set, `imported-${timestamp}-${index + 1}`))
  }

  if (Array.isArray(data.items)) {
    return [normalizeSet(data, `imported-${timestamp}-1`)]
  }

  throw new Error('找不到 sets 或 items')
}

function parseBackupZipBuffer(buffer) {
  const entries = unzipSync(new Uint8Array(buffer))
  const entryNames = Object.keys(entries)
  const jsonEntry =
    entryNames.find((name) => name.toLowerCase().endsWith('vocp-sets.json'))
    || entryNames.find((name) => name.toLowerCase().endsWith('.json'))
  if (!jsonEntry) throw new Error('找不到 JSON 檔案')

  let parsed
  try {
    parsed = JSON.parse(strFromU8(entries[jsonEntry]))
  } catch {
    throw new Error('JSON 格式錯誤')
  }

  return {
    payload: parsed,
    sets: normalizeExportPayload(parsed),
    exportedAt: parsed?.exportedAt ?? '',
  }
}

function countWords(targetSets) {
  return targetSets.reduce((sum, set) => sum + set.items.length, 0)
}

function formatBackupPreview(targetSets, exportedAt = '') {
  const summary = `備份時間：${exportedAt ? new Date(exportedAt).toLocaleString() : '未提供'}，單字集 ${targetSets.length} 個，單字 ${countWords(targetSets)} 個`
  return summary
}

function getSetContentSignature(set) {
  return JSON.stringify(
    set.items.map((item) => ({
      word: item.word,
      pos: item.pos,
      meaning: item.meaning,
      example: item.example,
      question: item.question,
    })),
  )
}

function getItemContentSignature(item) {
  return JSON.stringify({
    word: item.word,
    pos: item.pos,
    meaning: item.meaning,
    example: item.example,
    question: item.question,
  })
}

function getItemKey(item) {
  return item.word.trim().toLowerCase()
}

function createImportVersionDiff(localSet, importedSet) {
  const localItems = new Map(localSet.items.map((item) => [getItemKey(item), item]))
  const importedItems = new Map(importedSet.items.map((item) => [getItemKey(item), item]))
  const added = []
  const removed = []
  const changed = []

  importedItems.forEach((importedItem, key) => {
    const localItem = localItems.get(key)
    if (!localItem) {
      added.push(importedItem.word)
      return
    }
    if (getItemContentSignature(localItem) !== getItemContentSignature(importedItem)) {
      changed.push(importedItem.word)
    }
  })

  localItems.forEach((localItem, key) => {
    if (!importedItems.has(key)) {
      removed.push(localItem.word)
    }
  })

  return {
    setName: importedSet.setName,
    localSetId: localSet.id,
    localCount: localSet.items.length,
    importedCount: importedSet.items.length,
    added,
    removed,
    changed,
    identical: !added.length && !removed.length && !changed.length,
  }
}

function refreshImportVersionDiffs(targetSets = []) {
  const localByName = new Map(sets.value.map((set) => [set.setName.trim(), set]))
  const diffs = targetSets
    .map((set) => {
      const localSet = localByName.get(set.setName.trim())
      return localSet ? createImportVersionDiff(localSet, set) : null
    })
    .filter(Boolean)

  importVersionDiffs.value = diffs
  importVersionChoices.value = diffs.reduce((choices, diff) => {
    choices[diff.setName] = importVersionChoices.value[diff.setName] ?? 'local'
    return choices
  }, {})
}

function resetImportVersionDiffs() {
  importVersionDiffs.value = []
  importVersionChoices.value = {}
}

function setImportVersionChoice(setName, choice) {
  importVersionChoices.value = {
    ...importVersionChoices.value,
    [setName]: choice,
  }
}

function summarizeDuplicateResult(result) {
  const messages = []
  if (result.skippedByName.length) {
    messages.push(`保留本機版本 ${result.skippedByName.length} 個：${result.skippedByName.join('、')}`)
  }
  if (result.replacedVersions.length) {
    messages.push(`使用匯入版本更新 ${result.replacedVersions.length} 個：${result.replacedVersions.join('、')}`)
  }
  if (result.skippedByContent.length) {
    messages.push(`偵測到重複內容，略過 ${result.skippedByContent.length} 個：${result.skippedByContent.join('、')}`)
  }
  if (result.renamedIds.length) {
    messages.push(`因 id 衝突已改用新 id：${result.renamedIds.map((item) => item.setName).join('、')}`)
  }
  return messages.join('；')
}

function ensureUniqueSetId(baseId, existingIds) {
  let nextId = baseId
  let counter = 1
  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${counter}`
    counter += 1
  }
  return nextId
}

async function handleZipImportChange(event) {
  const file = event.target.files?.[0]
  resetZipImportState(false)
  if (!file) return

  zipImportName.value = file.name

  try {
    const buffer = await file.arrayBuffer()
    const { sets: normalizedSets, exportedAt } = parseBackupZipBuffer(buffer)
    zipImportSets.value = normalizedSets
    zipImportPreview.value = formatBackupPreview(normalizedSets, exportedAt)
    refreshImportVersionDiffs(normalizedSets)
  } catch (error) {
    zipImportError.value = error.message || '匯入失敗'
  }
}

async function applyImportedSets(targetSets, mode = 'append') {
  const existingIds = new Set(sets.value.map((set) => set.id))
  const result = {
    imported: [],
    skippedByName: [],
    skippedByContent: [],
    renamedIds: [],
    replacedVersions: [],
  }

  if (mode === 'overwrite') {
    const confirmed = await showConfirm(
      '覆蓋本機資料',
      `將以備份中的 ${targetSets.length} 個單字集取代目前本機資料，並清除目前練習進度。確定覆蓋？`,
    )
    if (!confirmed) return null

    const nextIds = new Set()
    const imported = targetSets.map((set, index) => {
      const baseId = isNonEmptyString(set.id) ? set.id : `imported-${Date.now()}-${index + 1}`
      const nextId = ensureUniqueSetId(baseId, nextIds)
      nextIds.add(nextId)
      return {
        ...set,
        id: nextId,
      }
    })

    sets.value = imported
    activeSetId.value = imported[0]?.id ?? null
    resetStudyView()
    saveState()
    result.imported = imported
    duplicateSummary.value = result
    showToast(`已覆蓋本機資料，匯入 ${imported.length} 個單字集`)
    return result
  }

  const nextSets = [...sets.value]
  const existingNames = new Set(nextSets.map((set) => set.setName.trim()))
  const existingContentSignatures = new Set(nextSets.map((set) => getSetContentSignature(set)))
  const importedContentSignatures = new Set()
  const replacedSetIds = new Set()

  targetSets.forEach((set, index) => {
    const existingIndex = nextSets.findIndex((localSet) => localSet.setName.trim() === set.setName.trim())
    if (existingIndex !== -1) {
      const localSet = nextSets[existingIndex]
      const choice = importVersionChoices.value[set.setName] ?? 'local'
      if (choice === 'imported') {
        existingContentSignatures.delete(getSetContentSignature(localSet))
        nextSets[existingIndex] = {
          ...set,
          id: localSet.id,
        }
        existingContentSignatures.add(getSetContentSignature(nextSets[existingIndex]))
        replacedSetIds.add(localSet.id)
        result.replacedVersions.push(set.setName)
        return
      }
      result.skippedByName.push(set.setName)
      return
    }

    const signature = getSetContentSignature(set)
    if (existingContentSignatures.has(signature) || importedContentSignatures.has(signature)) {
      result.skippedByContent.push(set.setName)
      return
    }

    const baseId = isNonEmptyString(set.id) ? set.id : `imported-${Date.now()}-${index + 1}`
    const nextId = ensureUniqueSetId(baseId, existingIds)
    existingIds.add(nextId)
    existingNames.add(set.setName.trim())
    existingContentSignatures.add(signature)
    importedContentSignatures.add(signature)
    if (nextId !== baseId) {
      result.renamedIds.push({ setName: set.setName, from: baseId, to: nextId })
    }
    result.imported.push({
      ...set,
      id: nextId,
    })
  })

  if (!result.imported.length) {
    if (result.replacedVersions.length) {
      sets.value = nextSets
      if (currentSession.value && replacedSetIds.has(currentSession.value.sourceSetId)) {
        resetStudyView()
      }
      saveState()
      duplicateSummary.value = result
      showToast(summarizeDuplicateResult(result))
      return result
    }
    duplicateSummary.value = result
    showToast(summarizeDuplicateResult(result) || '沒有可匯入的新單字集')
    return result
  }

  sets.value = [...nextSets, ...result.imported]
  if (!activeSetId.value) {
    activeSetId.value = result.imported[0].id
  }
  if (currentSession.value && replacedSetIds.has(currentSession.value.sourceSetId)) {
    resetStudyView()
  }

  saveState()
  duplicateSummary.value = result
  const duplicateText = summarizeDuplicateResult(result)
  showToast(`已匯入 ${result.imported.length} 個單字集${duplicateText ? `；${duplicateText}` : ''}`)
  return result
}

async function applyZipImport() {
  zipImportError.value = ''
  if (!zipImportSets.value || !zipImportSets.value.length) {
    zipImportError.value = '請先選擇匯入檔案'
    return
  }

  const result = await applyImportedSets(zipImportSets.value, importMode.value)
  if (!result) return
  resetZipImportState()
  transferOpen.value = false
}

function resetDriveImportState() {
  driveSelectedFileId.value = ''
  driveSelectedFileName.value = ''
  driveImportPreview.value = ''
  driveImportSets.value = null
  driveImportExportedAt.value = ''
  duplicateSummary.value = null
  resetImportVersionDiffs()
}

async function ensureDriveSignedIn(prompt = null) {
  driveError.value = ''
  if (!driveConfigured) {
    driveError.value = '尚未設定 VITE_GOOGLE_CLIENT_ID，無法使用 Google Drive 備份。'
    throw new Error(driveError.value)
  }

  const token = await requestDriveAccess(import.meta.env.VITE_GOOGLE_CLIENT_ID, prompt ?? (hasDriveToken() ? '' : 'consent'))
  driveSignedIn.value = hasDriveToken()
  driveAccountLabel.value = token.expiresAt ? `Google Drive 已授權，約 ${new Date(token.expiresAt).toLocaleTimeString()} 前有效` : 'Google Drive 已授權'
  return token
}

async function signInDrive() {
  try {
    await ensureDriveSignedIn('consent select_account')
    showToast('已登入 Google Drive')
  } catch (error) {
    driveSignedIn.value = false
    driveError.value = error.message || 'Google 登入失敗'
  }
}

function signOutDrive() {
  revokeDriveAccess()
  driveSignedIn.value = false
  driveAccountLabel.value = ''
  driveBackups.value = []
  resetDriveImportState()
  showToast('已登出 Google Drive')
}

async function backupSelectedSetsToDrive() {
  driveError.value = ''
  exportError.value = ''
  if (!exportSelectedSets.value.length) {
    exportError.value = '請至少選擇一個單字集'
    return
  }

  driveBackupLoading.value = true
  try {
    await ensureDriveSignedIn()
    const filename = buildExportFileName()
    await uploadBackupZip(buildExportZipBlob(exportSelectedSets.value), filename)
    const pruneResult = await pruneOldBackupFiles(10)
    driveBackups.value = pruneResult.kept
    const pruneText = pruneResult.deleted.length ? `，已刪除 ${pruneResult.deleted.length} 個舊備份` : ''
    showToast(`已備份到 Google Drive：${filename}${pruneText}`)
  } catch (error) {
    driveError.value = error.message || '備份到 Google Drive 失敗'
  } finally {
    driveBackupLoading.value = false
  }
}

async function refreshDriveBackups() {
  driveError.value = ''
  driveListLoading.value = true
  try {
    await ensureDriveSignedIn()
    driveBackups.value = await listBackupFiles()
    if (!driveBackups.value.length) {
      resetDriveImportState()
    }
  } catch (error) {
    driveError.value = error.message || '讀取 Google Drive 備份列表失敗'
  } finally {
    driveListLoading.value = false
  }
}

async function selectDriveBackup(fileId) {
  driveError.value = ''
  const file = driveBackups.value.find((item) => item.id === fileId)
  driveSelectedFileId.value = fileId
  driveSelectedFileName.value = file?.name ?? ''
  driveImportPreview.value = ''
  driveImportSets.value = null
  driveImportExportedAt.value = ''

  if (!fileId) return

  driveImportLoading.value = true
  try {
    await ensureDriveSignedIn()
    const buffer = await downloadBackupFile(fileId)
    const { sets: normalizedSets, exportedAt } = parseBackupZipBuffer(buffer)
    driveImportSets.value = normalizedSets
    driveImportExportedAt.value = exportedAt
    driveImportPreview.value = formatBackupPreview(normalizedSets, exportedAt)
    refreshImportVersionDiffs(normalizedSets)
  } catch (error) {
    driveError.value = error.message || '讀取 Google Drive 備份失敗'
    driveImportSets.value = null
  } finally {
    driveImportLoading.value = false
  }
}

async function applyDriveImport() {
  driveError.value = ''
  if (!driveImportSets.value || !driveImportSets.value.length) {
    driveError.value = '請先選擇 Google Drive 備份檔'
    return
  }

  driveImportLoading.value = true
  try {
    const result = await applyImportedSets(driveImportSets.value, importMode.value)
    if (!result) return
    resetDriveImportState()
    transferOpen.value = false
  } catch (error) {
    driveError.value = error.message || '從 Google Drive 導入失敗'
  } finally {
    driveImportLoading.value = false
  }
}

function ensureActiveSet(setId) {
  activeSetId.value = setId
  saveState()
}

function isSetInProgress(setId) {
  return currentSession.value?.status === 'in-progress' && currentSession.value.sourceSetId === setId
}

function startFlashcards(setId) {
  ensureActiveSet(setId)
  if (isResumableSession(setId, 'flashcard')) {
    currentView.value = 'flashcard'
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  flashcardIndex.value = 0
  currentSession.value = createSession('flashcard', toSessionEntries(activeSet.value?.items ?? []), false, setId)
  currentView.value = 'flashcard'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function startRound(mode, setId, reviewEntries = null) {
  ensureActiveSet(setId)
  if (isResumableSession(setId, mode) && !reviewEntries) {
    const confirmed = await showConfirm('接續上次進度', '這個單字集還有未完成的練習，要接著做嗎？')
    if (confirmed) {
      currentView.value = mode
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const entries = buildPracticeEntries(setId, activeSet.value?.items ?? [])
    currentSession.value = createSession(mode, entries, false, setId)
    currentView.value = mode
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  const entries = reviewEntries
    ? shuffleEntries(reviewEntries.map((entry) => ({ ...entry })))
    : buildPracticeEntries(setId, activeSet.value?.items ?? [])

  currentSession.value = createSession(mode, entries, Boolean(reviewEntries), setId)
  currentView.value = mode
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handlePracticeCountChange(setId, value, totalItems) {
  const parsedValue = Number.parseInt(value, 10)
  const nextValue = Number.isNaN(parsedValue) ? totalItems : Math.min(Math.max(parsedValue, 1), totalItems)
  practiceCounts.value = {
    ...practiceCounts.value,
    [setId]: nextValue,
  }
}

function openPracticeDialog(mode, setId) {
  const set = sets.value.find((item) => item.id === setId)
  if (!set) return
  practiceDialogMode.value = mode
  practiceDialogSetId.value = setId
  practiceDialogCount.value = getPracticeCount(setId, set.items.length)
  practiceDialogOpen.value = true
}

async function confirmPracticeDialog() {
  if (!practiceDialogSetId.value) return
  handlePracticeCountChange(practiceDialogSetId.value, practiceDialogCount.value, activeSet.value?.items.length ?? 1)
  practiceDialogOpen.value = false
  await startRound(practiceDialogMode.value, practiceDialogSetId.value)
}

function closePracticeDialog() {
  practiceDialogOpen.value = false
}

function buildQuizRecord(entry, draft) {
  const selectedIndex = draft?.selectedIndex ?? null
  const isCorrect = selectedIndex === entry.item.question.ans

  return {
    type: 'quiz',
    selectedIndex,
    userAnswer: getQuizUserAnswerText(entry, selectedIndex),
    correctAnswer: entry.item.question.opts[entry.item.question.ans],
    isCorrect,
    skipped: selectedIndex === null || selectedIndex === undefined,
  }
}

function buildSpellingRecord(entry, draft) {
  const userAnswer = draft?.answer?.trim() ?? ''
  const isCorrect = userAnswer.trim().toLowerCase() === entry.item.word.trim().toLowerCase()

  return {
    type: 'spelling',
    userAnswer: userAnswer || '未作答',
    correctAnswer: entry.item.word,
    isCorrect,
    skipped: !userAnswer,
  }
}

function submitCurrentRound() {
  if (!currentSession.value || currentView.value !== 'quiz' && currentView.value !== 'spelling') return

  const records = currentSession.value.entries.map((entry, index) => {
    const draft = currentSession.value.drafts[index] ?? null
    return currentView.value === 'quiz'
      ? buildQuizRecord(entry, draft)
      : buildSpellingRecord(entry, draft)
  })

  currentSession.value.answers = records
  currentSession.value.correctCount = records.filter((record) => record.isCorrect).length
  currentSession.value.wrongEntries = currentSession.value.entries.filter((entry, index) => !records[index]?.isCorrect)
  currentSession.value.status = 'completed'
  finishRound()
}

function finishRound() {
  if (currentSession.value) {
    currentSession.value.status = 'completed'
  }
  currentView.value = 'result'
}

function handleQuizDraftChange(entryIndex, payload) {
  if (!currentSession.value) return
  currentSession.value.drafts[entryIndex] = {
    selectedIndex: payload?.selectedIndex ?? null,
    answered: Boolean(payload?.answered),
  }
}

function handleSpellingDraftChange(entryIndex, payload) {
  if (!currentSession.value) return
  currentSession.value.drafts[entryIndex] = {
    answer: payload?.answer ?? '',
    submitted: Boolean(payload?.submitted),
  }
}

function restartCurrentMode() {
  if (!activeSet.value || !resultSummary.value) return
  startRound(resultSummary.value.mode, activeSet.value.id)
}

function switchModeAfterResult() {
  if (!activeSet.value || !resultSummary.value) return
  const nextMode = resultSummary.value.mode === 'quiz' ? 'spelling' : 'quiz'
  startRound(nextMode, activeSet.value.id)
}

function reviewWrongAnswers() {
  if (!activeSet.value || !currentSession.value?.wrongEntries.length) return
  startRound(currentSession.value.mode, activeSet.value.id, currentSession.value.wrongEntries)
}

function exitCurrentView() {
  returnHome()
}

function copyToClipboard(text) {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error('clipboard unavailable'))
  }
  return navigator.clipboard.writeText(text)
}

async function copyQuestionExplainPrompt(entry, record = null, mode = 'quiz') {
  let promptText = ''

  if (mode === 'quiz') {
    const question = entry.item.question
    promptText = prompts.explainQuestion
      .replace('{{QUESTION}}', question.prompt)
      .replace('{{OPTIONS}}', formatQuestionOptions(question))
      .replace('{{USER_ANSWER}}', record?.userAnswer ?? '未作答')
      .replace('{{CORRECT_ANSWER}}', question.opts[question.ans])
      .replace('{{MEANING}}', entry.item.meaning)
      .replace('{{EXAMPLE}}', entry.item.example)
  } else {
    promptText = prompts.explainSpellingQuestion
      .replace('{{MEANING}}', entry.item.meaning)
      .replace('{{EXAMPLE}}', entry.item.example)
      .replace('{{USER_ANSWER}}', record?.userAnswer ?? '未作答')
      .replace('{{CORRECT_ANSWER}}', entry.item.word)
  }

  try {
    await copyToClipboard(promptText)
    showToast(`已複製「${entry.item.word}」解析指令，請貼至 AI 平台獲得解析`)
  } catch {
    showToast('複製失敗')
  }
}

async function copyAllWrongQuestionsPrompt() {
  if (!resultSummary.value || resultSummary.value.wrongCount === 0) return

  const wrongRows = resultRows.value.filter(row => !row.record?.isCorrect)
  if (wrongRows.length === 0) return

  const wrongQuestionsText = wrongRows.map((row, idx) => {
    const mode = resultSummary.value.mode
    const entry = row.entry
    const record = row.record
    let text = `【第 ${idx + 1} 題】 單字：${entry.item.word}\n`
    
    if (mode === 'quiz') {
      const q = entry.item.question
      text += `題目：${q.prompt}\n`
      text += `選項：\n${formatQuestionOptions(q)}\n`
      text += `我的答案：${record?.userAnswer ?? '未作答'}\n`
      text += `正確答案：${q.opts[q.ans]}\n`
    } else {
      text += `單字字義：${entry.item.meaning}\n`
      text += `例句：${entry.item.example}\n`
      text += `我的答案：${record?.userAnswer ?? '未作答'}\n`
      text += `正確答案：${entry.item.word}\n`
    }
    return text
  }).join('\n-------------------\n\n')

  const promptText = prompts.explainAllWrongQuestions.replace('{{WRONG_QUESTIONS}}', wrongQuestionsText)

  try {
    await copyToClipboard(promptText)
    showToast('已複製所有錯題解析指令，請貼至 AI 平台獲得解析')
  } catch {
    showToast('複製失敗')
  }
}

function importSet() {
  const result = parseImportJson(importJson.value.trim())
  if (!result.valid) {
    importError.value = result.error
    return
  }

  setEditorMode.value = 'create'
  setEditorId.value = null
  setEditorName.value = ''
  pendingSetItems.value = result.data.items
  setEditorError.value = ''
  setEditorOpen.value = true
  importOpen.value = false
}

function showConfirm(title, message) {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmOpen.value = true
  return new Promise((resolve) => {
    confirmResolver = resolve
  })
}

function resolveConfirm(result) {
  confirmOpen.value = false
  if (confirmResolver) {
    confirmResolver(result)
    confirmResolver = null
  }
}

async function requestDelete(setId) {
  pendingDeleteId.value = setId
  const lastSet = sets.value.length <= 1
  const confirmed = await showConfirm(
    '刪除單字集',
    lastSet ? '這是最後一個單字集，刪除後本機資料會清空。確定刪除？' : '刪除這個單字集？無法復原。',
  )

  if (!confirmed) return

  if (lastSet) {
    sets.value = []
    activeSetId.value = null
    resetStudyView()
  } else {
    sets.value = sets.value.filter((set) => set.id !== pendingDeleteId.value)
    if (activeSetId.value === pendingDeleteId.value) {
      activeSetId.value = sets.value[0]?.id ?? null
      resetStudyView()
    }
  }

  saveState()
  pendingDeleteId.value = null
}

async function deleteActiveSet() {
  if (!activeSet.value) return
  await requestDelete(activeSet.value.id)
}

function editActiveSet() {
  if (!activeSet.value) return
  openSetEditor('edit', activeSet.value)
}

function toggleTheme() {
  if (theme.value === 'light') {
    theme.value = 'dark'
    document.documentElement.classList.add('dark')
    localStorage.setItem('vocp_theme', 'dark')
  } else {
    theme.value = 'light'
    document.documentElement.classList.remove('dark')
    localStorage.setItem('vocp_theme', 'light')
  }
}

function initTheme() {
  const saved = localStorage.getItem('vocp_theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    theme.value = 'dark'
    document.documentElement.classList.add('dark')
  } else {
    theme.value = 'light'
    document.documentElement.classList.remove('dark')
  }
}

// Watchers
watch(importJson, (value) => {
  const text = value.trim()
  if (!text) {
    importError.value = ''
    importPreview.value = ''
    return
  }

  const result = parseImportJson(text)
  if (result.valid) {
    importError.value = ''
    importPreview.value = `格式正常，偵測到 ${result.data.items.length} 個單字`
    return
  }

  importPreview.value = ''
  importError.value = result.error
})

watch([sets, activeSetId, currentView, currentSession, flashcardIndex], scheduleSave, { deep: true })

export function useVocab() {
  return {
    sets,
    activeSetId,
    currentView,
    currentSession,
    flashcardIndex,
    importOpen,
    importStep,
    importWords,
    confirmOpen,
    importJson,
    importError,
    importPreview,
    confirmTitle,
    confirmMessage,
    toastMessage,
    toastVisible,
    pendingDeleteId,
    transferOpen,
    exportSelectedIds,
    exportError,
    zipImportError,
    zipImportPreview,
    zipImportSets,
    zipImportName,
    zipImportInputKey,
    importMode,
    duplicateSummary,
    importVersionDiffs,
    importVersionChoices,
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
    setEditorOpen,
    setEditorMode,
    setEditorId,
    setEditorName,
    setEditorError,
    setEditorDraftItems,
    pendingSetItems,
    practiceCounts,
    practiceDialogOpen,
    practiceDialogMode,
    practiceDialogSetId,
    practiceDialogCount,
    theme,

    // Computeds
    hasSets,
    activeSet,
    sessionEntries,
    totalItems,
    currentEntry,
    progressCount,
    progressPercent,
    resultSummary,
    resultRows,
    totalWordCount,
    exportSelectedSets,
    exportSelectedCount,
    exportSelectedWordCount,
    exportAllSelected,

    // Methods
    isNonEmptyString,
    normalizeQuestion,
    normalizeItem,
    normalizeSet,
    createEditorQuestion,
    createEditorItem,
    createBlankEditorItem,
    createEditorItems,
    openSetEditor,
    closeSetEditor,
    saveSetEditor,
    addEditorItem,
    removeEditorItem,
    parseImportJson,
    toSessionEntries,
    shuffleEntries,
    getPracticeCount,
    buildPracticeEntries,
    createSession,
    normalizeSession,
    formatQuestionOptions,
    getQuizUserAnswerText,
    loadState,
    saveState,
    clearStudyProgress,
    resetStudyView,
    returnHome,
    isResumableSession,
    showToast,
    openImport,
    closeImport,
    nextImportStep,
    copyImportPrompt,
    openTransfer,
    closeTransfer,
    toggleExportAll,
    buildExportPayload,
    buildExportFileName,
    buildExportZipBlob,
    downloadBlob,
    exportSelectedSetsToZip,
    resetZipImportState,
    normalizeExportPayload,
    parseBackupZipBuffer,
    refreshImportVersionDiffs,
    resetImportVersionDiffs,
    setImportVersionChoice,
    ensureUniqueSetId,
    handleZipImportChange,
    applyImportedSets,
    applyZipImport,
    resetDriveImportState,
    ensureDriveSignedIn,
    signInDrive,
    signOutDrive,
    backupSelectedSetsToDrive,
    refreshDriveBackups,
    selectDriveBackup,
    applyDriveImport,
    ensureActiveSet,
    isSetInProgress,
    startFlashcards,
    startRound,
    handlePracticeCountChange,
    openPracticeDialog,
    confirmPracticeDialog,
    closePracticeDialog,
    buildQuizRecord,
    buildSpellingRecord,
    submitCurrentRound,
    finishRound,
    handleQuizDraftChange,
    handleSpellingDraftChange,
    restartCurrentMode,
    switchModeAfterResult,
    reviewWrongAnswers,
    exitCurrentView,
    copyToClipboard,
    copyQuestionExplainPrompt,
    copyAllWrongQuestionsPrompt,
    importSet,
    showConfirm,
    resolveConfirm,
    requestDelete,
    deleteActiveSet,
    editActiveSet,
    toggleTheme,
    initTheme,
  }
}
