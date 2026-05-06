<script setup>
import { cn } from '../../../lib/utils'

defineProps({
  class: { type: String, default: '' },
})
</script>

<template>
  <div :class="cn('rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-sm', $props.class)">
    <slot />
  </div>
</template>
