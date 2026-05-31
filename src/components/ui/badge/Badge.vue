<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/cn'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'outline'
  class?: string
}>(), {
  variant: 'secondary',
  class: '',
})

const classes = computed(() =>
  cn(
    'inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
    {
      'bg-accent-primary/10 text-accent-primary border-accent-primary/15': props.variant === 'default',
      'bg-ink-100 dark:bg-ink-100 text-ink-600 dark:text-ink-400 border-ink-200 dark:border-ink-200/40': props.variant === 'secondary',
      'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/15': props.variant === 'destructive',
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15': props.variant === 'success',
      'bg-transparent text-ink-600 dark:text-ink-300 border-ink-200/80 dark:border-ink-200/30': props.variant === 'outline',
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
