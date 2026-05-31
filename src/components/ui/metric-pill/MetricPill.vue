<script setup lang="ts">
import { cn } from '@/lib/cn'

withDefaults(defineProps<{
  label?: string
  value: string | number
  class?: string
}>(), {
  label: '',
  class: '',
})
</script>

<template>
  <div :class="cn('inline-flex items-center gap-2 rounded-full border border-ink-200/80 bg-ink-100/80 px-3 py-1.5 text-xs font-bold text-ink-600 dark:border-ink-200/30 dark:bg-ink-800 dark:text-ink-300', $props.class)">
    <span v-if="label" class="text-ink-400 dark:text-ink-500">{{ label }}</span>
    <span class="text-ink-900 dark:text-ink-50">{{ value }}</span>
  </div>
</template>
