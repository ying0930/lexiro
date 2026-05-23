<script setup>
import { cn } from '../../../lib/utils'

defineProps({
  class: { type: String, default: '' },
  glow: { type: Boolean, default: true },
})
</script>

<template>
  <div :class="cn('panel relative overflow-hidden transition-all duration-300', $props.class)">
    <!-- 1. Ambient Glow Layers (Aria-hidden & Click-through-safe) -->
    <template v-if="glow">
      <div class="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:hidden" aria-hidden="true"></div>
      <div class="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:hidden" aria-hidden="true"></div>
    </template>
    
    <slot />
  </div>
</template>
