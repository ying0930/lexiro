<script setup>
import { Trash2, Plus } from 'lucide-vue-next'
import { useVocab } from '../../composables/useVocab.js'
import Dialog from '../ui/dialog/Dialog.vue'
import Input from '../ui/input/Input.vue'
import Textarea from '../ui/textarea/Textarea.vue'
import Button from '../ui/button/Button.vue'

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
} = useVocab()
</script>

<template>
  <Dialog
    :open="setEditorOpen"
    :title="setEditorMode === 'create' ? '建立單字集' : '編輯單字集'"
    :description="setEditorMode === 'create' ? '為您剛載入的單字建立名稱並套用。' : '直接修改單字、詞性、中文意思、例句及選擇題。'"
    width-class="max-w-4xl"
    @close="closeSetEditor"
  >
    <div class="space-y-5">
      <!-- Set Name Field -->
      <div class="flex flex-col gap-1.5 w-full text-left">
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">單字集名稱</label>
        <Input v-model="setEditorName" placeholder="例如：核心高頻單字 Level 1" />
      </div>

      <!-- Editable Items Scroll Panel -->
      <div v-if="setEditorMode === 'edit'" class="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
        <div
          v-for="(item, itemIndex) in setEditorDraftItems"
          :key="item.id"
          class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-900/40 p-5 text-left relative overflow-hidden"
        >
          <!-- Glow background overlay for premium feel -->
          <div class="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/5 blur-3xl dark:hidden" aria-hidden="true"></div>

          <div class="relative z-10 flex items-center justify-between gap-4 pb-3 border-b border-ink-200/50 dark:border-ink-800/50">
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">第 {{ itemIndex + 1 }} 個單字</p>
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
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">英文單字</label>
              <Input v-model="item.word" placeholder="英文單字" />
            </div>
            <div class="flex flex-col gap-1.5 w-full text-left">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">單字詞性</label>
              <Input v-model="item.pos" placeholder="詞性縮寫，例如 n. / v." />
            </div>
            <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">中文意思</label>
              <Textarea v-model="item.meaning" :rows="2" placeholder="輸入中文意思" />
            </div>
            <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">例句（若包含該單字則會自動用於拼字測試）</label>
              <Textarea v-model="item.example" :rows="2" placeholder="例句" />
            </div>
            <div class="flex flex-col gap-1.5 w-full text-left sm:col-span-2">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">選擇題幹（以 _____ 作為挖空）</label>
              <Textarea v-model="item.question.prompt" :rows="2" placeholder="填入題幹" />
            </div>
          </div>

          <!-- Quiz options grid -->
          <div class="relative z-10 mt-4 grid gap-3 sm:grid-cols-2">
            <div v-for="(option, optionIndex) in item.question.opts" :key="`${item.id}-option-${optionIndex}`" class="flex flex-col gap-1.5 w-full text-left">
              <label class="text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">選項 {{ optionIndex + 1 }}</label>
              <Input v-model="item.question.opts[optionIndex]" :placeholder="`選項 {{ optionIndex + 1 }}`" />
            </div>
          </div>

          <!-- Right Answer Selector buttons -->
          <div class="relative z-10 mt-4 flex flex-wrap gap-2 items-center">
            <span class="text-xs font-semibold text-ink-500 dark:text-ink-400 mr-2">設定正解為：</span>
            <button
              v-for="answerIndex in 4"
              :key="`${item.id}-answer-${answerIndex}`"
              type="button"
              class="rounded-xl border px-4 py-2 text-xs font-bold transition-all duration-200"
              :class="item.question.ans === answerIndex - 1 ? 'button-primary text-white dark:text-ink-950 shadow-md' : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-850'"
              @click="item.question.ans = answerIndex - 1"
            >
              選項 {{ answerIndex }}
            </button>
          </div>
        </div>

        <Button variant="outline" class="w-full gap-2 border-dashed py-3.5" @click="addEditorItem">
          <Plus class="h-4 w-4" />
          <span>新增一個單字欄位</span>
        </Button>
      </div>

      <p v-if="setEditorError" class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold text-left">
        ⚠️ {{ setEditorError }}
      </p>

      <div class="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
        <Button variant="outline" @click="closeSetEditor">取消</Button>
        <Button variant="default" @click="saveSetEditor">{{ setEditorMode === 'create' ? '套用與儲存' : '儲存修改' }}</Button>
      </div>
    </div>
  </Dialog>
</template>
