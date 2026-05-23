<script setup>
import { Upload, Plus, FileQuestion } from 'lucide-vue-next'
import { useVocab } from '../composables/useVocab.js'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'
import SetCard from './SetCard.vue'

const {
  hasSets,
  sets,
  openTransfer,
  openImport,
  isSetInProgress,
  startFlashcards,
  openPracticeDialog,
  requestDelete,
  openSetEditor,
} = useVocab()
</script>

<template>
  <section class="space-y-6">
    <!-- Top Toolbar -->
    <div v-if="hasSets" class="flex flex-wrap items-center justify-end gap-3 mb-2">
      <Button variant="outline" @click="openTransfer" class="gap-2 px-5 py-2.5">
        <Upload class="h-4 w-4" />
        <span>備份與匯入</span>
      </Button>
      <Button variant="default" @click="openImport" class="gap-2 px-6 py-2.5">
        <Plus class="h-4 w-4" />
        <span>新增單字集</span>
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
            尚未載入單字集
          </h2>
          <p class="text-sm leading-relaxed text-ink-500 dark:text-ink-400">
            您可以點擊 <strong class="font-bold text-emerald-600 dark:text-emerald-400">新增單字集</strong> 按鈕，或匯入之前生成過的單字集。
          </p>
        </div>
        
        <div class="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
          <Button variant="default" @click="openImport" class="gap-2 px-8 py-3">
            <Plus class="h-4 w-4" />
            <span>新增單字集</span>
          </Button>
          <Button variant="outline" @click="openTransfer" class="gap-2 px-8 py-3">
            <Upload class="h-4 w-4" />
            <span>備份與匯入</span>
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
