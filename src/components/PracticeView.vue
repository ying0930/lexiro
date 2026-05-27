<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import QuizCard from './QuizCard.vue'
import SpellingCard from './SpellingCard.vue'
const setsStore = useSetsStore()
const sessionStore = useSessionStore()
const uiStore = useUIStore()
const { activeSet } = storeToRefs(setsStore)
const { currentView, currentSession, currentIndex, currentEntry, totalItems } = storeToRefs(sessionStore)
const { handleQuizDraftChange, handleSpellingDraftChange, advanceToNext } = sessionStore
const { showToast } = uiStore

const currentDraft = computed(() => {
  return currentSession.value?.drafts[currentIndex.value] ?? null
})

const quizDraft = computed<{ selectedIndex: number | null } | null>(() => currentDraft.value as { selectedIndex: number | null } | null)
const spellingDraft = computed<{ answer: string } | null>(() => currentDraft.value as { answer: string } | null)
</script>

<template>
  <section v-if="activeSet && currentSession" class="min-h-[65vh]">
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
