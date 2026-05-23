<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  BookOpenText,
  ClipboardCopy,
  Download,
  FileQuestion,
  Plus,
  PencilLine,
  RotateCcw,
  SpellCheck2,
  Trash2,
  Upload,
  Sun,
  Moon,
} from 'lucide-vue-next'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import prompts from '../prompts.js'
import FlashcardView from './components/FlashcardView.vue'
import QuizCard from './components/QuizCard.vue'
import SetCard from './components/SetCard.vue'
import SpellingCard from './components/SpellingCard.vue'
import Badge from './components/ui/badge/Badge.vue'
import Button from './components/ui/button/Button.vue'
import Card from './components/ui/card/Card.vue'
import Dialog from './components/ui/dialog/Dialog.vue'
import Input from './components/ui/input/Input.vue'
import Progress from './components/ui/progress/Progress.vue'
import Textarea from './components/ui/textarea/Textarea.vue'
import Toast from './components/ui/toast/Toast.vue'

const STORAGE_KEY = 'vocab_study_data'

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
const importTextarea = ref(null)
const transferOpen = ref(false)
const exportSelectedIds = ref([])
const exportError = ref('')
const zipImportError = ref('')
const zipImportPreview = ref('')
const zipImportSets = ref(null)
const zipImportName = ref('')
const zipImportInputKey = ref(0)
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

function normalizeSession(session, validSetIds, currentView = 'home') {
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
    status: session.status === 'completed' || currentView === 'result' ? 'completed' : 'in-progress',
  }
}

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
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
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
    const savedView = typeof parsed.currentView === 'string' ? parsed.currentView : 'home'
    const savedSession = normalizeSession(parsed.currentSession, validSetIds, savedView)
    practiceCounts.value = parsed.practiceCounts && typeof parsed.practiceCounts === 'object' && !Array.isArray(parsed.practiceCounts)
      ? parsed.practiceCounts
      : {}

    currentSession.value = savedSession
    currentView.value = savedView
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
    sets.value = []
    activeSetId.value = null
    currentView.value = 'home'
    currentSession.value = null
    flashcardIndex.value = 0
    practiceCounts.value = {}
  }
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
  nextTick(() => importTextarea.value?.focus())
}

function closeImport() {
  importOpen.value = false
}

function nextImportStep() {
  importStep.value = 2
  nextTick(() => importTextarea.value?.focus())
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
  resetZipImportState()
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
    sets: selectedSets,
  }
}

function buildExportFileName() {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  return `vocp-sets-${datePart}-${timePart}.zip`
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

  const payload = buildExportPayload(exportSelectedSets.value)
  const jsonText = JSON.stringify(payload, null, 2)
  const zipped = zipSync({ 'vocp-sets.json': strToU8(jsonText) }, { level: 0 })
  const blob = new Blob([zipped], { type: 'application/zip' })
  downloadBlob(blob, buildExportFileName())
  showToast(`已匯出 ${exportSelectedSets.value.length} 個單字集`)
}

function resetZipImportState(resetInput = true) {
  zipImportError.value = ''
  zipImportPreview.value = ''
  zipImportSets.value = null
  zipImportName.value = ''
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

    const normalizedSets = normalizeExportPayload(parsed)
    zipImportSets.value = normalizedSets
    const totalWords = normalizedSets.reduce((sum, set) => sum + set.items.length, 0)
    zipImportPreview.value = `已讀取 ${normalizedSets.length} 個單字集，共 ${totalWords} 個單字`
  } catch (error) {
    zipImportError.value = error.message || '匯入失敗'
  }
}

function applyZipImport() {
  if (!zipImportSets.value || !zipImportSets.value.length) {
    zipImportError.value = '請先選擇匯入檔案'
    return
  }

  const existingIds = new Set(sets.value.map((set) => set.id))
  const imported = zipImportSets.value.map((set, index) => {
    const baseId = isNonEmptyString(set.id) ? set.id : `imported-${Date.now()}-${index + 1}`
    const nextId = ensureUniqueSetId(baseId, existingIds)
    existingIds.add(nextId)
    return {
      ...set,
      id: nextId,
    }
  })

  sets.value = [...sets.value, ...imported]
  if (!activeSetId.value && imported.length) {
    activeSetId.value = imported[0].id
  }

  showToast(`已匯入 ${imported.length} 個單字集`)
  resetZipImportState()
  transferOpen.value = false
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
  nextTick(() => {
    document.getElementById('completion-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
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

watch([sets, activeSetId, currentView, currentSession, flashcardIndex], saveState, { deep: true })

onMounted(() => {
  loadState()
  initTheme()
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && importOpen.value) closeImport()
    if (event.key === 'Escape' && transferOpen.value) closeTransfer()
    if (event.key === 'Escape' && confirmOpen.value) resolveConfirm(false)
  })
})
</script>

<template>
  <div class="min-h-screen bg-ink-50/50 dark:bg-ink-950 text-ink-950 dark:text-ink-50 transition-colors duration-300 pb-20 font-sans">
    
    <!-- Premium Header Shell -->
    <header class="sticky top-0 z-40 border-b border-ink-200/50 dark:border-ink-800/50 bg-white/80 dark:bg-ink-950/80 backdrop-blur-md transition-colors duration-300">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        
        <!-- Header Info -->
        <div class="flex items-center gap-3">
          <Button
            v-if="currentView !== 'home'"
            variant="ghost"
            size="icon"
            class="h-9 w-9 shrink-0 hover:bg-ink-100 dark:hover:bg-ink-800"
            @click="exitCurrentView"
          >
            <ArrowLeft class="h-4 w-4 text-ink-700 dark:text-ink-300" />
          </Button>
          <div class="text-left">
            <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">
              單字特訓
            </h1>
            <p v-if="currentView === 'home'" class="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
              <span v-if="hasSets" class="font-medium">
                {{ sets.length }} 個單字集，共 {{ totalWordCount }} 個單字
              </span>
              <span v-else class="font-medium">
                點擊新增按鈕以載入你的專屬單字集。
              </span>
            </p>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Active Set Quick Access -->
          <template v-if="currentView !== 'home' && activeSet">
            <Badge variant="secondary" class="hidden sm:inline-flex rounded-xl px-3 py-1.5 text-xs font-semibold bg-ink-100 dark:bg-ink-800 border-none">
              {{ activeSet.setName }}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              class="h-9 w-9 text-ink-500 hover:text-ink-950 dark:hover:text-ink-50 border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-800"
              aria-label="編輯單字集"
              @click="editActiveSet"
            >
              <PencilLine class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-9 w-9 text-red-500 hover:text-red-600 border-ink-200 dark:border-ink-800 hover:bg-red-50 dark:hover:bg-red-950/20"
              aria-label="刪除單字集"
              @click="deleteActiveSet"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </template>

          <span class="w-px h-5 bg-ink-200 dark:bg-ink-800 mx-1 hidden sm:inline-block"></span>

          <!-- Dynamic Theme Switcher -->
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800"
            title="切換主題"
            @click="toggleTheme"
          >
            <Sun v-if="theme === 'dark'" class="h-4 w-4 text-emerald-400 animate-pulse" />
            <Moon v-else class="h-4 w-4 text-indigo-600" />
          </Button>
        </div>

      </div>
    </header>

    <main class="mx-auto mt-8 max-w-5xl px-6">
      
      <!-- Home View -->
      <section v-if="currentView === 'home'" class="space-y-6">
        <!-- Top Toolbar -->
        <div v-if="hasSets" class="flex flex-wrap items-center justify-end gap-3 mb-2">
          <Button variant="outline" @click="openTransfer" class="gap-2 px-5 py-2.5">
            <Upload class="h-4 w-4" />
            <span>備份與匯入</span>
          </Button>
          <Button variant="default" @click="openImport" class="gap-2 px-6 py-2.5">
            <Plus class="h-4 w-4" />
            <span>新增單字集</span>
          </Button>
        </div>

        <!-- Empty State Canonical Panel -->
        <div v-if="!hasSets" class="py-16">
          <Card class="max-w-2xl mx-auto my-8 p-12 text-center flex flex-col items-center justify-center space-y-6" :glow="true">
            <span class="flex h-16 w-16 items-center justify-center rounded-3xl bg-ink-950 text-white dark:bg-ink-50 dark:text-ink-950 shadow-xl" aria-hidden="true">
              <FileQuestion class="h-7 w-7" />
            </span>
            <div class="space-y-2 max-w-md">
              <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">
                尚未載入單字集
              </h2>
              <p class="text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                您可以點擊 <strong class="font-bold text-emerald-600 dark:text-emerald-400">新增單字集</strong> 按鈕，或匯入之前生成過的單字集。
              </p>
            </div>
            
            <div class="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <Button variant="default" @click="openImport" class="gap-2 px-8 py-3">
                <Plus class="h-4 w-4" />
                <span>新增單字集</span>
              </Button>
              <Button variant="outline" @click="openTransfer" class="gap-2 px-8 py-3">
                <Upload class="h-4 w-4" />
                <span>備份與匯入</span>
              </Button>
            </div>
          </Card>
        </div>

        <!-- Set Cards List -->
        <div v-else class="grid gap-6 md:grid-cols-2">
          <SetCard
            v-for="set in sets"
            :key="set.id"
            :set="set"
            :active="isSetInProgress(set.id)"
            @flashcards="startFlashcards"
            @quiz="openPracticeDialog('quiz', $event)"
            @spelling="openPracticeDialog('spelling', $event)"
            @delete="requestDelete"
            @edit="openSetEditor('edit', sets.find((item) => item.id === $event))"
          />
        </div>
      </section>

      <!-- Flashcards View -->
      <section v-else-if="currentView === 'flashcard' && activeSet && currentSession" class="space-y-6">
        <Card class="p-6 text-left" :glow="false">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                正在進行
              </p>
              <h3 class="mt-1.5 text-lg font-bold tracking-tight text-ink-950 dark:text-ink-50">
                {{ activeSet.setName }}
              </h3>
            </div>
            <Badge variant="secondary" class="rounded-lg px-3 py-1.5 text-xs font-semibold bg-ink-100 dark:bg-ink-800 border-none">
              單字卡模式 · {{ totalItems }} 張
            </Badge>
          </div>
        </Card>

        <div class="space-y-6">
          <FlashcardView
            v-for="(entry, entryIndex) in sessionEntries"
            :key="entry.item.id"
            :item="entry.item"
            :index="entryIndex"
          />
        </div>
      </section>

      <!-- Quiz / Spelling Practice View -->
      <section v-else-if="(currentView === 'quiz' || currentView === 'spelling') && activeSet && currentSession" class="space-y-6">
        <Card class="p-6 text-left" :glow="false">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div class="space-y-1">
              <p class="text-xs uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                單字特訓中
              </p>
              <h3 class="text-lg font-bold tracking-tight text-ink-950 dark:text-ink-50">
                {{ activeSet.setName }}
              </h3>
              <p class="text-xs font-semibold text-ink-400 dark:text-ink-500">
                {{ currentView === 'quiz' ? `選擇題 ${totalItems} 題` : `拼字測試 ${totalItems} 題` }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-[10px] uppercase font-bold tracking-wider text-ink-400 dark:text-ink-500">已作答進度</p>
              <p class="text-xl font-extrabold text-ink-950 dark:text-ink-50">
                {{ progressCount }} <span class="text-xs text-ink-400">/ {{ totalItems }}</span>
              </p>
            </div>
          </div>
          <Progress :model-value="progressPercent" />
        </Card>

        <div class="space-y-6">
          <template v-if="currentView === 'quiz'">
            <QuizCard
              v-for="(entry, entryIndex) in sessionEntries"
              :key="entry.item.id"
              :entry="entry"
              :index="entryIndex"
              :total="totalItems"
              :review="currentSession.review"
              :draft="currentSession.drafts?.[entryIndex] ?? null"
              batch-mode
              @draft-change="(payload) => handleQuizDraftChange(entryIndex, payload)"
              @toast="showToast"
            />
          </template>

          <template v-else>
            <SpellingCard
              v-for="(entry, entryIndex) in sessionEntries"
              :key="entry.item.id"
              :entry="entry"
              :index="entryIndex"
              :total="totalItems"
              :review="currentSession.review"
              :draft="currentSession.drafts?.[entryIndex] ?? null"
              batch-mode
              @draft-change="(payload) => handleSpellingDraftChange(entryIndex, payload)"
              @toast="showToast"
            />
          </template>

          <!-- Submit Bar -->
          <Card class="p-6" :glow="false">
            <div class="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
              <p class="text-xs font-medium text-ink-500 dark:text-ink-400 text-left">
                檢查無誤後，請點擊右方按鈕提交本輪全部的作答結果。
              </p>
              <Button variant="default" class="w-full sm:w-auto px-8 py-3" @click="submitCurrentRound">
                送出本輪答案
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <!-- Completion Results View -->
      <section v-else-if="currentView === 'result' && activeSet && resultSummary" class="space-y-6">
        <!-- Result Summary Dashboard Card -->
        <Card id="completion-panel" class="p-8 text-left" :glow="true">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-ink-200/50 dark:border-ink-800/50">
            <div class="flex items-start gap-4">
              <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-950 text-white dark:bg-ink-50 dark:text-ink-950 shadow-md" aria-hidden="true">
                <BookOpenText class="h-6 w-6" />
              </span>
              <div class="space-y-1">
                <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 dark:text-ink-50">
                  {{ resultSummary.review ? '本輪錯題複習完成！' : '測驗順利完成！' }}
                </h2>
                <p class="text-xs font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-widest">
                  模式：{{ resultSummary.mode === 'quiz' ? '四選一選擇' : '英文拼字測試' }}
                </p>
              </div>
            </div>
            
            <!-- Circular Score Visual Indicator equivalent -->
            <div class="flex items-center gap-4 self-start md:self-auto shrink-0 bg-ink-100/50 dark:bg-ink-900/40 border border-ink-200/50 dark:border-ink-800/50 rounded-2xl p-4">
              <div class="text-left">
                <div class="flex items-baseline gap-0.5">
                  <span class="text-4xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">{{ resultSummary.score }}</span>
                  <span class="text-sm font-semibold text-ink-400 dark:text-ink-500">分</span>
                </div>
                <p class="text-xs font-medium text-ink-500 dark:text-ink-400 mt-1">
                  答對 {{ resultSummary.correctCount }} / {{ resultSummary.total }} 題，錯題 {{ resultSummary.wrongCount }} 題
                </p>
              </div>
            </div>
          </div>

          <!-- Bottom toolbar actions -->
          <div class="mt-6 flex flex-wrap items-center justify-start gap-3">
            <Button variant="default" @click="restartCurrentMode" class="gap-2 px-6 py-2.5">
              <RotateCcw class="h-4 w-4" />
              <span>再練一次</span>
            </Button>
            <Button
              v-if="resultSummary.wrongCount"
              variant="outline"
              class="gap-2 px-5 py-2.5"
              @click="reviewWrongAnswers"
            >
              <BookOpenText class="h-4 w-4 text-emerald-500" />
              <span>複習錯題 ({{ resultSummary.wrongCount }})</span>
            </Button>
            <Button
              v-if="resultSummary.wrongCount"
              variant="outline"
              class="gap-2 px-5 py-2.5"
              @click="copyAllWrongQuestionsPrompt"
            >
              <ClipboardCopy class="h-4 w-4 text-indigo-500" />
              <span>複製錯題 AI 解析</span>
            </Button>
            <Button variant="outline" @click="switchModeAfterResult" class="gap-2 px-5 py-2.5">
              <SpellCheck2 class="h-4 w-4" />
              <span>{{ resultSummary.mode === 'quiz' ? '切換到拼字' : '切換到選擇' }}</span>
            </Button>
          </div>

          <p v-if="!resultSummary.wrongCount" class="mt-6 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
            恭喜！本輪測驗取得滿分，可以切換模式或挑選其他單字集。
          </p>
        </Card>

        <!-- Detailed Results Rows List -->
        <div class="space-y-4">
          <Card
            v-for="row in resultRows"
            :key="`${row.entry.item.id}-${row.index}`"
            class="p-6 text-left"
            :glow="false"
          >
            <div class="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-ink-100 dark:border-ink-800">
              <div class="space-y-1">
                <p class="text-base font-bold text-ink-950 dark:text-ink-50">
                  第 {{ row.index + 1 }} 題 ｜ <span class="font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{{ row.entry.item.word }}</span>
                </p>
                <p class="text-xs text-ink-400 dark:text-ink-500 font-medium">
                  詞性：{{ row.entry.item.pos || 'n./v./adj.' }}
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  class="h-8 px-3 text-xs text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
                  @click="copyQuestionExplainPrompt(row.entry, row.record, resultSummary.mode)"
                >
                  <ClipboardCopy class="h-3.5 w-3.5 mr-1" />
                  <span>AI 詳解</span>
                </Button>
                <Badge
                  :variant="row.record?.isCorrect ? 'success' : row.record?.skipped ? 'secondary' : 'destructive'"
                  class="rounded-lg px-3 py-1 text-xs font-bold"
                >
                  {{
                    row.record?.isCorrect
                      ? '正確'
                      : row.record?.skipped
                        ? '略過'
                        : '錯誤'
                  }}
                </Badge>
              </div>
            </div>

            <!-- Detailed Content block -->
            <div class="mt-4 space-y-3 text-sm leading-relaxed text-ink-700 dark:text-ink-300">
              <div v-if="resultSummary.mode === 'quiz'" class="space-y-2">
                <p class="font-semibold text-ink-900 dark:text-ink-100">{{ row.entry.item.question.prompt }}</p>
                <div class="grid gap-1.5 p-3 rounded-xl bg-ink-100/50 dark:bg-ink-900/40 text-xs text-ink-500 dark:text-ink-400 border border-ink-200/30 dark:border-ink-800/30">
                  <p>您的作答：<span class="font-bold text-ink-800 dark:text-ink-200">{{ row.record?.userAnswer ?? '未作答' }}</span></p>
                  <p>正確答案：<span class="font-bold text-emerald-600 dark:text-emerald-400">{{ row.record?.correctAnswer ?? row.entry.item.question.opts[row.entry.item.question.ans] }}</span></p>
                </div>
              </div>
              <div v-else class="space-y-2">
                <p class="font-semibold text-ink-900 dark:text-ink-100">{{ row.entry.item.example }}</p>
                <div class="grid gap-1.5 p-3 rounded-xl bg-ink-100/50 dark:bg-ink-900/40 text-xs text-ink-500 dark:text-ink-400 border border-ink-200/30 dark:border-ink-800/30">
                  <p>中文提示：<span class="font-bold text-ink-800 dark:text-ink-200">{{ row.entry.item.meaning }}</span></p>
                  <p>您的作答：<span class="font-bold text-ink-800 dark:text-ink-200">{{ row.record?.userAnswer ?? '未作答' }}</span></p>
                  <p>正確答案：<span class="font-bold text-emerald-600 dark:text-emerald-400">{{ row.record?.correctAnswer ?? row.entry.item.word }}</span></p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>

    <!-- Dialog: Import Set -->
    <Dialog
      :open="importOpen"
      title="新增單字集"
      :description="importStep === 1 ? '第一步：輸入你想特訓的英文單字列表並複製 AI 提示詞。' : '第二步：貼上 AI 回覆的 JSON 格式即可完成匯入。'"
      @close="closeImport"
    >
      <div v-if="importStep === 1" class="space-y-5">
        <div class="flex flex-col gap-1.5 w-full text-left">
          <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            請輸入單字列表（支援每行一個，可附帶中文註記）
          </label>
          <Textarea
            ref="importTextarea"
            v-model="importWords"
            :rows="8"
            class="font-mono text-sm leading-relaxed"
            placeholder="apple - 蘋果&#10;banana - 香蕉&#10;car"
          />
        </div>

        <div class="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-500/5 p-4 text-left">
          <p class="text-xs font-bold text-indigo-700 dark:text-indigo-400">如何使用 AI 產生單字集？</p>
          <p class="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400 font-medium">
            點擊「複製 AI 指令」，貼入任意 AI 平台（例如 ChatGPT / Claude / Gemini），AI 將為您生成詞彙例句與挖空選擇題。得到回覆後點擊下一步貼入即可。
          </p>
        </div>

        <div class="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
          <Button variant="outline" @click="closeImport">取消</Button>
          <Button variant="outline" class="gap-2" @click="copyImportPrompt">
            <ClipboardCopy class="h-4 w-4 text-indigo-500" />
            <span>複製 AI 指令</span>
          </Button>
          <Button variant="default" @click="nextImportStep">下一步</Button>
        </div>
      </div>

      <div v-else-if="importStep === 2" class="space-y-5">
        <div class="flex flex-col gap-1.5 w-full text-left">
          <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            請貼上 AI 產生的 JSON 資料
          </label>
          <Textarea
            ref="importTextarea"
            v-model="importJson"
            :rows="8"
            class="font-mono text-xs leading-relaxed"
            placeholder='{"items":[{"word":"abandon","meaning":"放棄；遺棄","example":"He decided to abandon the plan after the cost doubled.","question":{"prompt":"The captain had to _____ the ship during the storm.","opts":["abandon","delay","gather","repair"],"ans":0}}]}'
          />
        </div>

        <p v-if="importPreview" class="rounded-xl bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold text-left">
          {{ importPreview }}
        </p>
        <p v-if="importError" class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold text-left">
          格式錯誤：{{ importError }}
        </p>

        <div class="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
          <Button variant="outline" @click="importStep = 1">上一步</Button>
          <Button variant="default" :disabled="!importPreview" @click="importSet">套用與編輯名稱</Button>
        </div>
      </div>
    </Dialog>

    <!-- Dialog: Backup / Import -->
    <Dialog
      :open="transferOpen"
      title="備份與數據匯入"
      description="下載 ZIP 以離線備份您的單字集，或自 ZIP 檔案快速恢復數據。"
      width-class="max-w-3xl"
      @close="closeTransfer"
    >
      <div class="space-y-6">
        <!-- Export Section -->
        <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-ink-950 dark:text-ink-50">匯出單字集備份</p>
              <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">勾選想要存檔的單字集，點擊右下按鈕導出。</p>
            </div>
            <Button variant="outline" size="sm" class="h-8 px-3 text-xs bg-white dark:bg-ink-900" :disabled="!sets.length" @click="toggleExportAll">
              {{ exportAllSelected ? '取消全選' : '全選' }}
            </Button>
          </div>

          <div v-if="sets.length" class="mt-4 grid gap-2.5 max-h-48 overflow-y-auto pr-1">
            <label
              v-for="set in sets"
              :key="set.id"
              class="flex items-center gap-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 py-2.5 cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-850"
            >
              <input
                v-model="exportSelectedIds"
                type="checkbox"
                :value="set.id"
                class="h-4 w-4 accent-emerald-500 rounded border-ink-300"
              />
              <div class="text-left">
                <p class="text-sm font-bold text-ink-900 dark:text-ink-100">{{ set.setName }}</p>
                <p class="text-[11px] text-ink-400 dark:text-ink-500 font-semibold">{{ set.items.length }} 個單字</p>
              </div>
            </label>
          </div>
          <p v-else class="mt-4 text-xs text-ink-400 dark:text-ink-500 font-semibold">尚無任何單字集可供匯出。</p>

          <div class="mt-4 pt-4 border-t border-ink-200/50 dark:border-ink-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p v-if="sets.length" class="text-xs text-ink-500 dark:text-ink-400 font-medium text-left">
              已勾選 {{ exportSelectedCount }} 個單字集，包含 {{ exportSelectedWordCount }} 個單字。
            </p>
            <p v-else></p>
            <Button variant="default" :disabled="!exportSelectedCount" @click="exportSelectedSetsToZip" class="gap-2">
              <Download class="h-4 w-4" />
              <span>匯出 ZIP 封包</span>
            </Button>
          </div>
          
          <p v-if="exportError" class="mt-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2 text-xs text-red-600 dark:text-red-400 font-semibold">
            {{ exportError }}
          </p>
        </div>

        <!-- Import Section -->
        <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-ink-950 dark:text-ink-50">匯入 ZIP 封包</p>
              <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">選擇由本平台生成的 ZIP 備份檔案，恢復學習進度。</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-8 px-3 text-xs bg-white dark:bg-ink-900"
              :disabled="!zipImportPreview && !zipImportError && !zipImportName"
              @click="resetZipImportState"
            >
              清除
            </Button>
          </div>

          <div class="mt-4 space-y-2">
            <input
              :key="zipImportInputKey"
              type="file"
              accept=".zip"
              class="block w-full text-sm text-ink-500 file:mr-4 file:rounded-xl file:border-0 file:bg-ink-950 dark:file:bg-ink-50 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white dark:file:text-ink-950 file:transition-all file:cursor-pointer hover:file:opacity-90 file:active:scale-95"
              @change="handleZipImportChange"
            />
            <p v-if="zipImportName" class="text-xs text-ink-400 dark:text-ink-500 font-bold">已選擇檔案：{{ zipImportName }}</p>
          </div>

          <p v-if="zipImportPreview" class="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            {{ zipImportPreview }}
          </p>
          <p v-if="zipImportError" class="mt-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold">
            {{ zipImportError }}
          </p>

          <div class="mt-4 pt-4 border-t border-ink-200/50 dark:border-ink-800/50 flex justify-end">
            <Button variant="default" :disabled="!zipImportSets || !zipImportSets.length" @click="applyZipImport" class="gap-2">
              <Upload class="h-4 w-4" />
              <span>匯入此封包</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Dialog: Create / Edit Set Editor -->
    <Dialog
      :open="setEditorOpen"
      :title="setEditorMode === 'create' ? '建立單字集' : '編輯單字集'"
      :description="setEditorMode === 'create' ? '為您剛載入的單字建立名稱並套用。' : '直接修改單字、詞性、中文意思、例句及選擇題。'"
      width-class="max-w-4xl"
      @close="closeSetEditor"
    >
      <div class="space-y-5">
        <!-- Set Name Field -->
        <div class="flex flex-col gap-1.5 w-full text-left">
          <label class="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">單字集名稱</label>
          <Input v-model="setEditorName" placeholder="例如：核心高頻單字 Level 1" />
        </div>

        <!-- Editable Items Scroll Panel -->
        <div v-if="setEditorMode === 'edit'" class="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
          <div
            v-for="(item, itemIndex) in setEditorDraftItems"
            :key="item.id"
            class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-900/40 p-5 text-left relative overflow-hidden"
          >
            <!-- Glow background overlay for premium feel -->
            <div class="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/5 blur-3xl dark:hidden" aria-hidden="true"></div>

            <div class="relative z-10 flex items-center justify-between gap-4 pb-3 border-b border-ink-200/50 dark:border-ink-800/50">
              <p class="text-sm font-bold text-ink-950 dark:text-ink-50">第 {{ itemIndex + 1 }} 個單字</p>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                @click="removeEditorItem(itemIndex)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>

            <!-- Editor fields grid -->
            <div class="relative z-10 mt-4 grid gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5 w-full text-left">
                <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">英文單字</label>
                <Input v-model="item.word" placeholder="英文單字" />
              </div>
              <div class="flex flex-col gap-1.5 w-full text-left">
                <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">單字詞性</label>
                <Input v-model="item.pos" placeholder="詞性縮寫，例如 n. / v." />
              </div>
              <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
                <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">中文意思</label>
                <Textarea v-model="item.meaning" :rows="2" placeholder="輸入中文意思" />
              </div>
              <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
                <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">例句（若包含該單字則會自動用於拼字測試）</label>
                <Textarea v-model="item.example" :rows="2" placeholder="例句" />
              </div>
              <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
                <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">選擇題幹（以 _____ 作為挖空）</label>
                <Textarea v-model="item.question.prompt" :rows="2" placeholder="填入題幹" />
              </div>
            </div>

            <!-- Quiz options grid -->
            <div class="relative z-10 mt-4 grid gap-3 sm:grid-cols-2">
              <div v-for="(option, optionIndex) in item.question.opts" :key="`${item.id}-option-${optionIndex}`" class="flex flex-col gap-1.5 w-full text-left">
                <label class="text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">選項 {{ optionIndex + 1 }}</label>
                <Input v-model="item.question.opts[optionIndex]" :placeholder="`選項 ${optionIndex + 1}`" />
              </div>
            </div>

            <!-- Right Answer Selector buttons -->
            <div class="relative z-10 mt-4 flex flex-wrap gap-2 items-center">
              <span class="text-xs font-semibold text-ink-500 dark:text-ink-400 mr-2">設定正解為：</span>
              <button
                v-for="answerIndex in 4"
                :key="`${item.id}-answer-${answerIndex}`"
                type="button"
                class="rounded-xl border px-4 py-2 text-xs font-bold transition-all duration-200"
                :class="item.question.ans === answerIndex - 1 ? 'button-primary text-white dark:text-ink-950 shadow-md' : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-850'"
                @click="item.question.ans = answerIndex - 1"
              >
                選項 {{ answerIndex }}
              </button>
            </div>
          </div>

          <Button variant="outline" class="w-full gap-2 border-dashed py-3.5" @click="addEditorItem">
            <Plus class="h-4 w-4" />
            <span>新增一個單字欄位</span>
          </Button>
        </div>

        <p v-if="setEditorError" class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold text-left">
          ⚠️ {{ setEditorError }}
        </p>

        <div class="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
          <Button variant="outline" @click="closeSetEditor">取消</Button>
          <Button variant="default" @click="saveSetEditor">{{ setEditorMode === 'create' ? '套用與儲存' : '儲存修改' }}</Button>
        </div>
      </div>
    </Dialog>

    <!-- Dialog: Confirm Alert -->
    <Dialog
      :open="confirmOpen"
      :title="confirmTitle"
      :description="confirmMessage"
      :show-close="false"
      width-class="max-w-md"
      @close="resolveConfirm(false)"
    >
      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" @click="resolveConfirm(false)">取消</Button>
        <Button variant="destructive" @click="resolveConfirm(true)">確定</Button>
      </div>
    </Dialog>

    <!-- Dialog: Practice Count Selector Dialog -->
    <Dialog
      :open="practiceDialogOpen"
      :title="practiceDialogMode === 'quiz' ? '開始選擇練習' : '開始拼字測試'"
      description="調整拉條，自由選定本次特訓的練習題數。"
      @close="closePracticeDialog"
    >
      <div v-if="practiceDialogSetId && sets.find((set) => set.id === practiceDialogSetId)" class="space-y-6">
        <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left relative overflow-hidden">
          <!-- Glow background overlay -->
          <div class="pointer-events-none absolute -right-20 -bottom-20 h-44 w-44 rounded-full bg-indigo-500/5 blur-3xl dark:hidden" aria-hidden="true"></div>

          <div class="flex items-center justify-between gap-3 relative z-10">
            <div class="space-y-1">
              <p class="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">特訓題數</p>
              <p class="text-xl font-extrabold text-ink-950 dark:text-ink-50">
                {{ practiceDialogCount }} <span class="text-xs text-ink-400">/ {{ sets.find((set) => set.id === practiceDialogSetId)?.items.length ?? 1 }} 題</span>
              </p>
            </div>
          </div>
          
          <input
            class="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-200 dark:bg-ink-800 accent-emerald-500 focus:outline-none relative z-10"
            type="range"
            min="1"
            :max="sets.find((set) => set.id === practiceDialogSetId)?.items.length ?? 1"
            v-model="practiceDialogCount"
          />
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
          <Button variant="outline" @click="closePracticeDialog">取消</Button>
          <Button variant="default" @click="confirmPracticeDialog">開始特訓</Button>
        </div>
      </div>
    </Dialog>

    <Toast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
