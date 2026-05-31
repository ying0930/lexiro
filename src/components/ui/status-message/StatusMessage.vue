<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/cn'

const props = withDefaults(defineProps<{
  tone?: 'info' | 'success' | 'warning' | 'error'
  class?: string
}>(), {
  tone: 'info',
  class: '',
})

const classes = computed(() =>
  cn(
    'rounded-xl border px-4 py-2.5 text-xs font-semibold leading-relaxed',
    {
      'border-accent-primary/15 bg-accent-primary/10 text-accent-primary': props.tone === 'info',
      'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400': props.tone === 'success',
      'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300': props.tone === 'warning',
      'border-red-500/15 bg-red-500/10 text-red-600 dark:text-red-400': props.tone === 'error',
    },
    props.class,
  ),
)
</script>

<template>
  <p :class="classes">
    <slot />
  </p>
</template>
