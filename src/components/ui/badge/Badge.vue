<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/cn'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'outline' | 'indigo'
  class?: string
}>(), {
  variant: 'secondary',
  class: '',
})

const classes = computed(() =>
  cn(
    'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold tracking-wider transition-colors',
    {
      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40': props.variant === 'default' || props.variant === 'indigo',
      'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 border-ink-200 dark:border-ink-700': props.variant === 'secondary',
      'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50': props.variant === 'destructive',
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50': props.variant === 'success',
    },
    props.class,
  ),
)
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
