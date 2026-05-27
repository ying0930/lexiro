<script setup lang="ts">
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import Button from '../ui/button/Button.vue'
import Dialog from '../ui/dialog/Dialog.vue'

const {
  practiceDialogOpen,
  practiceDialogSetId,
  practiceDialogCount,
  closePracticeDialog,
  confirmPracticeDialog,
} = useSessionStore()

const { sets } = useSetsStore()
</script>

<template>
  <Dialog
    :open="practiceDialogOpen"
    :title="$t('practice.startTitle')"
    :description="$t('practice.countLabel')"
    @close="closePracticeDialog"
  >
    <div v-if="practiceDialogSetId && sets.find((set) => set.id === practiceDialogSetId)" class="space-y-6">
      <div class="rounded-2xl border border-ink-200/50 dark:border-ink-800/50 bg-ink-100/50 dark:bg-ink-900/40 p-5 text-left relative overflow-hidden">
        <!-- Glow background overlay -->
        <div class="pointer-events-none absolute -right-20 -bottom-20 h-44 w-44 rounded-full bg-indigo-500/5 blur-3xl dark:hidden" aria-hidden="true" />

        <div class="flex items-center justify-between gap-3 relative z-10">
          <div class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {{ $t('practice.countLabel') }}
            </p>
            <p class="text-xl font-extrabold text-ink-950 dark:text-ink-50">
              {{ practiceDialogCount }} <span class="text-xs text-ink-400">/ {{ $t('practice.questions', { count: sets.find((set) => set.id === practiceDialogSetId)?.items.length ?? 1 }) }}</span>
            </p>
          </div>
        </div>

        <input
          v-model="practiceDialogCount"
          class="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-200 dark:bg-ink-800 accent-emerald-500 focus:outline-none relative z-10"
          type="range"
          min="1"
          :max="sets.find((set) => set.id === practiceDialogSetId)?.items.length ?? 1"
        >
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
        <Button variant="outline" @click="closePracticeDialog">
          {{ $t('editor.cancel') }}
        </Button>
        <Button variant="default" @click="confirmPracticeDialog">
          {{ $t('practice.confirmStart') }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>
