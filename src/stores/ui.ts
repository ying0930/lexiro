import { defineStore } from 'pinia'
import { ref } from 'vue'
import { THEME_KEY } from '@/constants'

export const useUIStore = defineStore('ui', () => {
  const theme = ref<'light' | 'dark'>('light')
  const toastMessage = ref('')
  const toastVisible = ref(false)
  const confirmOpen = ref(false)
  const confirmTitle = ref('')
  const confirmMessage = ref('')
  const transferOpen = ref(false)
  const versionUpdateAvailable = ref(false)
  const versionUpdatePending = ref(false)
  const versionUpdateReady = ref(false)
  const versionUpdateLoading = ref(false)

  let confirmResolver: ((value: boolean) => void) | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(message: string) {
    toastMessage.value = message
    toastVisible.value = true
    window.clearTimeout(toastTimer!)
    toastTimer = window.setTimeout(() => {
      toastVisible.value = false
    }, 2200)
  }

  function showConfirm(title: string, message: string): Promise<boolean> {
    confirmTitle.value = title
    confirmMessage.value = message
    confirmOpen.value = true
    return new Promise((resolve) => {
      confirmResolver = resolve
    })
  }

  function resolveConfirm(result: boolean) {
    confirmOpen.value = false
    if (confirmResolver) {
      confirmResolver(result)
      confirmResolver = null
    }
  }

  function toggleTheme() {
    if (theme.value === 'light') {
      theme.value = 'dark'
      document.documentElement.classList.add('dark')
      localStorage.setItem(THEME_KEY, 'dark')
    }
    else {
      theme.value = 'light'
      document.documentElement.classList.remove('dark')
      localStorage.setItem(THEME_KEY, 'light')
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      theme.value = 'dark'
      document.documentElement.classList.add('dark')
    }
    else {
      theme.value = 'light'
      document.documentElement.classList.remove('dark')
    }
  }

  function openTransfer() {
    transferOpen.value = true
  }

  function closeTransfer() {
    transferOpen.value = false
  }

  return {
    theme,
    toastMessage,
    toastVisible,
    confirmOpen,
    confirmTitle,
    confirmMessage,
    transferOpen,
    versionUpdateAvailable,
    versionUpdatePending,
    versionUpdateReady,
    versionUpdateLoading,
    showToast,
    showConfirm,
    resolveConfirm,
    toggleTheme,
    initTheme,
    openTransfer,
    closeTransfer,
  }
})
