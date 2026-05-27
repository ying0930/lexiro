<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useVirtualList } from '@/lib/useVirtualList'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import FlashcardView from './FlashcardView.vue'

const { activeSet } = storeToRefs(useSetsStore())
const { currentSession, sessionEntries } = storeToRefs(useSessionStore())

const topSentinel = ref<HTMLElement | null>(null)
const bottomSentinel = ref<HTMLElement | null>(null)
const { visibleItems, windowStart } = useVirtualList(sessionEntries, topSentinel, bottomSentinel)
</script>

<template>
  <section v-if="activeSet && currentSession" class="space-y-6">
    <div ref="topSentinel" class="h-1" />
    <FlashcardView
      v-for="(entry, i) in visibleItems"
      :key="entry.item.id"
      :item="entry.item"
      :index="windowStart + i"
    />
    <div ref="bottomSentinel" class="h-1 -translate-y-4 shadow-none opacity-0" />
  </section>
</template>
