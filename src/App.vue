<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import Toast from '@/components/ui/toast/Toast.vue'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'

const ConfirmDialog = defineAsyncComponent(() => import('@/components/dialogs/ConfirmDialog.vue'))
const ImportDialog = defineAsyncComponent(() => import('@/components/dialogs/ImportDialog.vue'))
const PracticeDialog = defineAsyncComponent(() => import('@/components/dialogs/PracticeDialog.vue'))
const SetEditorDialog = defineAsyncComponent(() => import('@/components/dialogs/SetEditorDialog.vue'))
const TransferDialog = defineAsyncComponent(() => import('@/components/dialogs/TransferDialog.vue'))

const uiStore = useUIStore()
const sessionStore = useSessionStore()
const setsStore = useSetsStore()

const isAnimationsPaused = ref(false)
function handleVisibilityChange() {
  isAnimationsPaused.value = document.hidden
}

onMounted(async () => {
  await setsStore.loadState()
  await sessionStore.loadState()
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
      class="pointer-events-none fixed -top-40 left-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/12 blur-[60px] z-0 animate-glow-1" :class="[{ '!hidden': isAnimationsPaused }]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none fixed top-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/22 dark:bg-indigo-500/16 blur-[70px] z-0 animate-glow-2" :class="[{ '!hidden': isAnimationsPaused }]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none fixed -bottom-20 left-1/3 h-[450px] w-[450px] rounded-full bg-purple-500/18 dark:bg-purple-600/12 blur-[60px] z-0 animate-glow-3" :class="[{ '!hidden': isAnimationsPaused }]"
      aria-hidden="true"
    />

    <AppHeader />

    <main class="mx-auto pt-20 max-w-5xl px-6 relative">
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
