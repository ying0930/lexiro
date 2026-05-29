<script setup lang="ts">
import { cn } from '@/lib/cn'

defineProps<{
  class?: string
}>()
</script>

<template>
  <div :class="cn('panel relative overflow-hidden', $props.class)">
    <slot />
  </div>
</template>
