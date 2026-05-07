<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  BookOpenText,
  ClipboardCopy,
  FileQuestion,
  Plus,
  PencilLine,
  RotateCcw,
  SpellCheck2,
  Trash2,
} from 'lucide-vue-next'
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
  return {
    mode: currentSession.value.mode,
    review: currentSession.value.review,
    total: currentSession.value.entries.length,
    correctCount: currentSession.value.correctCount,
    wrongCount: currentSession.value.wrongEntries.length,
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
  importJson.value = ''
  importError.value = ''
  importPreview.value = ''
  importOpen.value = true
  nextTick(() => importTextarea.value?.focus())
}

function closeImport() {
  importOpen.value = false
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

async function copyPrompt() {
  try {
    await copyToClipboard(prompts.generateWordSet)
    showToast('已複製 AI 指令')
  } catch {
    showToast('複製失敗')
  }
}

async function copyQuestionExplainPrompt(entry, record = null) {
  const question = entry.item.question
  const promptText = prompts.explainQuestion
    .replace('{{QUESTION}}', question.prompt)
    .replace('{{OPTIONS}}', formatQuestionOptions(question))
    .replace('{{USER_ANSWER}}', record?.userAnswer ?? '未作答')
    .replace('{{CORRECT_ANSWER}}', question.opts[question.ans])
    .replace('{{MEANING}}', entry.item.meaning)
    .replace('{{EXAMPLE}}', entry.item.example)

  try {
    await copyToClipboard(promptText)
    showToast(`已複製「${entry.item.word}」AI 提示`)
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

watch([sets, activeSetId, currentView, currentSession, flashcardIndex], saveState, { deep: true })

onMounted(() => {
  loadState()
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && importOpen.value) closeImport()
    if (event.key === 'Escape' && confirmOpen.value) resolveConfirm(false)
  })
})
</script>

<template>
  <div class="min-h-screen pb-20">
    <header class="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur-md">
      <div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Button
              v-if="currentView !== 'home'"
              variant="ghost"
              size="icon"
              class="h-9 w-9"
              @click="exitCurrentView"
            >
              <ArrowLeft class="h-4 w-4" />
            </Button>
            <div>
              <h1 class="text-xl font-semibold tracking-tight text-zinc-950">單字特訓</h1>
              <p v-if="currentView === 'home'" class="text-sm text-zinc-500">
                建立或匯入單字集後即可開始。
              </p>
            </div>
          </div>

          <div v-if="activeSet && currentView !== 'home'" class="flex items-center gap-2">
            <Badge variant="secondary" class="rounded-md px-3 py-1 text-sm">
              {{ activeSet.setName }}
            </Badge>
            <Button variant="outline" size="icon" class="h-9 w-9" @click="deleteActiveSet">
              <Trash2 class="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" class="h-9 w-9" @click="editActiveSet">
              <PencilLine class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div v-if="currentView === 'home'" class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-sm text-zinc-500">
            <span v-if="hasSets">{{ sets.length }} 個單字集，{{ totalWordCount }} 個單字</span>
            <span v-else>貼上新的單字集 JSON 後即可開始。</span>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" @click="copyPrompt">
              <ClipboardCopy class="h-4 w-4" />
              複製 AI 指令
            </Button>
            <Button @click="openImport">
              <Plus class="h-4 w-4" />
              匯入單字集
            </Button>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto mt-6 max-w-5xl px-4">
      <section v-if="currentView === 'home'">
        <div v-if="!hasSets" class="py-16">
          <Card class="border-dashed border-zinc-300 bg-white/90 p-10 text-center">
            <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-100">
              <FileQuestion class="h-7 w-7 text-zinc-500" />
            </div>
            <h2 class="text-lg font-semibold text-zinc-950">尚無單字集</h2>
            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              先建立單字集，再開始練習。
            </p>
            <div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button @click="openImport">
                <Plus class="h-4 w-4" />
                匯入單字集
              </Button>
              <Button variant="outline" @click="copyPrompt">
                <ClipboardCopy class="h-4 w-4" />
                複製 AI 指令
              </Button>
            </div>
          </Card>
        </div>

        <div v-else class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
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
        </div>
      </section>

      <section v-else-if="currentView === 'flashcard' && activeSet && currentSession" class="space-y-4">
        <Card class="p-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-zinc-950">{{ activeSet.setName }}</p>
              <p class="mt-1 text-sm text-zinc-500">單字卡</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-zinc-400">{{ totalItems }} 張</p>
            </div>
          </div>
        </Card>

        <div class="space-y-4">
          <FlashcardView
            v-for="(entry, entryIndex) in sessionEntries"
            :key="entry.item.id"
            :item="entry.item"
            :index="entryIndex"
          />
        </div>
      </section>

      <section v-else-if="(currentView === 'quiz' || currentView === 'spelling') && activeSet && currentSession" class="space-y-4">
        <Card class="p-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-zinc-950">{{ activeSet.setName }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span>
                  {{ currentView === 'quiz' ? `選擇題 ${totalItems} 題` : `拼字測試 ${totalItems} 題` }}
                </span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-zinc-400">進度</p>
              <p class="text-lg font-semibold text-zinc-950">{{ progressCount }} / {{ totalItems }}</p>
            </div>
          </div>
          <Progress :model-value="progressPercent" />
        </Card>

        <div class="space-y-4">
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
            />
          </template>

          <Card class="border-zinc-200 p-5 sm:p-6">
            <div class="flex flex-col items-end gap-3 sm:flex-row sm:justify-end">
              <Button @click="submitCurrentRound">
                送出答案
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section v-else-if="currentView === 'result' && activeSet && resultSummary" class="space-y-4">
        <Card id="completion-panel" class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <BookOpenText class="h-6 w-6 text-zinc-700" />
          </div>
          <h2 class="text-xl font-semibold text-zinc-950">
            {{ resultSummary.review ? '本輪錯題復習完成' : '本輪練習完成' }}
          </h2>
          <p class="mt-2 text-sm text-zinc-500">
            {{
              resultSummary.mode === 'quiz'
                ? '選擇題結果'
                : '拼字測試結果'
            }}
            ｜答對 {{ resultSummary.correctCount }} / {{ resultSummary.total }}
          </p>
          <p class="mt-1 text-sm text-zinc-500">錯題 {{ resultSummary.wrongCount }} 題</p>

          <div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button @click="restartCurrentMode">
              <RotateCcw class="h-4 w-4" />
              重新做一次
            </Button>
            <Button
              v-if="resultSummary.wrongCount"
              variant="outline"
              @click="reviewWrongAnswers"
            >
              <BookOpenText class="h-4 w-4" />
              復習錯題
            </Button>
            <Button variant="outline" @click="switchModeAfterResult">
              <SpellCheck2 class="h-4 w-4" />
              {{ resultSummary.mode === 'quiz' ? '切換到拼字' : '切換到練習' }}
            </Button>
          </div>

          <p v-if="!resultSummary.wrongCount" class="mt-5 text-sm font-medium text-green-700">
            本輪全對，可以直接切換模式或重新開始下一輪。
          </p>
        </Card>

        <div class="space-y-3">
          <Card
            v-for="row in resultRows"
            :key="`${row.entry.item.id}-${row.index}`"
            class="border-zinc-200 p-5"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-zinc-950">
                  第 {{ row.index + 1 }} 題｜{{ row.entry.item.word }}
                </p>
                <p class="mt-1 text-sm text-zinc-500">
                  {{
                    row.record?.isCorrect
                      ? '正確'
                      : row.record?.skipped
                        ? '略過'
                        : '錯誤'
                  }}
                </p>
              </div>
              <Badge
                :variant="row.record?.isCorrect ? 'default' : 'secondary'"
                class="rounded-md px-3 py-1 text-sm"
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

            <div class="mt-4 space-y-3 text-sm leading-6 text-zinc-700">
              <div v-if="resultSummary.mode === 'quiz'">
                <p class="font-medium text-zinc-900">{{ row.entry.item.question.prompt }}</p>
                <p class="mt-2 text-zinc-600">
                  你的答案：{{ row.record?.userAnswer ?? '未作答' }}
                </p>
                <p class="text-zinc-600">
                  正確答案：{{ row.record?.correctAnswer ?? row.entry.item.question.opts[row.entry.item.question.ans] }}
                </p>
              </div>
              <div v-else>
                <p class="font-medium text-zinc-900">{{ row.entry.item.example }}</p>
                <p class="mt-2 text-zinc-600">提示：{{ row.entry.item.meaning }}</p>
                <p class="text-zinc-600">你的答案：{{ row.record?.userAnswer ?? '未作答' }}</p>
                <p class="text-zinc-600">正確答案：{{ row.record?.correctAnswer ?? row.entry.item.word }}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>

    <Dialog
      :open="importOpen"
      title="匯入單字集"
      description="貼上新的單字集 JSON。"
      @close="closeImport"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-zinc-700">貼上 JSON</label>
          <Textarea
            ref="importTextarea"
            v-model="importJson"
            :rows="12"
            class="font-mono"
            placeholder='{"setName":"核心單字 A","items":[{"word":"abandon","meaning":"放棄；遺棄","example":"He decided to abandon the plan after the cost doubled.","question":{"prompt":"The captain had to _____ the ship during the storm.","opts":["abandon","delay","gather","repair"],"ans":0}}]}'
          />
        </div>

        <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p class="text-xs font-semibold text-zinc-500">匯入前檢查</p>
          <p class="mt-1 text-xs leading-5 text-zinc-500">
            會先檢查 JSON 格式是否正確，接著再讓你輸入單字集名稱並確認內容。
          </p>
        </div>

        <p v-if="importPreview" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {{ importPreview }}
        </p>
        <p v-if="importError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ importError }}
        </p>

        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="closeImport">取消</Button>
          <Button @click="importSet">套用</Button>
        </div>
      </div>
    </Dialog>

    <Dialog
      :open="setEditorOpen"
      :title="setEditorMode === 'create' ? '新增單字集' : '編輯單字集'"
      :description="setEditorMode === 'create' ? '輸入名稱後即可完成新增。' : '可直接編輯每個單字欄位。'"
      @close="closeSetEditor"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-zinc-700">單字集名稱</label>
          <Input v-model="setEditorName" placeholder="例如：核心單字 A" />
        </div>

        <div v-if="setEditorMode === 'edit'" class="space-y-4">
          <div
            v-for="(item, itemIndex) in setEditorDraftItems"
            :key="item.id"
            class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-zinc-950">第 {{ itemIndex + 1 }} 個單字</p>
              <Button
                variant="outline"
                size="icon"
                class="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                @click="removeEditorItem(itemIndex)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="space-y-2 sm:col-span-1">
                <label class="text-sm font-medium text-zinc-700">單字</label>
                <Input v-model="item.word" placeholder="word" />
              </div>
              <div class="space-y-2 sm:col-span-1">
                <label class="text-sm font-medium text-zinc-700">詞性</label>
                <Input v-model="item.pos" placeholder="n. / v. / adj." />
              </div>
              <div class="space-y-2 sm:col-span-2">
                <label class="text-sm font-medium text-zinc-700">中文意思</label>
                <Textarea v-model="item.meaning" :rows="2" placeholder="中文意思" />
              </div>
              <div class="space-y-2 sm:col-span-2">
                <label class="text-sm font-medium text-zinc-700">例句</label>
                <Textarea v-model="item.example" :rows="3" placeholder="例句" />
              </div>
              <div class="space-y-2 sm:col-span-2">
                <label class="text-sm font-medium text-zinc-700">題目</label>
                <Textarea v-model="item.question.prompt" :rows="3" placeholder="題幹" />
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div v-for="(option, optionIndex) in item.question.opts" :key="`${item.id}-option-${optionIndex}`" class="space-y-2">
                <label class="text-sm font-medium text-zinc-700">選項 {{ optionIndex + 1 }}</label>
                <Input v-model="item.question.opts[optionIndex]" :placeholder="`選項 ${optionIndex + 1}`" />
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                v-for="answerIndex in 4"
                :key="`${item.id}-answer-${answerIndex}`"
                type="button"
                class="rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                :class="item.question.ans === answerIndex - 1 ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'"
                @click="item.question.ans = answerIndex - 1"
              >
                正解 {{ answerIndex }}
              </button>
            </div>
          </div>

          <Button variant="outline" class="w-full" @click="addEditorItem">
            <Plus class="h-4 w-4" />
            新增單字
          </Button>
        </div>

        <p v-if="setEditorError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ setEditorError }}
        </p>

        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="closeSetEditor">取消</Button>
          <Button @click="saveSetEditor">儲存</Button>
        </div>
      </div>
    </Dialog>

    <Dialog
      :open="confirmOpen"
      :title="confirmTitle"
      :description="confirmMessage"
      :show-close="false"
      width-class="max-w-md"
      @close="resolveConfirm(false)"
    >
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="resolveConfirm(false)">取消</Button>
        <Button variant="destructive" @click="resolveConfirm(true)">確定</Button>
      </div>
    </Dialog>

    <Dialog
      :open="practiceDialogOpen"
      :title="practiceDialogMode === 'quiz' ? '開始練習' : '拼字測試'"
      description="用拉條決定這次要練幾題。"
      @close="closePracticeDialog"
    >
      <div v-if="practiceDialogSetId && sets.find((set) => set.id === practiceDialogSetId)" class="space-y-4">
        <div class="rounded-2xl bg-zinc-50 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">練習題數</p>
              <p class="mt-1 text-sm text-zinc-600">
                {{ practiceDialogCount }} / {{ sets.find((set) => set.id === practiceDialogSetId)?.items.length ?? 1 }} 題
              </p>
            </div>
          </div>
          <input
            class="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900"
            type="range"
            min="1"
            :max="sets.find((set) => set.id === practiceDialogSetId)?.items.length ?? 1"
            v-model="practiceDialogCount"
          />
        </div>

        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="closePracticeDialog">取消</Button>
          <Button @click="confirmPracticeDialog">開始</Button>
        </div>
      </div>
    </Dialog>

    <Toast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
