<script setup>
import { computed } from 'vue'
import { cn } from '../../../lib/utils'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  class: { type: String, default: '' },
})

const width = computed(() => `${Math.max(0, Math.min(100, props.modelValue))}%`)
</script>

<template>
  <div :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800', $props.class)">
    <div class="h-full rounded-full bg-emerald-500 transition-all duration-300" :style="{ width }" />
  </div>
</template>
