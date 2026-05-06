<script setup>
import { cn } from '../../../lib/utils'

import { ref } from 'vue'

defineProps({
  modelValue: { type: String, default: '' },
  class: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: Number, default: 4 },
})

defineEmits(['update:modelValue'])

const textarea = ref(null)

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
    :class="
      cn(
        'flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white transition-colors outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50',
        $props.class,
      )
    "
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>
