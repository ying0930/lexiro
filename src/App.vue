<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted } from 'vue'
import { useVocab } from './composables/useVocab.js'
import AppHeader from './components/AppHeader.vue'
import HomeView from './components/HomeView.vue'
import Toast from './components/ui/toast/Toast.vue'

const FlashcardsView = defineAsyncComponent(() => import('./components/FlashcardsView.vue'))
const PracticeView = defineAsyncComponent(() => import('./components/PracticeView.vue'))
const ResultView = defineAsyncComponent(() => import('./components/ResultView.vue'))
const ImportDialog = defineAsyncComponent(() => import('./components/dialogs/ImportDialog.vue'))
const TransferDialog = defineAsyncComponent(() => import('./components/dialogs/TransferDialog.vue'))
const SetEditorDialog = defineAsyncComponent(() => import('./components/dialogs/SetEditorDialog.vue'))
const ConfirmDialog = defineAsyncComponent(() => import('./components/dialogs/ConfirmDialog.vue'))
const PracticeDialog = defineAsyncComponent(() => import('./components/dialogs/PracticeDialog.vue'))

const {
  currentView,
  toastMessage,
  toastVisible,
  importOpen,
  transferOpen,
  confirmOpen,
  setEditorOpen,
  practiceDialogOpen,
  loadState,
  initTheme,
  updateOnlineStatus,
  saveState,
  closeImport,
  closeTransfer,
  resolveConfirm,
} = useVocab()

loadState()
initTheme()

function handleKeydown(event) {
  if (event.key === 'Escape' && importOpen.value) closeImport()
  if (event.key === 'Escape' && transferOpen.value) closeTransfer()
  if (event.key === 'Escape' && confirmOpen.value) resolveConfirm(false)
}

function handlePageHide() {
  saveState()
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') saveState()
}

onMounted(() => {
  updateOnlineStatus()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
  window.removeEventListener('pagehide', handlePageHide)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="min-h-screen bg-ink-50/50 dark:bg-ink-950 text-ink-950 dark:text-ink-50 transition-colors duration-300 pb-20 font-sans relative overflow-x-hidden">
    <div class="ambient-field" aria-hidden="true"></div>
    
    <!-- Premium Header Shell -->
    <AppHeader />

    <main class="mx-auto mt-8 max-w-5xl px-6 relative z-10">
      <Transition name="page" mode="out-in">
        <!-- Home View -->
        <HomeView v-if="currentView === 'home'" />

        <!-- Flashcards View -->
        <FlashcardsView v-else-if="currentView === 'flashcard'" />

        <!-- Quiz / Spelling Practice View -->
        <PracticeView v-else-if="currentView === 'quiz' || currentView === 'spelling'" />

        <!-- Completion Results View -->
        <ResultView v-else-if="currentView === 'result'" />
      </Transition>
    </main>

    <!-- Dialogs -->
    <ImportDialog v-if="importOpen" />
    <TransferDialog v-if="transferOpen" />
    <SetEditorDialog v-if="setEditorOpen" />
    <ConfirmDialog v-if="confirmOpen" />
    <PracticeDialog v-if="practiceDialogOpen" />

    <Toast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
