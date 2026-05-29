<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/cn'

const props = withDefaults(defineProps<{
  modelValue?: number
  class?: string
}>(), {
  modelValue: 0,
  class: '',
})

const width = computed(() => `${Math.max(0, Math.min(100, props.modelValue))}%`)
</script>

<template>
  <div :class="cn('relative h-1.5 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-100', $props.class)">
    <div class="h-full rounded-full bg-accent-primary transition-all duration-300" :style="{ width }" />
  </div>
</template>
