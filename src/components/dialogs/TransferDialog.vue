<script setup>
import { Download, Upload } from 'lucide-vue-next'
import { useVocab } from '../../composables/useVocab.js'
import Dialog from '../ui/dialog/Dialog.vue'
import Button from '../ui/button/Button.vue'

const {
  transferOpen,
  sets,
  exportSelectedIds,
  exportAllSelected,
  exportSelectedCount,
  exportSelectedWordCount,
  exportError,
  zipImportInputKey,
  zipImportName,
  zipImportPreview,
  zipImportError,
  zipImportSets,
  closeTransfer,
  toggleExportAll,
  exportSelectedSetsToZip,
  resetZipImportState,
  handleZipImportChange,
  applyZipImport,
} = useVocab()
</script>

<template>
  <Dialog
    :open="transferOpen"
    title="備份與數據匯入"
    description="下載 ZIP 以離線備份您的單字集，或自 ZIP 檔案快速恢復數據。"
    width-class="max-w-3xl"
    @close="closeTransfer"
  >
    <div class="space-y-6">
      <!-- Export Section -->
      <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">匯出單字集備份</p>
            <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">勾選想要存檔的單字集，點擊右下按鈕導出。</p>
          </div>
          <Button variant="outline" size="sm" class="h-8 px-3 text-xs bg-white dark:bg-ink-900" :disabled="!sets.length" @click="toggleExportAll">
            {{ exportAllSelected ? '取消全選' : '全選' }}
          </Button>
        </div>

        <div v-if="sets.length" class="mt-4 grid gap-2.5 max-h-48 overflow-y-auto pr-1">
          <label
            v-for="set in sets"
            :key="set.id"
            class="flex items-center gap-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 py-2.5 cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-850"
          >
            <input
              v-model="exportSelectedIds"
              type="checkbox"
              :value="set.id"
              class="h-4 w-4 accent-emerald-500 rounded border-ink-300"
            />
            <div class="text-left">
              <p class="text-sm font-bold text-ink-900 dark:text-ink-100">{{ set.setName }}</p>
              <p class="text-[11px] text-ink-400 dark:text-ink-500 font-semibold">{{ set.items.length }} 個單字</p>
            </div>
          </label>
        </div>
        <p v-else class="mt-4 text-xs text-ink-400 dark:text-ink-500 font-semibold">尚無任何單字集可供匯出。</p>

        <div class="mt-4 pt-4 border-t border-ink-200/50 dark:border-ink-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p v-if="sets.length" class="text-xs text-ink-500 dark:text-ink-400 font-medium text-left">
            已勾選 {{ exportSelectedCount }} 個單字集，包含 {{ exportSelectedWordCount }} 個單字。
          </p>
          <p v-else></p>
          <Button variant="default" :disabled="!exportSelectedCount" @click="exportSelectedSetsToZip" class="gap-2">
            <Download class="h-4 w-4" />
            <span>匯出 ZIP 封包</span>
          </Button>
        </div>
        
        <p v-if="exportError" class="mt-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2 text-xs text-red-600 dark:text-red-400 font-semibold">
          {{ exportError }}
        </p>
      </div>

      <!-- Import Section -->
      <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">匯入 ZIP 封包</p>
            <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">選擇由本平台生成的 ZIP 備份檔案，恢復學習進度。</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="h-8 px-3 text-xs bg-white dark:bg-ink-900"
            :disabled="!zipImportPreview && !zipImportError && !zipImportName"
            @click="resetZipImportState"
          >
            清除
          </Button>
        </div>

        <div class="mt-4 space-y-2">
          <input
            :key="zipImportInputKey"
            type="file"
            accept=".zip"
            class="block w-full text-sm text-ink-500 file:mr-4 file:rounded-xl file:border-0 file:bg-ink-950 dark:file:bg-ink-50 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white dark:file:text-ink-950 file:transition-all file:cursor-pointer hover:file:opacity-90 file:active:scale-95"
            @change="handleZipImportChange"
          />
          <p v-if="zipImportName" class="text-xs text-ink-400 dark:text-ink-500 font-bold">已選擇檔案：{{ zipImportName }}</p>
        </div>

        <p v-if="zipImportPreview" class="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          {{ zipImportPreview }}
        </p>
        <p v-if="zipImportError" class="mt-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold">
          {{ zipImportError }}
        </p>

        <div class="mt-4 pt-4 border-t border-ink-200/50 dark:border-ink-800/50 flex justify-end">
          <Button variant="default" :disabled="!zipImportSets || !zipImportSets.length" @click="applyZipImport" class="gap-2">
            <Upload class="h-4 w-4" />
            <span>匯入此封包</span>
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
</template>
