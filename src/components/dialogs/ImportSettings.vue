<script setup lang="ts">
import type { ImportMode, VocabSet } from '@/types'
import { Settings2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSetsStore } from '@/stores/sets'
import Button from '../ui/button/Button.vue'
import DialogFooter from '../ui/dialog-footer/DialogFooter.vue'
import Dialog from '../ui/dialog/Dialog.vue'
import StatusMessage from '../ui/status-message/StatusMessage.vue'

defineProps<{
  sets: VocabSet[] | null
  prefix: string
}>()

const setsStore = useSetsStore()
const { importMode, importVersionDiffs, importVersionChoices, duplicateSummary } = storeToRefs(setsStore)
const { setImportVersionChoice } = setsStore
const { t } = useI18n()
const settingsOpen = ref(false)

const modeSummary = computed(() => {
  if (importMode.value === 'overwrite')
    return t('backup.modeSummaryOverwrite')
  if (importVersionDiffs.value.length)
    return t('backup.modeSummaryAppendWithConflicts', { count: importVersionDiffs.value.length })
  return t('backup.modeSummaryAppend')
})

function previewNames(names: string[]) {
  if (!names.length)
    return t('backup.none')
  const preview = names.slice(0, 5).join('、')
  return names.length > 5 ? `${preview} ${t('backup.moreItems', { count: names.length })}` : preview
}

function selectMode(mode: ImportMode) {
  importMode.value = mode
}
</script>

<template>
  <div v-if="sets && sets.length" class="mt-4 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 py-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="text-left">
        <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
          {{ $t('backup.importSettings') }}
        </p>
        <p class="mt-1 text-xs font-medium text-ink-500 dark:text-ink-400">
          {{ modeSummary }}
        </p>
      </div>
      <Button variant="outline" size="sm" class="shrink-0 gap-2 bg-white dark:bg-ink-900" @click="settingsOpen = true">
        <Settings2 class="h-4 w-4" />
        <span>{{ $t('backup.configureImport') }}</span>
      </Button>
    </div>

    <StatusMessage v-if="duplicateSummary && (duplicateSummary.skippedByName.length || duplicateSummary.skippedByContent.length || duplicateSummary.renamedIds.length || duplicateSummary.replacedVersions.length)" tone="warning" class="mt-3">
      <span v-if="duplicateSummary.skippedByName.length">{{ $t('backup.summaryKeepLocal', { names: duplicateSummary.skippedByName.join('、') }) }}</span>
      <span v-if="duplicateSummary.replacedVersions.length">{{ $t('backup.summaryUseImported', { names: duplicateSummary.replacedVersions.join('、') }) }}</span>
      <span v-if="duplicateSummary.skippedByContent.length">{{ $t('backup.summaryDuplicateContent', { names: duplicateSummary.skippedByContent.join('、') }) }}</span>
      <span v-if="duplicateSummary.renamedIds.length">{{ $t('backup.summaryRenamedIds', { names: duplicateSummary.renamedIds.map((item) => item.setName).join('、') }) }}</span>
    </StatusMessage>

    <Dialog
      :open="settingsOpen"
      :title="$t('backup.importSettingsTitle')"
      :description="$t('backup.importSettingsDescription')"
      width-class="max-w-2xl"
      @close="settingsOpen = false"
    >
      <div class="space-y-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            class="rounded-2xl border p-4 text-left transition-all"
            :class="importMode === 'append' ? 'border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/20' : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 hover:bg-ink-50 dark:hover:bg-ink-850'"
            @click="selectMode('append')"
          >
            <span class="block text-sm font-extrabold text-ink-950 dark:text-ink-50">{{ $t('backup.append') }}</span>
            <span class="mt-1 block text-xs leading-relaxed text-ink-500 dark:text-ink-400">{{ $t('backup.appendPlainDescription') }}</span>
          </button>
          <button
            type="button"
            class="rounded-2xl border p-4 text-left transition-all"
            :class="importMode === 'overwrite' ? 'border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/20' : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 hover:bg-ink-50 dark:hover:bg-ink-850'"
            @click="selectMode('overwrite')"
          >
            <span class="block text-sm font-extrabold text-ink-950 dark:text-ink-50">{{ $t('backup.overwrite') }}</span>
            <span class="mt-1 block text-xs leading-relaxed text-ink-500 dark:text-ink-400">{{ $t('backup.overwritePlainDescription') }}</span>
          </button>
        </div>

        <StatusMessage v-if="importMode === 'overwrite'" tone="warning">
          {{ $t('backup.overwriteWarning') }}
        </StatusMessage>

        <div v-if="importMode === 'append' && importVersionDiffs.length" class="space-y-3">
          <p class="text-xs font-bold text-ink-500 dark:text-ink-400">
            {{ $t('backup.versionConflictTitle') }}
          </p>
          <div v-for="diff in importVersionDiffs" :key="diff.setName" class="rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950/40 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-sm font-bold text-ink-900 dark:text-ink-100">
                  {{ diff.setName }}
                </p>
                <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  {{ $t('backup.conflictCounts', { local: diff.localCount, imported: diff.importedCount }) }}
                </p>
              </div>
              <div class="grid gap-2 text-xs text-ink-600 dark:text-ink-300">
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    :name="`${prefix}-version-${diff.setName}`"
                    value="local"
                    :checked="importVersionChoices[diff.setName] !== 'imported'"
                    class="h-4 w-4 accent-emerald-500"
                    @change="setImportVersionChoice(diff.setName, 'local')"
                  >
                  <span>{{ $t('backup.keepLocalVersion') }}</span>
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    :name="`${prefix}-version-${diff.setName}`"
                    value="imported"
                    :checked="importVersionChoices[diff.setName] === 'imported'"
                    class="h-4 w-4 accent-emerald-500"
                    @change="setImportVersionChoice(diff.setName, 'imported')"
                  >
                  <span>{{ $t('backup.useImportedVersion') }}</span>
                </label>
              </div>
            </div>

            <div class="mt-3 grid gap-2 text-xs text-ink-500 dark:text-ink-400 sm:grid-cols-3">
              <p><strong class="text-emerald-700 dark:text-emerald-400">{{ $t('backup.added') }}</strong> {{ previewNames(diff.added) }}</p>
              <p><strong class="text-red-600 dark:text-red-400">{{ $t('backup.removed') }}</strong> {{ previewNames(diff.removed) }}</p>
              <p><strong class="text-amber-700 dark:text-amber-300">{{ $t('backup.modified') }}</strong> {{ previewNames(diff.changed) }}</p>
            </div>
          </div>
        </div>

        <StatusMessage v-else-if="importMode === 'append'" tone="success">
          {{ $t('backup.noVersionConflicts') }}
        </StatusMessage>

        <DialogFooter>
          <Button variant="default" @click="settingsOpen = false">
            {{ $t('backup.done') }}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  </div>
</template>
