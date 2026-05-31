<script setup lang="ts">
import { cn } from '@/lib/cn'

withDefaults(defineProps<{
  modelValue?: string
  class?: string
  placeholder?: string
  type?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  class: '',
  placeholder: '',
  type: 'text',
  disabled: false,
})
defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <input
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="
      cn(
        'w-full rounded-xl border border-ink-200/80 dark:border-ink-200/30 bg-white dark:bg-ink-900 px-4 py-3 text-sm text-ink-950 dark:text-ink-50 placeholder-ink-400 dark:placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary disabled:cursor-not-allowed disabled:opacity-45 transition-all duration-200',
        $props.class,
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
</template>
