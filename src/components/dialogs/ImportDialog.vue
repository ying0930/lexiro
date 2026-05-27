<script setup lang="ts">
import { ClipboardCopy } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseImportJson } from '@/lib/import'
import { DIFFICULTY_PROMPTS } from '@/lib/difficulty-prompts'
import prompts from '@/lib/prompts'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import Button from '../ui/button/Button.vue'
import Dialog from '../ui/dialog/Dialog.vue'
import Textarea from '../ui/textarea/Textarea.vue'

const { t } = useI18n()

const setsStore = useSetsStore()
const uiStore = useUIStore()
const { importOpen, importStep, importWords, importJson, importError, importPreview, importDifficulty } = storeToRefs(setsStore)
const { closeImport, nextImportStep, importSet } = setsStore
const { showToast } = uiStore

const importTextarea = ref<InstanceType<typeof Textarea> | null>(null)

const difficultyLevels = ['', t('import.difficulty1'), t('import.difficulty2'), t('import.difficulty3'), t('import.difficulty4')] as const
const difficultyLabel = computed(() => difficultyLevels[importDifficulty.value])

watch([() => importOpen, () => importStep], () => {
  if (importOpen) {
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

async function copyToClipboard(text: string) {
  if (!navigator.clipboard?.writeText)
    throw new Error('clipboard unavailable')
  await navigator.clipboard.writeText(text)
}

function copyImportPrompt() {
  const prompt = prompts.generateWordSet
    .replace('{{WORDS}}', importWords.value)
    .replace('{{DIFFICULTY_PROMPT}}', DIFFICULTY_PROMPTS[importDifficulty.value])
    .replaceAll('{{DIFFICULTY_NUM}}', String(importDifficulty.value))
  copyToClipboard(prompt)
  showToast(t('import.copied'))
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
            max="4"
            step="1"
            class="w-full h-2 rounded-full appearance-none cursor-pointer bg-ink-200 dark:bg-ink-700 accent-indigo-500"
          >
          <span class="text-sm font-bold text-ink-800 dark:text-ink-200 min-w-[5rem] text-right">
            {{ difficultyLabel }}
          </span>
        </div>
      </div>

      <div class="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-500/5 p-4 text-left">
        <p class="text-xs font-bold text-indigo-700 dark:text-indigo-400">
          {{ $t('import.step2') }}
        </p>
        <p class="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400 font-medium">
          {{ $t('import.step2') }}
        </p>
      </div>

      <div class="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
        <Button variant="outline" @click="closeImport">
          {{ $t('editor.cancel') }}
        </Button>
        <Button variant="outline" class="gap-2" @click="copyImportPrompt">
          <ClipboardCopy class="h-4 w-4 text-indigo-500" />
          <span>{{ $t('import.copyPrompt') }}</span>
        </Button>
        <Button variant="default" @click="nextImportStep">
          {{ $t('import.nextStep') }}
        </Button>
      </div>
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
          placeholder="{&quot;items&quot;:[{&quot;word&quot;:&quot;abandon&quot;,&quot;meaning&quot;:&quot;放棄；遺棄&quot;,&quot;example&quot;:&quot;He decided to abandon the plan after the cost doubled.&quot;,&quot;question&quot;:{&quot;prompt&quot;:&quot;The captain had to _____ the ship during the storm.&quot;,&quot;opts&quot;:[&quot;abandon&quot;,&quot;delay&quot;,&quot;gather&quot;,&quot;repair&quot;],&quot;ans&quot;:0}}]}"
        />
      </div>

      <p v-if="importPreview" class="rounded-xl bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold text-left">
        {{ importPreview }}
      </p>
      <p v-if="importError" class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold text-left">
        {{ $t('import.jsonError') }}：{{ importError }}
      </p>

      <div class="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
        <Button variant="outline" @click="importStep = 1">
          {{ $t('editor.cancel') }}
        </Button>
        <Button variant="default" :disabled="!importPreview" @click="importSet">
          {{ $t('import.import') }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>
