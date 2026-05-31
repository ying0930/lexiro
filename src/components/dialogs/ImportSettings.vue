<script setup lang="ts">
import type { VocabSet } from '@/types'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useSetsStore } from '@/stores/sets'
import StatusMessage from '../ui/status-message/StatusMessage.vue'

defineProps<{
  sets: VocabSet[] | null
  prefix: string
}>()

const setsStore = useSetsStore()
const { importMode, importVersionDiffs, importVersionChoices, duplicateSummary } = storeToRefs(setsStore)
const { setImportVersionChoice } = setsStore
const { t } = useI18n()

function previewNames(names: string[]) {
  if (!names.length)
    return t('backup.none')
  const preview = names.slice(0, 5).join('、')
  return names.length > 5 ? `${preview} ${t('backup.moreItems', { count: names.length })}` : preview
}
</script>

<template>
  <div v-if="sets && sets.length" class="mt-4 pt-4 border-t border-ink-200/30 dark:border-ink-800/30 space-y-4">
    <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
      {{ $t('backup.importSettings') }}
    </p>
    <div class="grid gap-2 sm:grid-cols-2">
      <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-200 dark:border-ink-800 px-3 py-2 text-xs text-ink-600 dark:text-ink-300">
        <input v-model="importMode" type="radio" value="append" class="mt-0.5 h-4 w-4 accent-emerald-500">
        <span><strong class="block text-ink-900 dark:text-ink-100">{{ $t('backup.append') }}</strong>{{ $t('backup.appendDescription') }}</span>
      </label>
      <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-200 dark:border-ink-800 px-3 py-2 text-xs text-ink-600 dark:text-ink-300">
        <input v-model="importMode" type="radio" value="overwrite" class="mt-0.5 h-4 w-4 accent-emerald-500">
        <span><strong class="block text-ink-900 dark:text-ink-100">{{ $t('backup.overwrite') }}</strong>{{ $t('backup.overwriteDescription') }}</span>
      </label>
    </div>

    <div v-if="importMode === 'append' && importVersionDiffs.length" class="mt-4 space-y-3">
      <p class="text-xs font-bold text-ink-500 dark:text-ink-400">
        {{ $t('backup.versionDiff') }}
      </p>
      <div
        v-for="diff in importVersionDiffs"
        :key="diff.setName"
        class="rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950/40 p-4"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-sm font-bold text-ink-900 dark:text-ink-100">
              {{ diff.setName }}
            </p>
            <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">
              {{ $t('backup.keepLocal') }} {{ $t('home.wordsCount', { count: diff.localCount }) }}，{{ $t('backup.useImported') }} {{ $t('home.wordsCount', { count: diff.importedCount }) }}
            </p>
          </div>
          <div class="grid gap-1 text-xs text-ink-600 dark:text-ink-300">
            <label class="flex items-center gap-2">
              <input
                type="radio"
                :name="`${prefix}-version-${diff.setName}`"
                value="local"
                :checked="importVersionChoices[diff.setName] !== 'imported'"
                class="h-4 w-4 accent-emerald-500"
                @change="setImportVersionChoice(diff.setName, 'local')"
              >
              <span>{{ $t('backup.keepLocal') }}</span>
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
              <span>{{ $t('backup.useImported') }}</span>
            </label>
          </div>
        </div>

        <div class="mt-3 grid gap-2 text-xs text-ink-500 dark:text-ink-400 sm:grid-cols-3">
          <p>
            <strong class="text-emerald-700 dark:text-emerald-400">{{ $t('backup.added') }}</strong>
            {{ previewNames(diff.added) }}
          </p>
          <p>
            <strong class="text-red-600 dark:text-red-400">{{ $t('backup.removed') }}</strong>
            {{ previewNames(diff.removed) }}
          </p>
          <p>
            <strong class="text-amber-700 dark:text-amber-300">{{ $t('backup.modified') }}</strong>
            {{ previewNames(diff.changed) }}
          </p>
        </div>
      </div>
    </div>

    <StatusMessage v-if="duplicateSummary && (duplicateSummary.skippedByName.length || duplicateSummary.skippedByContent.length || duplicateSummary.renamedIds.length || duplicateSummary.replacedVersions.length)" tone="warning" class="mt-4">
      <span v-if="duplicateSummary.skippedByName.length">{{ $t('backup.summaryKeepLocal', { names: duplicateSummary.skippedByName.join('、') }) }}</span>
      <span v-if="duplicateSummary.replacedVersions.length">{{ $t('backup.summaryUseImported', { names: duplicateSummary.replacedVersions.join('、') }) }}</span>
      <span v-if="duplicateSummary.skippedByContent.length">{{ $t('backup.summaryDuplicateContent', { names: duplicateSummary.skippedByContent.join('、') }) }}</span>
      <span v-if="duplicateSummary.renamedIds.length">{{ $t('backup.summaryRenamedIds', { names: duplicateSummary.renamedIds.map((item) => item.setName).join('、') }) }}</span>
    </StatusMessage>
  </div>
</template>
