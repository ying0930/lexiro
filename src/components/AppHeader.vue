<script setup lang="ts">
import { ArrowLeft, Moon, PencilLine, Sun, Trash2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import Badge from './ui/badge/Badge.vue'
import Button from './ui/button/Button.vue'

const sessionStore = useSessionStore()
const setsStore = useSetsStore()
const uiStore = useUIStore()
const route = useRoute()
const { exitCurrentView } = sessionStore
const isHome = () => route.name === 'home'
const { hasSets, sets, totalWordCount, activeSet } = storeToRefs(setsStore)
const { editActiveSet, deleteActiveSet } = setsStore
const { theme } = storeToRefs(uiStore)
const { toggleTheme } = uiStore
</script>

<template>
  <!-- Premium Header Shell -->
  <header class="fixed top-0 inset-x-0 z-40 border-b border-ink-200/50 dark:border-ink-800/50 bg-white/80 dark:bg-ink-950/80 backdrop-blur-xl">
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
      <!-- Header Info -->
      <div class="flex items-center gap-3">
        <Button
          v-if="!isHome()"
          variant="ghost"
          size="icon"
          class="h-9 w-9 shrink-0 hover:bg-ink-100 dark:hover:bg-ink-800"
          @click="exitCurrentView"
        >
          <ArrowLeft class="h-4 w-4 text-ink-700 dark:text-ink-300" />
        </Button>
        <div class="text-left">
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">
            Wordmem
          </h1>
          <p v-if="isHome()" class="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
            <span v-if="hasSets" class="font-medium">
              {{ sets.length }} 個單字集，共 {{ totalWordCount }} 個單字
            </span>
            <span v-else class="font-medium">
              點擊新增按鈕以載入你的專屬單字集。
            </span>
          </p>
        </div>
      </div>

      <!-- Header Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Active Set Quick Access -->
        <template v-if="!isHome() && activeSet">
          <Badge variant="secondary" class="hidden sm:inline-flex rounded-xl px-3 py-1.5 text-xs font-semibold bg-ink-100 dark:bg-ink-800 border-none">
            {{ activeSet.setName }}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9 text-ink-500 hover:text-ink-950 dark:hover:text-ink-50 border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-800"
            aria-label="編輯單字集"
            @click="editActiveSet"
          >
            <PencilLine class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9 text-red-500 hover:text-red-600 border-ink-200 dark:border-ink-800 hover:bg-red-50 dark:hover:bg-red-950/20"
            aria-label="刪除單字集"
            @click="deleteActiveSet"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </template>

        <span class="w-px h-5 bg-ink-200 dark:bg-ink-800 mx-1 hidden sm:inline-block" />

        <!-- Dynamic Theme Switcher -->
        <Button
          variant="ghost"
          size="icon"
          class="h-9 w-9 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800"
          title="切換主題"
          @click="toggleTheme"
        >
          <Sun v-if="theme === 'dark'" class="h-4 w-4 text-emerald-400 animate-pulse" />
          <Moon v-else class="h-4 w-4 text-indigo-600" />
        </Button>
      </div>
    </div>
  </header>
</template>
