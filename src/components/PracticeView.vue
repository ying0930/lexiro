<script setup>
import { useVocab } from '../composables/useVocab.js'
import Card from './ui/card/Card.vue'
import Progress from './ui/progress/Progress.vue'
import QuizCard from './QuizCard.vue'
import SpellingCard from './SpellingCard.vue'
import Button from './ui/button/Button.vue'

const {
  currentView,
  activeSet,
  currentSession,
  totalItems,
  progressCount,
  progressPercent,
  sessionEntries,
  handleQuizDraftChange,
  handleSpellingDraftChange,
  showToast,
  submitCurrentRound,
} = useVocab()
</script>

<template>
  <section v-if="activeSet && currentSession" class="space-y-6">
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
</template>
