<script setup>
import { ref, computed, nextTick } from 'vue'
import { Cloud, Download, LogIn, LogOut, RefreshCw, Upload } from 'lucide-vue-next'
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
  importMode,
  duplicateSummary,
  importVersionDiffs,
  importVersionChoices,
  driveConfigured,
  driveSignedIn,
  driveAccountLabel,
  driveBackupLoading,
  driveImportLoading,
  driveListLoading,
  driveError,
  driveBackups,
  driveSelectedFileId,
  driveImportPreview,
  driveImportSets,
  closeTransfer,
  toggleExportAll,
  exportSelectedSetsToZip,
  resetZipImportState,
  handleZipImportChange,
  applyZipImport,
  signInDrive,
  signOutDrive,
  backupSelectedSetsToDrive,
  refreshDriveBackups,
  selectDriveBackup,
  applyDriveImport,
  setImportVersionChoice,
} = useVocab()

const dropdownOpen = ref(false)
const triggerRef = ref(null)
const dropdownStyle = ref({})

const selectedBackupLabel = computed(() => {
  const selected = driveBackups.value.find(file => file.id === driveSelectedFileId.value)
  if (!selected) return '請選擇備份檔'
  return `${selected.name} · ${new Date(selected.createdTime).toLocaleString()}`
})

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    nextTick(() => {
      if (triggerRef.value) {
        const rect = triggerRef.value.getBoundingClientRect()
        dropdownStyle.value = {
          position: 'fixed',
          top: `${rect.bottom + 6}px`, // 6px gap below button
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          zIndex: 9999
        }
      }
    })
  }
}

function selectOption(id) {
  selectDriveBackup(id)
  dropdownOpen.value = false
}
</script>

<template>
  <Dialog
    :open="transferOpen"
    title="備份與匯入"
    description="下載 ZIP 離線備份 Wordmem 單字集，或手動備份到 Google Drive。"
    width-class="max-w-3xl"
    @close="closeTransfer"
  >
    <div class="space-y-6">
      <!-- Export Section -->
      <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">匯出 Wordmem 備份</p>
            <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">勾選想要存檔的單字集，下載 ZIP 或上傳到 Google Drive。</p>
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
            <span>下載 ZIP</span>
          </Button>
        </div>
        
        <p v-if="exportError" class="mt-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2 text-xs text-red-600 dark:text-red-400 font-semibold">
          {{ exportError }}
        </p>
      </div>

      <!-- Drive Section -->
      <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">Google Drive</p>
            <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">手動備份到 My Drive 的 Wordmem 資料夾，或從既有備份導入。</p>
            <p v-if="driveAccountLabel" class="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">{{ driveAccountLabel }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button v-if="!driveSignedIn" variant="outline" size="sm" class="bg-white dark:bg-ink-900" :disabled="!driveConfigured" @click="signInDrive">
              <LogIn class="h-4 w-4" />
              <span>登入 Google</span>
            </Button>
            <Button v-else variant="outline" size="sm" class="bg-white dark:bg-ink-900" @click="signOutDrive">
              <LogOut class="h-4 w-4" />
              <span>登出/切換帳號</span>
            </Button>
          </div>
        </div>

        <p v-if="!driveConfigured" class="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 font-semibold">
          尚未設定 VITE_GOOGLE_CLIENT_ID。設定 Google OAuth Client ID 後才能使用 Drive 備份。
        </p>
        <p v-if="driveError" class="mt-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold">
          {{ driveError }}
        </p>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <Button
            variant="default"
            :disabled="!exportSelectedCount || !driveConfigured"
            :loading="driveBackupLoading"
            class="gap-2"
            @click="backupSelectedSetsToDrive"
          >
            <Cloud class="h-4 w-4" />
            <span>備份到 Drive</span>
          </Button>
          <Button
            variant="outline"
            :disabled="!driveConfigured"
            :loading="driveListLoading"
            class="gap-2 bg-white dark:bg-ink-900"
            @click="refreshDriveBackups"
          >
            <RefreshCw class="h-4 w-4" />
            <span>讀取 Drive 備份</span>
          </Button>
        </div>

        <div v-if="driveBackups.length" class="mt-4 space-y-2">
          <label class="text-xs font-bold text-ink-500 dark:text-ink-400">選擇 Drive 備份</label>
          
          <!-- Custom Dropdown Selector -->
          <div class="relative">
            <button
              ref="triggerRef"
              type="button"
              class="w-full flex items-center justify-between rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 py-2.5 text-sm text-ink-900 dark:text-ink-100 outline-none focus:border-emerald-500 text-left transition-all hover:bg-ink-50 dark:hover:bg-ink-850"
              @click="toggleDropdown"
            >
              <span class="truncate pr-4">{{ selectedBackupLabel }}</span>
              <svg class="h-4 w-4 text-ink-400 dark:text-ink-500 transition-transform duration-200 shrink-0" :class="{ 'rotate-180': dropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Custom Options List (Teleported to body for highest z-index and no layout squeezing!) -->
            <Teleport to="body">
              <!-- Custom Click-Outside Overlay Catcher -->
              <div v-if="dropdownOpen" class="fixed inset-0 z-[9998] bg-transparent" @click="dropdownOpen = false"></div>

              <Transition
                enter-active-class="transition duration-100 ease-out"
                enter-from-class="opacity-0 scale-95 -translate-y-2"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition duration-75 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 -translate-y-2"
              >
                <div
                  v-if="dropdownOpen"
                  :style="dropdownStyle"
                  class="max-h-60 overflow-y-auto rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-2xl p-1.5 space-y-0.5 text-left panel"
                >
                  <!-- Default Placeholder Option -->
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
                    :class="!driveSelectedFileId ? 'bg-ink-100 dark:bg-ink-800 text-emerald-600 dark:text-emerald-400' : 'text-ink-50 hover:bg-ink-50 dark:hover:bg-ink-850'"
                    @click="selectOption('')"
                  >
                    請選擇備份檔
                  </button>

                  <!-- Drive Backup Options -->
                  <button
                    v-for="file in driveBackups"
                    :key="file.id"
                    type="button"
                    class="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex flex-col gap-0.5 border-l-2"
                    :class="driveSelectedFileId === file.id ? 'bg-ink-100 dark:bg-ink-800 text-ink-950 dark:text-ink-50 border-emerald-500' : 'border-transparent text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-850'"
                    @click="selectOption(file.id)"
                  >
                    <span class="font-bold text-ink-900 dark:text-ink-100 text-xs sm:text-sm">{{ file.name }}</span>
                    <span class="text-[10px] text-ink-400 dark:text-ink-500 font-semibold">{{ new Date(file.createdTime).toLocaleString() }}</span>
                  </button>
                </div>
              </Transition>
            </Teleport>
          </div>
        </div>

        <p v-if="driveImportPreview" class="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          {{ driveImportPreview }}
        </p>

        <div class="mt-4 pt-4 border-t border-ink-200/50 dark:border-ink-800/50 flex justify-end">
          <Button
            variant="default"
            :disabled="!driveImportSets || !driveImportSets.length"
            :loading="driveImportLoading"
            class="gap-2"
            @click="applyDriveImport"
          >
            <Upload class="h-4 w-4" />
            <span>從 Drive 導入</span>
          </Button>
        </div>
      </div>

      <!-- Import Options -->
      <div
        v-if="zipImportSets || driveImportSets || duplicateSummary"
        class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 text-left"
      >
        <p class="text-sm font-bold text-ink-950 dark:text-ink-50">導入設定</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-200 dark:border-ink-800 px-3 py-2 text-xs text-ink-600 dark:text-ink-300">
            <input v-model="importMode" type="radio" value="append" class="mt-0.5 h-4 w-4 accent-emerald-500" />
            <span><strong class="block text-ink-900 dark:text-ink-100">追加到本機</strong>同名單字集可逐一選擇版本。</span>
          </label>
          <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-200 dark:border-ink-800 px-3 py-2 text-xs text-ink-600 dark:text-ink-300">
            <input v-model="importMode" type="radio" value="overwrite" class="mt-0.5 h-4 w-4 accent-emerald-500" />
            <span><strong class="block text-ink-900 dark:text-ink-100">覆蓋本機</strong>取代本機資料並重設目前進度。</span>
          </label>
        </div>

        <div v-if="importMode === 'append' && importVersionDiffs.length" class="mt-4 space-y-3">
          <p class="text-xs font-bold text-ink-500 dark:text-ink-400">同名單字集版本差異</p>
          <div
            v-for="diff in importVersionDiffs"
            :key="diff.setName"
            class="rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950/40 p-4"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-sm font-bold text-ink-900 dark:text-ink-100">{{ diff.setName }}</p>
                <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  本機 {{ diff.localCount }} 個單字，匯入版本 {{ diff.importedCount }} 個單字
                </p>
              </div>
              <div class="grid gap-1 text-xs text-ink-600 dark:text-ink-300">
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    :name="`version-${diff.setName}`"
                    value="local"
                    :checked="importVersionChoices[diff.setName] !== 'imported'"
                    class="h-4 w-4 accent-emerald-500"
                    @change="setImportVersionChoice(diff.setName, 'local')"
                  />
                  <span>保留本機</span>
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    :name="`version-${diff.setName}`"
                    value="imported"
                    :checked="importVersionChoices[diff.setName] === 'imported'"
                    class="h-4 w-4 accent-emerald-500"
                    @change="setImportVersionChoice(diff.setName, 'imported')"
                  />
                  <span>使用匯入版本</span>
                </label>
              </div>
            </div>

            <div class="mt-3 grid gap-2 text-xs text-ink-500 dark:text-ink-400 sm:grid-cols-3">
              <p>
                <strong class="text-emerald-700 dark:text-emerald-400">新增</strong>
                {{ diff.added.length ? diff.added.slice(0, 5).join('、') : '無' }}<span v-if="diff.added.length > 5"> 等 {{ diff.added.length }} 個</span>
              </p>
              <p>
                <strong class="text-red-600 dark:text-red-400">移除</strong>
                {{ diff.removed.length ? diff.removed.slice(0, 5).join('、') : '無' }}<span v-if="diff.removed.length > 5"> 等 {{ diff.removed.length }} 個</span>
              </p>
              <p>
                <strong class="text-amber-700 dark:text-amber-300">修改</strong>
                {{ diff.changed.length ? diff.changed.slice(0, 5).join('、') : '無' }}<span v-if="diff.changed.length > 5"> 等 {{ diff.changed.length }} 個</span>
              </p>
            </div>
          </div>
        </div>

        <p v-if="duplicateSummary && (duplicateSummary.skippedByName.length || duplicateSummary.skippedByContent.length || duplicateSummary.renamedIds.length || duplicateSummary.replacedVersions.length)" class="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 font-semibold">
          <span v-if="duplicateSummary.skippedByName.length">保留本機版本：{{ duplicateSummary.skippedByName.join('、') }}。</span>
          <span v-if="duplicateSummary.replacedVersions.length">使用匯入版本更新：{{ duplicateSummary.replacedVersions.join('、') }}。</span>
          <span v-if="duplicateSummary.skippedByContent.length">偵測到重複內容：{{ duplicateSummary.skippedByContent.join('、') }}。</span>
          <span v-if="duplicateSummary.renamedIds.length">id 衝突已產生新 id：{{ duplicateSummary.renamedIds.map((item) => item.setName).join('、') }}。</span>
        </p>
      </div>

      <!-- Import Section -->
      <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">匯入 ZIP</p>
            <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">選擇由 Wordmem 生成的 ZIP 備份檔案。</p>
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
            <span>匯入此 ZIP</span>
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
</template>
