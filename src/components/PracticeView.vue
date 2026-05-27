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
    <Card class="p-6 text-left" :glow="false">
      <div class="mb-4 flex items-start justify-between gap-4">
        <div class="space-y-1">
          <p class="text-xs uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
            {{ $t('practice.title') }}
          </p>
          <h3 class="text-lg font-bold tracking-tight text-ink-950 dark:text-ink-50">
            {{ activeSet.setName }}
          </h3>
          <p class="text-xs font-semibold text-ink-400 dark:text-ink-500">
            {{ currentView === 'quiz' ? $t('practice.quiz') : $t('practice.spelling') }} {{ $t('practice.questions', { count: totalItems }) }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-[10px] uppercase font-bold tracking-wider text-ink-400 dark:text-ink-500">
            {{ $t('practice.progress') }}
          </p>
          <p class="text-xl font-extrabold text-ink-950 dark:text-ink-50">
            {{ currentIndex + 1 }} <span class="text-xs text-ink-400">/ {{ totalItems }}</span>
          </p>
        </div>
      </div>
      <Progress :model-value="progressPercent" />
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
