<script setup>
import { onMounted } from 'vue'
import { useVocab } from './composables/useVocab.js'
import AppHeader from './components/AppHeader.vue'
import HomeView from './components/HomeView.vue'
import FlashcardsView from './components/FlashcardsView.vue'
import PracticeView from './components/PracticeView.vue'
import ResultView from './components/ResultView.vue'
import ImportDialog from './components/dialogs/ImportDialog.vue'
import TransferDialog from './components/dialogs/TransferDialog.vue'
import SetEditorDialog from './components/dialogs/SetEditorDialog.vue'
import ConfirmDialog from './components/dialogs/ConfirmDialog.vue'
import PracticeDialog from './components/dialogs/PracticeDialog.vue'
import Toast from './components/ui/toast/Toast.vue'

const {
  currentView,
  toastMessage,
  toastVisible,
  importOpen,
  transferOpen,
  confirmOpen,
  loadState,
  initTheme,
  closeImport,
  closeTransfer,
  resolveConfirm,
} = useVocab()

onMounted(() => {
  loadState()
  initTheme()
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && importOpen.value) closeImport()
    if (event.key === 'Escape' && transferOpen.value) closeTransfer()
    if (event.key === 'Escape' && confirmOpen.value) resolveConfirm(false)
  })
})
</script>

<template>
  <div class="min-h-screen bg-ink-50/50 dark:bg-ink-950 text-ink-950 dark:text-ink-50 transition-colors duration-300 pb-20 font-sans">
    
    <!-- Premium Header Shell -->
    <AppHeader />

    <main class="mx-auto mt-8 max-w-5xl px-6">
      <!-- Home View -->
      <HomeView v-if="currentView === 'home'" />

      <!-- Flashcards View -->
      <FlashcardsView v-else-if="currentView === 'flashcard'" />

      <!-- Quiz / Spelling Practice View -->
      <PracticeView v-else-if="currentView === 'quiz' || currentView === 'spelling'" />

      <!-- Completion Results View -->
      <ResultView v-else-if="currentView === 'result'" />
    </main>

    <!-- Dialogs -->
    <ImportDialog />
    <TransferDialog />
    <SetEditorDialog />
    <ConfirmDialog />
    <PracticeDialog />

    <Toast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
