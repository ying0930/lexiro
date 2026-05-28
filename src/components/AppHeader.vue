<script setup lang="ts">
import { ArrowLeft, Moon, PencilLine, Sun, Trash2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useSetsStore } from '@/stores/sets'
import { useUIStore } from '@/stores/ui'
import Badge from './ui/badge/Badge.vue'
import Button from './ui/button/Button.vue'
import Progress from './ui/progress/Progress.vue'

const sessionStore = useSessionStore()
const setsStore = useSetsStore()
const uiStore = useUIStore()
const route = useRoute()
const { t } = useI18n()
const { exitCurrentView } = sessionStore
const { currentSession, currentIndex, totalItems, progressPercent } = storeToRefs(sessionStore)
const { hasSets, sets, totalWordCount, activeSet } = storeToRefs(setsStore)
const { editActiveSet, deleteActiveSet } = setsStore
const { theme } = storeToRefs(uiStore)
const { toggleTheme } = uiStore

const isHome = computed(() => route.name === 'home')
const isPractice = computed(() => route.name === 'quiz' || route.name === 'spelling')

const practiceLabel = computed(() => {
  if (route.name === 'quiz')
    return t('practice.quiz')
  if (route.name === 'spelling')
    return t('practice.spelling')
  return ''
})
</script>

<template>
  <header
    class="fixed top-0 inset-x-0 z-40 border-b border-white/40 dark:border-white/10"
    style="background-color: rgba(255,255,255,0.45); backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%);"
  >
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
      <div class="flex items-center gap-3 min-w-0">
        <Button
          v-if="!isHome"
          variant="ghost"
          size="icon"
          class="h-9 w-9 shrink-0 hover:bg-white/60 dark:hover:bg-white/10"
          @click="exitCurrentView"
        >
          <ArrowLeft class="h-4 w-4 text-ink-700 dark:text-ink-300" />
        </Button>
        <div class="text-left min-w-0">
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">
            Wordmem
          </h1>
          <p v-if="isHome" class="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
            <span v-if="hasSets" class="font-medium">
              {{ $t('appHeader.stats', { setCount: sets.length, wordCount: totalWordCount }) }}
            </span>
            <span v-else class="font-medium">
              {{ $t('appHeader.emptyHint') }}
            </span>
          </p>
          <p v-else-if="activeSet" class="text-xs text-ink-500 dark:text-ink-400 mt-0.5 truncate">
            {{ activeSet.setName }}<span v-if="isPractice">{{ $t('appHeader.practiceStats', { label: practiceLabel, count: totalItems }) }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <template v-if="isPractice && currentSession">
          <Progress :model-value="progressPercent" class="w-20 h-1" />
          <span class="text-sm font-bold tabular-nums text-ink-950 dark:text-ink-50">
            {{ currentIndex + 1 }}<span class="text-xs text-ink-400">/{{ totalItems }}</span>
          </span>
        </template>

        <template v-else-if="!isHome && activeSet">
          <Badge variant="secondary" class="hidden sm:inline-flex rounded-xl px-3 py-1.5 text-xs font-semibold bg-white/60 dark:bg-white/10 border-none">
            {{ activeSet.setName }}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9 text-ink-500 hover:text-ink-950 dark:hover:text-ink-50 border-white/60 dark:border-white/20 hover:bg-white/60 dark:hover:bg-white/10"
            aria-label="編輯單字集"
            @click="editActiveSet"
          >
            <PencilLine class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9 text-red-500 hover:text-red-600 border-white/60 dark:border-white/20 hover:bg-red-50 dark:hover:bg-red-950/20"
            aria-label="刪除單字集"
            @click="deleteActiveSet"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </template>

        <span class="w-px h-5 bg-ink-200/50 dark:bg-white/20 mx-1 hidden sm:inline-block" />

        <Button
          variant="ghost"
          size="icon"
          class="h-9 w-9 rounded-xl hover:bg-white/60 dark:hover:bg-white/10"
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
