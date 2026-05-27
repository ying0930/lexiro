<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useVirtualList } from '@/lib/useVirtualList'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import FlashcardView from './FlashcardView.vue'
import Badge from './ui/badge/Badge.vue'
import Card from './ui/card/Card.vue'

const { activeSet } = storeToRefs(useSetsStore())
const { currentSession, sessionEntries, totalItems } = storeToRefs(useSessionStore())

const topSentinel = ref<HTMLElement | null>(null)
const bottomSentinel = ref<HTMLElement | null>(null)
const { visibleItems, windowStart } = useVirtualList(sessionEntries, topSentinel, bottomSentinel)
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
