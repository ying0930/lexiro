<script setup lang="ts">
import { FileQuestion, Plus, Upload } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import SetCard from './SetCard.vue'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'

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
    <!-- Top Toolbar -->
    <div v-if="hasSets" class="flex flex-wrap items-center justify-end gap-3 mb-2">
      <Button variant="outline" class="gap-2 px-5 py-2.5" @click="openTransfer">
        <Upload class="h-4 w-4" />
        <span>{{ $t('home.backupAndImport') }}</span>
      </Button>
      <Button variant="default" class="gap-2 px-6 py-2.5" @click="openImport">
        <Plus class="h-4 w-4" />
        <span>{{ $t('home.addSet') }}</span>
      </Button>
    </div>

    <!-- Empty State Canonical Panel -->
    <div v-if="!hasSets" class="py-16">
      <Card class="max-w-2xl mx-auto my-8 p-12 text-center flex flex-col items-center justify-center space-y-6" :glow="true">
        <span class="flex h-16 w-16 items-center justify-center rounded-3xl bg-ink-950 text-white dark:bg-ink-50 dark:text-ink-950 shadow-xl" aria-hidden="true">
          <FileQuestion class="h-7 w-7" />
        </span>
        <div class="space-y-2 max-w-md">
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">
            {{ $t('home.title') }}
          </h2>
          <p class="text-sm leading-relaxed text-ink-500 dark:text-ink-400">
            {{ $t('home.description') }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
          <Button variant="default" class="gap-2 px-8 py-3" @click="openImport">
            <Plus class="h-4 w-4" />
            <span>{{ $t('home.addSet') }}</span>
          </Button>
          <Button variant="outline" class="gap-2 px-8 py-3" @click="openTransfer">
            <Upload class="h-4 w-4" />
            <span>{{ $t('home.backupAndImport') }}</span>
          </Button>
        </div>
      </Card>
    </div>

    <!-- Set Cards List -->
    <div v-else class="grid gap-6 md:grid-cols-2">
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
