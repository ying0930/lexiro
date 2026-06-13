<script setup lang="ts">
import { ClipboardCopy } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { copyToClipboard } from '@/lib/clipboard'
import { DIFFICULTY_PROMPTS } from '@/lib/difficulty-prompts'
import { parseImportJson } from '@/lib/import'
import prompts from '@/lib/prompts'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import Button from '../ui/button/Button.vue'
import DialogFooter from '../ui/dialog-footer/DialogFooter.vue'
import Dialog from '../ui/dialog/Dialog.vue'
import SectionPanel from '../ui/section-panel/SectionPanel.vue'
import StatusMessage from '../ui/status-message/StatusMessage.vue'
import Textarea from '../ui/textarea/Textarea.vue'

const { t } = useI18n()

const setsStore = useSetsStore()
const uiStore = useUIStore()
const { importOpen, importStep, importWords, importJson, importError, importPreview, importDifficulty } = storeToRefs(setsStore)
const { closeImport, nextImportStep, importSet } = setsStore
const { showToast } = uiStore

const importTextarea = ref<InstanceType<typeof Textarea> | null>(null)

const difficultyLevels = ['', t('import.difficulty1'), t('import.difficulty2'), t('import.difficulty3')] as const
const difficultyLabel = computed(() => difficultyLevels[importDifficulty.value])

watch([importOpen, importStep], ([open]) => {
  if (open) {
    nextTick(() => {
      importTextarea.value?.focus()
    })
  }
})

watch(importJson, (val) => {
  if (!val.trim()) {
    setsStore.importPreview = ''
    setsStore.importError = ''
    return
  }
  const result = parseImportJson(val.trim())
  if (result.valid) {
    setsStore.importPreview = t('import.jsonValid', { count: result.data.items.length })
    setsStore.importError = ''
  }
  else {
    setsStore.importPreview = ''
    setsStore.importError = result.error
  }
})

async function copyImportPrompt() {
  const prompt = prompts.generateWordSet
    .replace('{{WORDS}}', importWords.value)
    .replace('{{DIFFICULTY_PROMPT}}', DIFFICULTY_PROMPTS[importDifficulty.value])
    .replaceAll('{{DIFFICULTY_NUM}}', String(importDifficulty.value))
  try {
    await copyToClipboard(prompt)
    showToast(t('import.copied'))
  }
  catch {
    showToast(t('toast.copyFailed'))
  }
}
</script>

<template>
  <Dialog
    :open="importOpen"
    :title="$t('import.title')"
    :description="importStep === 1 ? $t('import.step1') : $t('import.step2')"
    @close="closeImport"
  >
    <div v-if="importStep === 1" class="space-y-5">
      <div class="flex flex-col gap-1.5 w-full text-left">
        <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          {{ $t('import.step1') }}
        </label>
        <Textarea
          ref="importTextarea"
          v-model="importWords"
          :rows="8"
          class="font-mono text-sm leading-relaxed"
          :placeholder="$t('import.wordPlaceholder')"
        />
      </div>

      <div class="flex flex-col gap-1.5 w-full text-left">
        <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          {{ $t('import.difficulty') }}
        </label>
        <div class="flex items-center gap-3">
          <input
            v-model.number="importDifficulty"
            type="range"
            min="1"
            max="3"
            step="1"
            class="w-full h-2 rounded-full appearance-none cursor-pointer bg-ink-200 dark:bg-ink-700 accent-accent-primary"
          >
          <span class="text-sm font-bold text-ink-800 dark:text-ink-200 min-w-[5rem] text-right">
            {{ difficultyLabel }}
          </span>
        </div>
      </div>

      <SectionPanel class="border-accent-primary/15 bg-accent-primary/10">
        <p class="text-xs font-bold text-accent-primary">
          {{ $t('import.step2') }}
        </p>
        <p class="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400 font-medium">
          {{ $t('import.step2Hint') }}
        </p>
      </SectionPanel>

      <DialogFooter>
        <Button variant="outline" @click="closeImport">
          {{ $t('editor.cancel') }}
        </Button>
        <Button variant="outline" class="gap-2" @click="copyImportPrompt">
          <ClipboardCopy class="h-4 w-4 text-accent-primary" />
          <span>{{ $t('import.copyPrompt') }}</span>
        </Button>
        <Button variant="default" @click="nextImportStep">
          {{ $t('import.nextStep') }}
        </Button>
      </DialogFooter>
    </div>

    <div v-else-if="importStep === 2" class="space-y-5">
      <div class="flex flex-col gap-1.5 w-full text-left">
        <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          {{ $t('import.importJson') }}
        </label>
        <Textarea
          ref="importTextarea"
          v-model="importJson"
          :rows="8"
          class="font-mono text-xs leading-relaxed"
          :placeholder="$t('import.jsonPlaceholder')"
        />
      </div>

      <StatusMessage v-if="importPreview" tone="success">
        {{ importPreview }}
      </StatusMessage>
      <StatusMessage v-if="importError" tone="error">
        {{ $t('import.jsonError') }}：{{ importError }}
      </StatusMessage>

      <DialogFooter>
        <Button variant="outline" @click="importStep = 1">
          {{ $t('editor.cancel') }}
        </Button>
        <Button variant="default" :disabled="!importPreview" @click="importSet">
          {{ $t('import.import') }}
        </Button>
      </DialogFooter>
    </div>
  </Dialog>
</template>
