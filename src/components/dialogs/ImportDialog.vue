<script setup>
import { ref, watch, nextTick } from 'vue'
import { ClipboardCopy } from 'lucide-vue-next'
import { useVocab } from '../../composables/useVocab.js'
import Dialog from '../ui/dialog/Dialog.vue'
import Textarea from '../ui/textarea/Textarea.vue'
import Button from '../ui/button/Button.vue'

const {
  importOpen,
  importStep,
  importWords,
  importJson,
  importPreview,
  importError,
  closeImport,
  copyImportPrompt,
  nextImportStep,
  importSet,
} = useVocab()

const importTextarea = ref(null)

watch([importOpen, importStep], () => {
  if (importOpen.value) {
    nextTick(() => {
      importTextarea.value?.focus()
    })
  }
})
</script>

<template>
  <Dialog
    :open="importOpen"
    title="新增單字集"
    :description="importStep === 1 ? '第一步：輸入你想特訓的英文單字列表並複製 AI 提示詞。' : '第二步：貼上 AI 回覆的 JSON 格式即可完成匯入。'"
    @close="closeImport"
  >
    <div v-if="importStep === 1" class="space-y-5">
      <div class="flex flex-col gap-1.5 w-full text-left">
        <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          請輸入單字列表（支援每行一個，可附帶中文註記）
        </label>
        <Textarea
          ref="importTextarea"
          v-model="importWords"
          :rows="8"
          class="font-mono text-sm leading-relaxed"
          placeholder="apple - 蘋果&#10;banana - 香蕉&#10;car"
        />
      </div>

      <div class="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-500/5 p-4 text-left">
        <p class="text-xs font-bold text-indigo-700 dark:text-indigo-400">如何使用 AI 產生單字集？</p>
        <p class="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400 font-medium">
          點擊「複製 AI 指令」，貼入任意 AI 平台（例如 ChatGPT / Claude / Gemini），AI 將為您生成詞彙例句與挖空選擇題。得到回覆後點擊下一步貼入即可。
        </p>
      </div>

      <div class="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
        <Button variant="outline" @click="closeImport">取消</Button>
        <Button variant="outline" class="gap-2" @click="copyImportPrompt">
          <ClipboardCopy class="h-4 w-4 text-indigo-500" />
          <span>複製 AI 指令</span>
        </Button>
        <Button variant="default" @click="nextImportStep">下一步</Button>
      </div>
    </div>

    <div v-else-if="importStep === 2" class="space-y-5">
      <div class="flex flex-col gap-1.5 w-full text-left">
        <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          請貼上 AI 產生的 JSON 資料
        </label>
        <Textarea
          ref="importTextarea"
          v-model="importJson"
          :rows="8"
          class="font-mono text-xs leading-relaxed"
          placeholder='{"items":[{"word":"abandon","meaning":"放棄；遺棄","example":"He decided to abandon the plan after the cost doubled.","question":{"prompt":"The captain had to _____ the ship during the storm.","opts":["abandon","delay","gather","repair"],"ans":0}}]}'
        />
      </div>

      <p v-if="importPreview" class="rounded-xl bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold text-left">
        {{ importPreview }}
      </p>
      <p v-if="importError" class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold text-left">
        格式錯誤：{{ importError }}
      </p>

      <div class="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
        <Button variant="outline" @click="importStep = 1">上一步</Button>
        <Button variant="default" :disabled="!importPreview" @click="importSet">套用與編輯名稱</Button>
      </div>
    </div>
  </Dialog>
</template>
