<script setup lang="ts">
import { FileQuestion, Plus, Upload } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import SetCard from './SetCard.vue'
import Button from './ui/button/Button.vue'
import EmptyState from './ui/empty-state/EmptyState.vue'

const setsStore = useSetsStore()
const sessionStore = useSessionStore()
const uiStore = useUIStore()
const { hasSets, sets } = storeToRefs(setsStore)
const { isSetInProgress, requestDelete, openSetEditor, openImport } = setsStore
const { startFlashcards, openPracticeDialog } = sessionStore
const { openTransfer } = uiStore
</script>

<template>
  <section class="space-y-6">
    <div v-if="!hasSets" class="py-8">
      <EmptyState :title="$t('home.title')" :description="$t('home.description')">
        <template #icon>
          <FileQuestion class="h-7 w-7" />
        </template>
        <template #actions>
          <Button variant="default" size="lg" class="w-full gap-2 sm:w-auto" @click="openImport">
            <Plus class="h-4 w-4" />
            <span>{{ $t('home.addSet') }}</span>
          </Button>
          <Button variant="outline" size="lg" class="w-full gap-2 sm:w-auto" @click="openTransfer">
            <Upload class="h-4 w-4 text-accent-primary" />
            <span>{{ $t('home.backupAndImport') }}</span>
          </Button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <SetCard
        v-for="set in sets"
        :key="set.id"
        :set="set"
        :active="isSetInProgress(set.id)"
        @flashcards="startFlashcards"
        @quiz="openPracticeDialog('quiz', $event)"
        @spelling="openPracticeDialog('spelling', $event)"
        @delete="requestDelete"
        @edit="openSetEditor('edit', sets.find((item) => item.id === $event))"
      />
    </div>
  </section>
</template>
