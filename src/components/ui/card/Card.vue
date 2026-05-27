<script setup lang="ts">
import { cn } from '@/lib/cn'

defineProps<{
  glow?: boolean
  class?: string
}>()
</script>

<template>
  <div :class="cn('panel relative overflow-hidden', $props.class)">
    <template v-if="glow">
      <div class="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:hidden" aria-hidden="true" />
      <div class="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:hidden" aria-hidden="true" />
    </template>

    <slot />
  </div>
</template>
