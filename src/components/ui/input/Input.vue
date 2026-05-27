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
        'w-full px-4 py-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-950 dark:text-ink-50 text-sm placeholder-ink-400 dark:placeholder-ink-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
        $props.class,
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
</template>
