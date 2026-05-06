<script setup>
import { X } from 'lucide-vue-next'
import Button from '../button/Button.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  showClose: { type: Boolean, default: true },
  widthClass: { type: String, default: 'max-w-lg' },
})

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div :class="['w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-xl', widthClass]">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-zinc-950">{{ title }}</h2>
            <p v-if="description" class="text-sm leading-6 text-zinc-500">{{ description }}</p>
          </div>
          <Button v-if="showClose" variant="ghost" size="icon" class="h-8 w-8" @click="$emit('close')">
            <X class="h-4 w-4" />
          </Button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
