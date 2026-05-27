<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import QuizCard from './QuizCard.vue'
import SpellingCard from './SpellingCard.vue'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'
import Progress from './ui/progress/Progress.vue'

const { activeSet } = useSetsStore()
const {
  currentView,
  currentSession,
  totalItems,
  progressCount,
  progressPercent,
  sessionEntries,
  handleQuizDraftChange,
  handleSpellingDraftChange,
  submitCurrentRound,
} = useSessionStore()
const { showToast } = useUIStore()

const renderLimit = ref(10)
const displayedEntries = computed(() => sessionEntries.slice(0, renderLimit.value))

function quizDraft(draft: unknown) {
  return draft as { selectedIndex: number | null, answered?: boolean } | null
}

function spellingDraft(draft: unknown) {
  return draft as { answer: string, submitted?: boolean } | null
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && renderLimit.value < sessionEntries.length) {
      renderLimit.value += 10
    }
  }, { rootMargin: '400px' })
  if (sentinel.value)
    observer.observe(sentinel.value)
})

onUnmounted(() => {
  if (observer)
    observer.disconnect()
})
</script>

<template>
  <section v-if="activeSet && currentSession" class="space-y-6">
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
            {{ progressCount }} <span class="text-xs text-ink-400">/ {{ totalItems }}</span>
          </p>
        </div>
      </div>
      <Progress :model-value="progressPercent" />
    </Card>

    <div class="space-y-6">
      <template v-if="currentView === 'quiz'">
        <QuizCard
          v-for="(entry, entryIndex) in displayedEntries"
          :key="entry.item.id"
          :entry="entry"
          :index="entryIndex"
          :total="totalItems"
          :review="currentSession.review"
          :draft="quizDraft(currentSession.drafts?.[entryIndex] ?? null)"
          batch-mode
          @draft-change="(payload) => handleQuizDraftChange(entryIndex, payload)"
          @toast="showToast"
        />
      </template>

      <template v-else>
        <SpellingCard
          v-for="(entry, entryIndex) in displayedEntries"
          :key="entry.item.id"
          :entry="entry"
          :index="entryIndex"
          :total="totalItems"
          :review="currentSession.review"
          :draft="spellingDraft(currentSession.drafts?.[entryIndex] ?? null)"
          batch-mode
          @draft-change="(payload) => handleSpellingDraftChange(entryIndex, payload)"
          @toast="showToast"
        />
      </template>

      <div ref="sentinel" class="h-1 -translate-y-4 shadow-none opacity-0" />

      <!-- Submit Bar -->
      <Card class="p-6" :glow="false">
        <div class="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
          <p class="text-xs font-medium text-ink-500 dark:text-ink-400 text-left">
            {{ $t('practice.submitHint') }}
          </p>
          <Button variant="default" class="w-full sm:w-auto px-8 py-3" @click="submitCurrentRound">
            {{ $t('practice.submitAll') }}
          </Button>
        </div>
      </Card>
    </div>
  </section>
</template>
