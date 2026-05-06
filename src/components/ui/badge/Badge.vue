<script setup>
import { computed } from 'vue'
import { cn } from '../../../lib/utils'

const props = defineProps({
  variant: { type: String, default: 'secondary' },
  class: { type: String, default: '' },
})

const classes = computed(() =>
  cn(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    {
      'bg-zinc-900 text-white': props.variant === 'default',
      'bg-zinc-100 text-zinc-600': props.variant === 'secondary',
      'bg-red-50 text-red-600': props.variant === 'destructive',
      'bg-green-50 text-green-700': props.variant === 'success',
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
