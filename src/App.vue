<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  BookOpenText,
  ClipboardCopy,
  FileQuestion,
  Plus,
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

function createSession(mode, entries, review = false) {
  return {
    mode,
    entries,
    index: 0,
    correctCount: 0,
    wrongEntries: [],
    answers: [],
    review,
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
  return Math.min(currentSession.value.index + 1, totalItems.value)
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
    activeSetId.value = sanitizedSets.some((set) => set.id === parsed.activeSetId)
      ? parsed.activeSetId
      : sanitizedSets[0]?.id ?? null
  } catch {
    sets.value = []
    activeSetId.value = null
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      sets: sets.value,
      activeSetId: activeSetId.value,
    }),
  )
}

function resetStudyView() {
  currentView.value = 'home'
  currentSession.value = null
  flashcardIndex.value = 0
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

function startFlashcards(setId) {
  ensureActiveSet(setId)
  flashcardIndex.value = 0
  currentSession.value = createSession('flashcard', toSessionEntries(activeSet.value?.items ?? []), false)
  currentView.value = 'flashcard'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startRound(mode, setId, reviewEntries = null) {
  ensureActiveSet(setId)
  const entries = reviewEntries
    ? reviewEntries.map((entry) => ({ ...entry }))
    : toSessionEntries(activeSet.value?.items ?? [])

  currentSession.value = createSession(mode, entries, Boolean(reviewEntries))
  currentView.value = mode
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function finishRound() {
  currentView.value = 'result'
  nextTick(() => {
    document.getElementById('completion-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function handleQuizAnswered(payload) {
  if (!currentSession.value || !currentEntry.value) return
  const record = {
    type: 'quiz',
    selectedIndex: payload.selectedIndex ?? null,
    userAnswer: getQuizUserAnswerText(currentEntry.value, payload.selectedIndex),
    correctAnswer: currentEntry.value.item.question.opts[currentEntry.value.item.question.ans],
    isCorrect: payload.isCorrect,
    skipped: payload.selectedIndex === null || payload.selectedIndex === undefined,
  }

  currentSession.value.answers[currentSession.value.index] = record

  if (payload.isCorrect) {
    currentSession.value.correctCount += 1
  } else {
    currentSession.value.wrongEntries.push({ ...currentEntry.value })
  }
}

function handleQuizNext() {
  if (!currentSession.value) return
  if (currentSession.value.index >= currentSession.value.entries.length - 1) {
    finishRound()
    return
  }
  currentSession.value.index += 1
}

function handleSpellingSubmitted(payload) {
  if (!currentSession.value || !currentEntry.value) return
  const trimmed = payload.userAnswer?.trim() ?? ''
  const record = {
    type: 'spelling',
    userAnswer: trimmed || '未作答',
    correctAnswer: currentEntry.value.item.word,
    isCorrect: payload.isCorrect,
    skipped: !trimmed,
  }

  currentSession.value.answers[currentSession.value.index] = record

  if (payload.isCorrect) {
    currentSession.value.correctCount += 1
  } else {
    currentSession.value.wrongEntries.push({ ...currentEntry.value })
  }
}

function handleSpellingNext() {
  handleQuizNext()
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
  resetStudyView()
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

  const normalized = {
    ...result.data,
    id: `${Date.now()}`,
  }

  sets.value = [...sets.value, normalized]
  activeSetId.value = normalized.id
  saveState()
  resetStudyView()
  closeImport()
  showToast(`已匯入「${normalized.setName}」 (${normalized.items.length} 個單字)`)
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
              <p class="text-sm text-zinc-500">
                {{
                  currentView === 'home'
                    ? '匯入單字集後，可用單字卡、選擇題與拼字三種模式練習。'
                    : currentSession?.review
                      ? '本輪錯題復習只保留在這次練習流程中。'
                      : '每筆資料就是一個單字與一題選擇題。'
                }}
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
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
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
              先讓 AI 產出新格式 JSON，再貼回來匯入。第一版只接受單字中心資料，不支援舊題目格式。
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
          <Card class="overflow-hidden border-zinc-200 p-0">
            <div class="bg-[radial-gradient(circle_at_top_left,_rgba(252,211,77,0.24),_transparent_36%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,244,245,0.94))] p-5 sm:p-6">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700/70">Word Studio</p>
                  <h2 class="mt-1 text-lg font-semibold text-zinc-950">從單字集切換不同練習模式</h2>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                    單字卡用來看字義與例句，開始練習用原始選擇題，拼字測試則用例句挖空與中文提示做回想。
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-3 sm:min-w-[250px]">
                  <div class="rounded-xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm">
                    <p class="text-xs text-zinc-400">單字集</p>
                    <p class="mt-1 text-lg font-semibold text-zinc-950">{{ sets.length }}</p>
                  </div>
                  <div class="rounded-xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm">
                    <p class="text-xs text-zinc-400">總單字數</p>
                    <p class="mt-1 text-lg font-semibold text-zinc-950">{{ totalWordCount }}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div class="grid gap-4 md:grid-cols-2">
            <SetCard
              v-for="set in sets"
              :key="set.id"
              :set="set"
              :active="set.id === activeSetId"
              @flashcards="startFlashcards"
              @quiz="startRound('quiz', $event)"
              @spelling="startRound('spelling', $event)"
              @delete="requestDelete"
            />
          </div>
        </div>
      </section>

      <section v-else-if="currentView === 'flashcard' && activeSet && currentSession" class="space-y-4">
        <Card class="p-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-zinc-950">{{ activeSet.setName }}</p>
              <p class="mt-1 text-sm text-zinc-500">單字卡 {{ flashcardIndex + 1 }} / {{ totalItems }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-zinc-400">瀏覽進度</p>
              <p class="text-lg font-semibold text-zinc-950">{{ progressPercent }}%</p>
            </div>
          </div>
          <Progress :model-value="progressPercent" />
        </Card>

        <FlashcardView
          :item="sessionEntries[flashcardIndex]?.item"
          :index="flashcardIndex"
          :total="totalItems"
          @prev="flashcardIndex = Math.max(0, flashcardIndex - 1)"
          @next="flashcardIndex = Math.min(totalItems - 1, flashcardIndex + 1)"
        />
      </section>

      <section v-else-if="(currentView === 'quiz' || currentView === 'spelling') && activeSet && currentSession && currentEntry" class="space-y-4">
        <Card class="p-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-zinc-950">{{ activeSet.setName }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span>
                  {{
                    currentView === 'quiz'
                      ? `選擇題 ${currentSession.index + 1} / ${totalItems}`
                      : `拼字測試 ${currentSession.index + 1} / ${totalItems}`
                  }}
                </span>
                <Badge v-if="currentSession.review" variant="secondary">本輪錯題復習</Badge>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-zinc-400">目前答對</p>
              <p class="text-lg font-semibold text-zinc-950">{{ currentSession.correctCount }}</p>
            </div>
          </div>
          <Progress :model-value="progressPercent" />
        </Card>

        <QuizCard
          v-if="currentView === 'quiz'"
          :entry="currentEntry"
          :index="currentSession.index"
          :total="totalItems"
          :review="currentSession.review"
          @answered="handleQuizAnswered"
          @copy-ai-prompt="copyQuestionExplainPrompt"
          @next="handleQuizNext"
        />

        <SpellingCard
          v-else
          :entry="currentEntry"
          :index="currentSession.index"
          :total="totalItems"
          :review="currentSession.review"
          @submitted="handleSpellingSubmitted"
          @next="handleSpellingNext"
        />
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
                      ? '答對'
                      : row.record?.skipped
                        ? '跳過'
                        : '答錯'
                  }}
                </p>
              </div>
              <Badge
                :variant="row.record?.isCorrect ? 'default' : 'secondary'"
                class="rounded-md px-3 py-1 text-sm"
              >
                {{
                  row.record?.isCorrect
                    ? 'Correct'
                    : row.record?.skipped
                      ? 'Skipped'
                      : 'Wrong'
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
                <div class="mt-3 flex justify-end">
                  <Button variant="outline" size="sm" @click="copyQuestionExplainPrompt(row.entry, row.record)">
                    複製本題 AI 提示
                  </Button>
                </div>
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
      description="貼上新的單字集 JSON。最外層只接受單一 object，第一版不支援舊題目陣列格式。"
      @close="closeImport"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-zinc-700">貼上 AI 產生的 JSON</label>
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
            每筆 item 必須包含 <code>word</code>、<code>meaning</code>、<code>example</code>、<code>question</code>，
            且 <code>question</code> 只支援 <code>prompt / opts[4] / ans</code>。
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

    <Toast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
