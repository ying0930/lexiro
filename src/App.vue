<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import ImportDialog from '@/components/dialogs/ImportDialog.vue'
import PracticeDialog from '@/components/dialogs/PracticeDialog.vue'
import SetEditorDialog from '@/components/dialogs/SetEditorDialog.vue'
import TransferDialog from '@/components/dialogs/TransferDialog.vue'
import VersionUpdateDialog from '@/components/dialogs/VersionUpdateDialog.vue'
import Toast from '@/components/ui/toast/Toast.vue'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const sessionStore = useSessionStore()
const setsStore = useSetsStore()
const router = useRouter()

const dataLoaded = ref(false)
const isAnimationsPaused = ref(false)

let versionCheckInterval: ReturnType<typeof setInterval> | null = null

async function checkVersion() {
  if (import.meta.env.DEV)
    return
  if (uiStore.versionUpdateAvailable || uiStore.versionUpdatePending)
    return
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`)
    if (!res.ok)
      return
    const data = await res.json()
    if (data && data.version && data.version !== __APP_VERSION__) {
      if (router.currentRoute.value.path === '/') {
        uiStore.versionUpdateAvailable = true
      }
      else {
        uiStore.versionUpdatePending = true
      }
    }
  }
  catch (e) {
    console.error('Failed to check app version:', e)
  }
}

function handleVisibilityChange() {
  isAnimationsPaused.value = document.hidden
  if (!document.hidden) {
    checkVersion()
  }
}

onMounted(async () => {
  await setsStore.loadState()
  await sessionStore.loadState()
  uiStore.initTheme()
  dataLoaded.value = true

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && uiStore.transferOpen)
      uiStore.closeTransfer()
    if (event.key === 'Escape' && uiStore.confirmOpen)
      uiStore.resolveConfirm(false)
  })

  if (!import.meta.env.DEV) {
    setTimeout(checkVersion, 2000)
    versionCheckInterval = setInterval(checkVersion, 10 * 60 * 1000)
  }

  if (router) {
    router.afterEach((to) => {
      if (to.path === '/' && uiStore.versionUpdatePending) {
        uiStore.versionUpdateAvailable = true
      }
      else {
        checkVersion()
      }
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval)
  }
})
</script>

<template>
  <div v-if="dataLoaded" class="min-h-screen bg-ink-50 dark:bg-ink-950 text-ink-950 dark:text-ink-50 transition-colors duration-250 pb-20 relative overflow-x-hidden">
    <AppHeader />

    <main class="mx-auto pt-20 max-w-5xl px-4 sm:px-6 relative">
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
    <VersionUpdateDialog />

    <Toast :message="uiStore.toastMessage" :visible="uiStore.toastVisible" />
  </div>
</template>
