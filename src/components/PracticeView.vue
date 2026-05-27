<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import QuizCard from './QuizCard.vue'
import SpellingCard from './SpellingCard.vue'
import Card from './ui/card/Card.vue'
import Progress from './ui/progress/Progress.vue'

const setsStore = useSetsStore()
const sessionStore = useSessionStore()
const uiStore = useUIStore()
const { activeSet } = storeToRefs(setsStore)
const { currentView, currentSession, currentIndex, currentEntry, totalItems, progressPercent } = storeToRefs(sessionStore)
const { handleQuizDraftChange, handleSpellingDraftChange, advanceToNext } = sessionStore
const { showToast } = uiStore

const currentDraft = computed(() => {
  return currentSession.value?.drafts[currentIndex.value] ?? null
})

const quizDraft = computed<{ selectedIndex: number | null } | null>(() => currentDraft.value as { selectedIndex: number | null } | null)
const spellingDraft = computed<{ answer: string } | null>(() => currentDraft.value as { answer: string } | null)
</script>

<template>
  <section v-if="activeSet && currentSession" class="space-y-6 min-h-[65vh]">
    <Card class="p-4 text-left" :glow="false">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{{ $t('practice.title') }}</span>
          <span class="text-xs text-ink-400 dark:text-ink-500 truncate">{{ activeSet.setName }}</span>
          <span class="shrink-0 rounded-md bg-ink-100 dark:bg-ink-800 px-2 py-0.5 text-[10px] font-semibold text-ink-600 dark:text-ink-300">
            {{ currentView === 'quiz' ? $t('practice.quiz') : $t('practice.spelling') }} · {{ $t('practice.questions', { count: totalItems }) }}
          </span>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <Progress :model-value="progressPercent" class="w-24 h-1.5" />
          <span class="text-sm font-bold tabular-nums text-ink-950 dark:text-ink-50">
            {{ currentIndex + 1 }}<span class="text-xs text-ink-400">/{{ totalItems }}</span>
          </span>
        </div>
      </div>
    </Card>

    <template v-if="currentEntry && currentView === 'quiz'">
      <QuizCard
        :entry="currentEntry"
        :index="currentIndex"
        :total="totalItems"
        :review="currentSession.review"
        :draft="quizDraft"
        @draft-change="(payload) => handleQuizDraftChange(currentIndex, payload)"
        @next="advanceToNext"
        @toast="showToast"
      />
    </template>

    <template v-else-if="currentEntry">
      <SpellingCard
        :entry="currentEntry"
        :index="currentIndex"
        :total="totalItems"
        :review="currentSession.review"
        :draft="spellingDraft"
        @draft-change="(payload) => handleSpellingDraftChange(currentIndex, payload)"
        @next="advanceToNext"
        @toast="showToast"
      />
    </template>
  </section>
</template>
