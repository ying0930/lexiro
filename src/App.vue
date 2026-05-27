<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import ImportDialog from '@/components/dialogs/ImportDialog.vue'
import PracticeDialog from '@/components/dialogs/PracticeDialog.vue'
import SetEditorDialog from '@/components/dialogs/SetEditorDialog.vue'
import TransferDialog from '@/components/dialogs/TransferDialog.vue'
import Toast from '@/components/ui/toast/Toast.vue'
import { useSessionStore } from '@/stores/session'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const sessionStore = useSessionStore()

const isAnimationsPaused = ref(false)
function handleVisibilityChange() {
  isAnimationsPaused.value = document.hidden
}

onMounted(() => {
  sessionStore.loadState()
  uiStore.initTheme()

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && uiStore.transferOpen)
      uiStore.closeTransfer()
    if (event.key === 'Escape' && uiStore.confirmOpen)
      uiStore.resolveConfirm(false)
  })
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="min-h-screen bg-ink-50/50 dark:bg-ink-950 text-ink-950 dark:text-ink-50 transition-colors duration-300 pb-20 font-sans relative overflow-x-hidden">
    <div
      class="pointer-events-none fixed -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/12 blur-[100px] z-0 animate-glow-1" :class="[{ '![animation-play-state:paused]': isAnimationsPaused }]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none fixed top-1/4 right-1/4 h-[800px] w-[800px] rounded-full bg-indigo-500/22 dark:bg-indigo-500/16 blur-[110px] z-0 animate-glow-2" :class="[{ '![animation-play-state:paused]': isAnimationsPaused }]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none fixed -bottom-20 left-1/3 h-[700px] w-[700px] rounded-full bg-purple-500/18 dark:bg-purple-600/12 blur-[100px] z-0 animate-glow-3" :class="[{ '![animation-play-state:paused]': isAnimationsPaused }]"
      aria-hidden="true"
    />

    <AppHeader />

    <main class="mx-auto mt-8 max-w-5xl px-6 relative z-10">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <ImportDialog />
    <TransferDialog />
    <SetEditorDialog />
    <ConfirmDialog />
    <PracticeDialog />

    <Toast :message="uiStore.toastMessage" :visible="uiStore.toastVisible" />
  </div>
</template>
