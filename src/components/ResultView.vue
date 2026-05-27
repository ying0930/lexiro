<script setup lang="ts">
import { BookOpenText, ClipboardCopy, RotateCcw, SpellCheck2 } from 'lucide-vue-next'
import { computed, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import prompts from '@/lib/prompts'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import Badge from './ui/badge/Badge.vue'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'

const { activeSet } = useSetsStore()
const {
  resultSummary,
  resultRows,
  restartCurrentMode,
  reviewWrongAnswers,
  switchModeAfterResult,
} = useSessionStore()
const { t } = useI18n()
const { showToast } = useUIStore()

const wrongRows = computed(() => resultRows.filter(row => !row.record?.isCorrect))

function formatQuestionOptions(question: { opts: string[] }) {
  return question.opts.map((option, index) => `- (${String.fromCharCode(65 + index)}) ${option}`).join('\n')
}

async function copyToClipboard(text: string) {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error('clipboard unavailable'))
  }
  return navigator.clipboard.writeText(text)
}

async function copyQuestionExplainPrompt(entry: any, record: any = null, mode = 'quiz') {
  let promptText = ''

  if (mode === 'quiz') {
    const question = entry.item.question
    promptText = prompts.explainQuestion
      .replace('{{QUESTION}}', question.prompt)
      .replace('{{OPTIONS}}', formatQuestionOptions(question))
      .replace('{{USER_ANSWER}}', record?.userAnswer ?? t('result.notAnswered'))
      .replace('{{CORRECT_ANSWER}}', question.opts[question.ans])
      .replace('{{MEANING}}', entry.item.meaning)
      .replace('{{EXAMPLE}}', entry.item.example)
  }
  else {
    promptText = prompts.explainSpellingQuestion
      .replace('{{MEANING}}', entry.item.meaning)
      .replace('{{EXAMPLE}}', entry.item.example)
      .replace('{{USER_ANSWER}}', record?.userAnswer ?? t('result.notAnswered'))
      .replace('{{CORRECT_ANSWER}}', entry.item.word)
  }

  try {
    await copyToClipboard(promptText)
    showToast(t('result.copiedAiPromptSingle', { word: entry.item.word }))
  }
  catch {
    showToast(t('toast.copyFailed'))
  }
}

async function copyAllWrongQuestionsPrompt() {
  if (!resultSummary || resultSummary.wrongCount === 0)
    return

  const wrongRows = resultRows.filter(row => !row.record?.isCorrect)
  if (wrongRows.length === 0)
    return

  const wrongQuestionsText = wrongRows.map((row, idx) => {
    const mode = resultSummary.mode
    const entry = row.entry
    const record = row.record
    let text = `【第 ${idx + 1} 題】 單字：${entry.item.word}\n`

    if (mode === 'quiz') {
      const q = entry.item.question
      text += `題目：${q.prompt}\n`
      text += `選項：\n${formatQuestionOptions(q)}\n`
      text += `我的答案：${record?.userAnswer ?? '未作答'}\n`
      text += `正確答案：${q.opts[q.ans]}\n`
    }
    else {
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
    showToast(t('result.copiedAiPrompt'))
  }
  catch {
    showToast(t('toast.copyFailed'))
  }
}

onMounted(() => {
  nextTick(() => {
    document.getElementById('completion-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})
</script>

<template>
  <section v-if="activeSet && resultSummary" class="space-y-6">
    <!-- Result Summary Dashboard Card -->
    <Card id="completion-panel" class="p-8 text-left" :glow="false">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-ink-200/50 dark:border-ink-800/50">
        <div class="flex items-start gap-4">
          <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-950 text-white dark:bg-ink-50 dark:text-ink-950 shadow-md" aria-hidden="true">
            <BookOpenText class="h-6 w-6" />
          </span>
          <div class="space-y-1">
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 dark:text-ink-50">
              {{ resultSummary.review ? $t('result.reviewCompleted') : $t('result.completed') }}
            </h2>
            <p class="text-xs font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-widest">
              模式：{{ resultSummary.mode === 'quiz' ? $t('result.modeQuiz') : $t('result.modeSpelling') }}
            </p>
          </div>
        </div>

        <!-- Circular Score Visual Indicator equivalent -->
        <div class="flex items-center gap-4 self-start md:self-auto shrink-0 bg-ink-100/50 dark:bg-ink-900/40 border border-ink-200/50 dark:border-ink-800/50 rounded-2xl p-4">
          <div class="text-left">
            <div class="flex items-baseline gap-0.5">
              <span class="text-4xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">{{ $t('result.score', { score: resultSummary.score }) }}</span>
            </div>
            <p class="text-xs font-medium text-ink-500 dark:text-ink-400 mt-1">
              {{ $t('result.correctCount', { correct: resultSummary.correctCount, total: resultSummary.total, wrong: resultSummary.wrongCount }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Bottom toolbar actions -->
      <div class="mt-6 flex flex-wrap items-center justify-start gap-3">
        <Button variant="default" class="gap-2 px-6 py-2.5" @click="restartCurrentMode">
          <RotateCcw class="h-4 w-4" />
          <span>{{ $t('result.retry') }}</span>
        </Button>
        <Button
          v-if="resultSummary.wrongCount"
          variant="outline"
          class="gap-2 px-5 py-2.5"
          @click="reviewWrongAnswers"
        >
          <BookOpenText class="h-4 w-4 text-emerald-500" />
          <span>{{ $t('result.reviewWrong', { count: resultSummary.wrongCount }) }}</span>
        </Button>
        <Button
          v-if="resultSummary.wrongCount"
          variant="outline"
          class="gap-2 px-5 py-2.5"
          @click="copyAllWrongQuestionsPrompt"
        >
          <ClipboardCopy class="h-4 w-4 text-indigo-500" />
          <span>{{ $t('result.aiExplainAll') }}</span>
        </Button>
        <Button variant="outline" class="gap-2 px-5 py-2.5" @click="switchModeAfterResult">
          <SpellCheck2 class="h-4 w-4" />
          <span>{{ resultSummary.mode === 'quiz' ? $t('result.switchMode', { next: $t('result.switchSpelling') }) : $t('result.switchMode', { next: $t('result.switchQuiz') }) }}</span>
        </Button>
      </div>

      <p v-if="!resultSummary.wrongCount" class="mt-6 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping" />
        {{ $t('result.perfectScore') }}
      </p>
    </Card>

    <!-- Wrong/Skipped Results Rows List -->
    <div v-if="wrongRows.length" class="space-y-4">
      <Card
        v-for="row in wrongRows"
        :key="`${row.entry.item.id}-${row.index}`"
        class="p-6 text-left"
        :glow="false"
      >
        <div class="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-ink-100 dark:border-ink-800">
          <div class="space-y-1">
            <p class="text-base font-bold text-ink-950 dark:text-ink-50">
              {{ $t('result.question', { index: row.index + 1 }) }} ｜ <span class="font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{{ row.entry.item.word }}</span>
            </p>
            <p class="text-xs text-ink-400 dark:text-ink-500 font-medium">
              {{ $t('flashcard.pos') }}：{{ row.entry.item.pos || 'n./v./adj.' }}
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
              <span>{{ $t('result.aiExplain') }}</span>
            </Button>
            <Badge
              :variant="row.record?.skipped ? 'secondary' : 'destructive'"
              class="rounded-lg px-3 py-1 text-xs font-bold"
            >
              {{ row.record?.skipped ? $t('result.skipped') : $t('result.wrong') }}
            </Badge>
          </div>
        </div>

        <!-- Detailed Content block -->
        <div class="mt-4 space-y-3 text-sm leading-relaxed text-ink-700 dark:text-ink-300">
          <div v-if="resultSummary.mode === 'quiz'" class="space-y-2">
            <p class="font-semibold text-ink-900 dark:text-ink-100">
              {{ row.entry.item.question.prompt }}
            </p>
            <div class="grid gap-1.5 p-3 rounded-xl bg-ink-100/50 dark:bg-ink-900/40 text-xs text-ink-500 dark:text-ink-400 border border-ink-200/30 dark:border-ink-800/30">
              <p>{{ $t('result.yourAnswer') }}：<span class="font-bold text-ink-800 dark:text-ink-200">{{ row.record?.userAnswer ?? $t('result.notAnswered') }}</span></p>
              <p>{{ $t('result.correctAnswer') }}：<span class="font-bold text-emerald-600 dark:text-emerald-400">{{ row.record?.correctAnswer ?? row.entry.item.question.opts[row.entry.item.question.ans] }}</span></p>
            </div>
          </div>
          <div v-else class="space-y-2">
            <p class="font-semibold text-ink-900 dark:text-ink-100">
              {{ row.entry.item.example }}
            </p>
            <div class="grid gap-1.5 p-3 rounded-xl bg-ink-100/50 dark:bg-ink-900/40 text-xs text-ink-500 dark:text-ink-400 border border-ink-200/30 dark:border-ink-800/30">
              <p>{{ $t('flashcard.meaning') }}：<span class="font-bold text-ink-800 dark:text-ink-200">{{ row.entry.item.meaning }}</span></p>
              <p>{{ $t('result.yourAnswer') }}：<span class="font-bold text-ink-800 dark:text-ink-200">{{ row.record?.userAnswer ?? $t('result.notAnswered') }}</span></p>
              <p>{{ $t('result.correctAnswer') }}：<span class="font-bold text-emerald-600 dark:text-emerald-400">{{ row.record?.correctAnswer ?? row.entry.item.word }}</span></p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </section>
</template>
