<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import FlashcardView from './FlashcardView.vue'

const { activeSet } = storeToRefs(useSetsStore())
const { currentSession, sessionEntries } = storeToRefs(useSessionStore())

const orderedEntries = computed(() => [...sessionEntries.value].sort((left, right) => left.originalIndex - right.originalIndex))
</script>

<template>
  <section v-if="activeSet && currentSession" class="space-y-6">
    <FlashcardView
      v-for="entry in orderedEntries"
      :key="entry.originalIndex"
      :item="entry.item"
      :index="entry.originalIndex"
    />
  </section>
</template>
