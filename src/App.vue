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
  <div class="min-h-screen bg-ink-50/50 dark:bg-ink-950 text-ink-950 dark:text-ink-50 transition-colors duration-300 pb-20 font-sans relative overflow-x-hidden">
    <!-- Ambient Background Glows (Page backdrop - green, indigo, and purple/violet matching the premium glassmorphism design) -->
    <div class="pointer-events-none fixed -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/12 blur-[100px] z-0 animate-glow-1" aria-hidden="true"></div>
    <div class="pointer-events-none fixed top-1/4 right-1/4 h-[800px] w-[800px] rounded-full bg-indigo-500/22 dark:bg-indigo-500/16 blur-[110px] z-0 animate-glow-2" aria-hidden="true"></div>
    <div class="pointer-events-none fixed -bottom-20 left-1/3 h-[700px] w-[700px] rounded-full bg-purple-500/18 dark:bg-purple-600/12 blur-[100px] z-0 animate-glow-3" aria-hidden="true"></div>
    
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
    <ImportDialog />
    <TransferDialog />
    <SetEditorDialog />
    <ConfirmDialog />
    <PracticeDialog />

    <Toast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
