<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import FlashcardView from './FlashcardView.vue'
import Badge from './ui/badge/Badge.vue'
import Card from './ui/card/Card.vue'

const { activeSet } = storeToRefs(useSetsStore())
const { currentSession, sessionEntries, totalItems } = storeToRefs(useSessionStore())

const renderLimit = ref(10)
const displayedEntries = computed(() => sessionEntries.value.slice(0, renderLimit.value))

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && renderLimit.value < sessionEntries.value.length) {
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
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
            {{ $t('home.inProgress') }}
          </p>
          <h3 class="mt-1.5 text-lg font-bold tracking-tight text-ink-950 dark:text-ink-50">
            {{ activeSet.setName }}
          </h3>
        </div>
        <Badge variant="secondary" class="rounded-lg px-3 py-1.5 text-xs font-semibold bg-ink-100 dark:bg-ink-800 border-none">
          {{ $t('flashcard.title') }}模式 · {{ totalItems }} 張
        </Badge>
      </div>
    </Card>

    <div class="space-y-6">
      <FlashcardView
        v-for="(entry, entryIndex) in displayedEntries"
        :key="entry.item.id"
        :item="entry.item"
        :index="entryIndex"
      />
      <div ref="sentinel" class="h-1 -translate-y-4 shadow-none opacity-0" />
    </div>
  </section>
</template>
