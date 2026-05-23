<script setup>
import { onMounted, nextTick } from 'vue'
import { BookOpenText, RotateCcw, ClipboardCopy, SpellCheck2 } from 'lucide-vue-next'
import { useVocab } from '../composables/useVocab.js'
import Badge from './ui/badge/Badge.vue'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'

const {
  activeSet,
  resultSummary,
  resultRows,
  restartCurrentMode,
  reviewWrongAnswers,
  copyAllWrongQuestionsPrompt,
  switchModeAfterResult,
  copyQuestionExplainPrompt,
} = useVocab()

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
              {{ resultSummary.review ? '本輪錯題複習完成！' : '測驗已完成！' }}
            </h2>
            <p class="text-xs font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-widest">
              模式：{{ resultSummary.mode === 'quiz' ? '選擇題' : '英文拼字測試' }}
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
</template>
