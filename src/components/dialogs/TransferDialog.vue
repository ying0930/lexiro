<script setup lang="ts">
import { Cloud, Download, LogIn, LogOut, RefreshCw, Upload } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useBackupStore } from '@/stores/backup'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import Button from '../ui/button/Button.vue'
import Dialog from '../ui/dialog/Dialog.vue'
import DriveBackupSelector from './DriveBackupSelector.vue'
import ImportSettings from './ImportSettings.vue'

const uiStore = useUIStore()
const setsStore = useSetsStore()
const backupStore = useBackupStore()
const { transferOpen } = storeToRefs(uiStore)
const { closeTransfer } = uiStore

const { sets, exportSelectedIds, exportAllSelected, exportSelectedCount, exportSelectedWordCount, exportError } = storeToRefs(setsStore)
const { toggleExportAll, exportSelectedSetsToZip } = setsStore

const {
  zipImportInputKey,
  zipImportName,
  zipImportPreview,
  zipImportSets,
  zipImportError,
} = storeToRefs(backupStore)

const {
  driveConfigured,
  driveSignedIn,
  driveAccountLabel,
  driveBackupLoading,
  driveImportLoading,
  driveListLoading,
  driveError,
  driveImportPreview,
  driveImportSets,
} = storeToRefs(backupStore)
const { signInDrive, signOutDrive, backupToDrive, refreshDriveBackups, applyDriveImport, resetZipImportState, handleZipImportChange, applyZipImport } = backupStore
</script>

<template>
  <Dialog
    :open="transferOpen"
    :title="$t('backup.title')"
    :description="$t('backup.description')"
    width-class="max-w-3xl"
    @close="closeTransfer"
  >
    <div class="space-y-6">
      <!-- 1. Google Drive Section -->
      <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
              {{ $t('backup.driveSection') }}
            </p>
            <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">
              {{ $t('backup.driveDescription') }}
            </p>
            <p v-if="driveAccountLabel" class="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {{ driveAccountLabel }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button v-if="!driveSignedIn" variant="outline" size="sm" class="bg-white dark:bg-ink-900" :disabled="!driveConfigured" @click="signInDrive">
              <LogIn class="h-4 w-4" />
              <span>{{ $t('backup.signIn') }}</span>
            </Button>
            <Button v-else variant="outline" size="sm" class="bg-white dark:bg-ink-900" @click="signOutDrive">
              <LogOut class="h-4 w-4" />
              <span>{{ $t('backup.signOut') }}</span>
            </Button>
          </div>
        </div>

        <p v-if="!driveConfigured" class="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 font-semibold">
          {{ $t('backup.driveNotConfigured') }}
        </p>
        <p v-if="driveError" class="mt-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold">
          {{ driveError }}
        </p>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <Button
            variant="default"
            :disabled="!sets.length || !driveConfigured"
            :loading="driveBackupLoading"
            class="gap-2"
            @click="backupToDrive"
          >
            <Cloud class="h-4 w-4" />
            <span>{{ $t('backup.backupToDrive') }}</span>
          </Button>
          <Button
            variant="outline"
            :disabled="!driveConfigured"
            :loading="driveListLoading"
            class="gap-2 bg-white dark:bg-ink-900"
            @click="refreshDriveBackups"
          >
            <RefreshCw class="h-4 w-4" />
            <span>{{ $t('backup.loadDriveBackups') }}</span>
          </Button>
        </div>

        <!-- Custom Dropdown Selector -->
        <DriveBackupSelector />

        <p v-if="driveImportPreview" class="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          {{ driveImportPreview }}
        </p>

        <!-- Google Drive Import Settings -->
        <ImportSettings :sets="driveImportSets" prefix="drive" />

        <div class="mt-4 pt-4 border-t border-ink-200/50 dark:border-ink-800/50 flex justify-end">
          <Button
            variant="default"
            :disabled="!driveImportSets || !driveImportSets.length"
            :loading="driveImportLoading"
            class="gap-2"
            @click="applyDriveImport"
          >
            <Upload class="h-4 w-4" />
            <span>{{ $t('backup.applyDriveImport') }}</span>
          </Button>
        </div>
      </div>

      <!-- 2. Import ZIP Section -->
      <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
              {{ $t('backup.importZip') }}
            </p>
            <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">
              {{ $t('backup.importZipDescription') }}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="h-8 px-3 text-xs bg-white dark:bg-ink-900"
            :disabled="!zipImportPreview && !zipImportError && !zipImportName"
            @click="resetZipImportState"
          >
            {{ $t('backup.clear') }}
          </Button>
        </div>

        <div class="mt-4 space-y-2">
          <input
            :key="zipImportInputKey"
            type="file"
            accept=".zip"
            class="block w-full text-sm text-ink-500 file:mr-4 file:rounded-xl file:border-0 file:bg-ink-950 dark:file:bg-ink-50 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white dark:file:text-ink-950 file:transition-all file:cursor-pointer hover:file:opacity-90 file:active:scale-95"
            @change="handleZipImportChange"
          >
          <p v-if="zipImportName" class="text-xs text-ink-400 dark:text-ink-500 font-bold">
            {{ $t('backup.selectedFile', { name: zipImportName }) }}
          </p>
        </div>

        <p v-if="zipImportPreview" class="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          {{ zipImportPreview }}
        </p>
        <p v-if="zipImportError" class="mt-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-semibold">
          {{ zipImportError }}
        </p>

        <!-- ZIP Import Settings -->
        <ImportSettings :sets="zipImportSets" prefix="zip" />

        <div class="mt-4 pt-4 border-t border-ink-200/50 dark:border-ink-800/50 flex justify-end">
          <Button variant="default" :disabled="!zipImportSets || !zipImportSets.length" class="gap-2" @click="applyZipImport">
            <Upload class="h-4 w-4" />
            <span>{{ $t('backup.applyImport') }}</span>
          </Button>
        </div>
      </div>

      <!-- 3. Export Section -->
      <div class="rounded-2xl border border-ink-200 dark:border-ink-800 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
              {{ $t('backup.exportSection') }}
            </p>
            <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">
              {{ $t('backup.exportDescription') }}
            </p>
          </div>
          <Button variant="outline" size="sm" class="h-8 px-3 text-xs bg-white dark:bg-ink-900" :disabled="!sets.length" @click="toggleExportAll">
            {{ exportAllSelected ? $t('backup.deselectAll') : $t('backup.selectAll') }}
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
            >
            <div class="text-left">
              <p class="text-sm font-bold text-ink-900 dark:text-ink-100">{{ set.setName }}</p>
              <p class="text-[11px] text-ink-400 dark:text-ink-500 font-semibold">{{ $t('home.wordsCount', { count: set.items.length }) }}</p>
            </div>
          </label>
        </div>
        <p v-else class="mt-4 text-xs text-ink-400 dark:text-ink-500 font-semibold">
          {{ $t('home.emptyState') }}
        </p>

        <div class="mt-4 pt-4 border-t border-ink-200/50 dark:border-ink-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p v-if="sets.length" class="text-xs text-ink-500 dark:text-ink-400 font-medium text-left">
            {{ $t('backup.exported', { count: exportSelectedCount }) }}（{{ $t('home.wordsCount', { count: exportSelectedWordCount }) }}）
          </p>
          <p v-else />
          <Button variant="default" :disabled="!exportSelectedCount" class="gap-2" @click="exportSelectedSetsToZip">
            <Download class="h-4 w-4" />
            <span>{{ $t('backup.downloadZip') }}</span>
          </Button>
        </div>

        <p v-if="exportError" class="mt-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 px-4 py-2 text-xs text-red-600 dark:text-red-400 font-semibold">
          {{ exportError }}
        </p>
      </div>
    </div>
  </Dialog>
</template>
