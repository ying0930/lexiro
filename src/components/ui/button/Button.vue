<script setup>
import { computed } from 'vue'
import { cn } from '../../../lib/utils'

const props = defineProps({
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  class: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50',
    {
      'bg-zinc-900 text-white hover:bg-zinc-800': props.variant === 'default',
      'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50': props.variant === 'outline',
      'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900': props.variant === 'ghost',
      'bg-red-600 text-white hover:bg-red-500': props.variant === 'destructive',
      'h-10 px-4 py-2': props.size === 'default',
      'h-9 rounded-md px-3': props.size === 'sm',
      'h-10 w-10': props.size === 'icon',
    },
    props.class,
  ),
)
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
