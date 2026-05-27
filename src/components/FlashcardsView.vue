<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useVirtualList } from '@/lib/useVirtualList'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import FlashcardView from './FlashcardView.vue'
import Card from './ui/card/Card.vue'

const { activeSet } = storeToRefs(useSetsStore())
const { currentSession, sessionEntries, totalItems } = storeToRefs(useSessionStore())

const topSentinel = ref<HTMLElement | null>(null)
const bottomSentinel = ref<HTMLElement | null>(null)
const { visibleItems, windowStart } = useVirtualList(sessionEntries, topSentinel, bottomSentinel)
</script>

<template>
  <section v-if="activeSet && currentSession" class="space-y-6">
    <Card class="p-4 text-left" :glow="false">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{{ $t('flashcard.title') }}</span>
          <span class="text-xs text-ink-400 dark:text-ink-500 truncate">{{ activeSet.setName }}</span>
        </div>
        <span class="shrink-0 rounded-md bg-ink-100 dark:bg-ink-800 px-2 py-0.5 text-[10px] font-semibold text-ink-600 dark:text-ink-300">{{ totalItems }} 張</span>
      </div>
    </Card>

    <div class="space-y-6">
      <div ref="topSentinel" class="h-1" />
      <FlashcardView
        v-for="(entry, i) in visibleItems"
        :key="entry.item.id"
        :item="entry.item"
        :index="windowStart + i"
      />
      <div ref="bottomSentinel" class="h-1 -translate-y-4 shadow-none opacity-0" />
    </div>
  </section>
</template>
