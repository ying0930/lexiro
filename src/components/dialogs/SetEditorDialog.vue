<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { useSetsStore } from '@/stores/sets'
import Button from '../ui/button/Button.vue'
import Dialog from '../ui/dialog/Dialog.vue'
import Input from '../ui/input/Input.vue'
import Textarea from '../ui/textarea/Textarea.vue'

const {
  setEditorOpen,
  setEditorMode,
  setEditorName,
  setEditorDraftItems,
  setEditorError,
  closeSetEditor,
  removeEditorItem,
  addEditorItem,
  saveSetEditor,
} = useSetsStore()
</script>

<template>
  <Dialog
    :open="setEditorOpen"
    :title="setEditorMode === 'create' ? $t('editor.create') : $t('editor.edit')"
    :description="setEditorMode === 'create' ? $t('editor.create') : $t('editor.edit')"
    width-class="max-w-4xl"
    @close="closeSetEditor"
  >
    <div class="space-y-5">
      <!-- Set Name Field -->
      <div class="flex flex-col gap-1.5 w-full text-left">
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">{{ $t('editor.setName') }}</label>
        <Input v-model="setEditorName" :placeholder="$t('editor.setName')" />
      </div>

      <!-- Editable Items Scroll Panel -->
      <div v-if="setEditorMode === 'edit'" class="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
        <div
          v-for="(item, itemIndex) in setEditorDraftItems"
          :key="item.id"
          class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-900/40 p-5 text-left relative overflow-hidden"
        >
          <!-- Glow background overlay for premium feel -->
          <div class="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/5 blur-3xl dark:hidden" aria-hidden="true" />

          <div class="relative z-10 flex items-center justify-between gap-4 pb-3 border-b border-ink-200/50 dark:border-ink-800/50">
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
              {{ $t('editor.word') }} {{ itemIndex + 1 }}
            </p>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              @click="removeEditorItem(itemIndex)"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>

          <!-- Editor fields grid -->
          <div class="relative z-10 mt-4 grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5 w-full text-left">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{{ $t('editor.word') }}</label>
              <Input v-model="item.word" :placeholder="$t('editor.word')" />
            </div>
            <div class="flex flex-col gap-1.5 w-full text-left">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{{ $t('editor.pos') }}</label>
              <Input v-model="item.pos" :placeholder="$t('editor.pos')" />
            </div>
            <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{{ $t('editor.meaning') }}</label>
              <Textarea v-model="item.meaning" :rows="2" :placeholder="$t('editor.meaning')" />
            </div>
            <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{{ $t('editor.example') }}</label>
              <Textarea v-model="item.example" :rows="2" :placeholder="$t('editor.example')" />
            </div>
            <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{{ $t('editor.questionPrompt') }}</label>
              <Textarea v-model="item.question.prompt" :rows="2" :placeholder="$t('editor.questionPrompt')" />
            </div>
          </div>

          <!-- Quiz options grid -->
          <div class="relative z-10 mt-4 grid gap-3 sm:grid-cols-2">
            <div v-for="(_, optionIndex) in item.question.opts" :key="`${item.id}-option-${optionIndex}`" class="flex flex-col gap-1.5 w-full text-left">
              <label class="text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">{{ $t('editor.option', { index: optionIndex + 1 }) }}</label>
              <Input v-model="item.question.opts[optionIndex]" :placeholder="$t('editor.option', { index: optionIndex + 1 })" />
            </div>
          </div>

          <!-- Right Answer Selector buttons -->
          <div class="relative z-10 mt-4 flex flex-wrap gap-2 items-center">
            <span class="text-xs font-semibold text-ink-500 dark:text-ink-400 mr-2">{{ $t('editor.correctOption') }}</span>
            <button
              v-for="answerIndex in 4"
              :key="`${item.id}-answer-${answerIndex}`"
              type="button"
              class="rounded-xl border px-4 py-2 text-xs font-bold transition-all duration-200"
              :class="item.question.ans === answerIndex - 1 ? 'button-primary text-white dark:text-ink-950 shadow-md' : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-850'"
              @click="item.question.ans = answerIndex - 1"
            >
              {{ $t('editor.option', { index: answerIndex }) }}
            </button>
          </div>
        </div>

        <Button variant="outline" class="w-full gap-2 border-dashed py-3.5" @click="addEditorItem">
          <Plus class="h-4 w-4" />
          <span>{{ $t('editor.addWord') }}</span>
        </Button>
      </div>

      <p v-if="setEditorError" class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold text-left">
        ⚠️ {{ setEditorError }}
      </p>

      <div class="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
        <Button variant="outline" @click="closeSetEditor">
          {{ $t('editor.cancel') }}
        </Button>
        <Button variant="default" @click="saveSetEditor">
          {{ $t('editor.save') }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>
