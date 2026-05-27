<script setup lang="ts">
import { ref } from 'vue'
import { cn } from '@/lib/cn'

withDefaults(defineProps<{
  modelValue?: string
  class?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
}>(), {
  modelValue: '',
  class: '',
  placeholder: '',
  rows: 4,
  disabled: false,
})
defineEmits<{
  'update:modelValue': [value: string]
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)

defineExpose({
  focus: () => textarea.value?.focus(),
})
</script>

<template>
  <textarea
    ref="textarea"
    :value="modelValue"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="
      cn(
        'w-full px-4 py-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-950 dark:text-ink-50 text-sm placeholder-ink-400 dark:placeholder-ink-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-y',
        $props.class,
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
