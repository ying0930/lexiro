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
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-md transition-all duration-300"
        @click.self="$emit('close')"
      >
        <div :class="['flex max-h-full w-full flex-col rounded-3xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-2xl overflow-hidden transition-all duration-300', widthClass]">
          <!-- Header block -->
          <div class="flex shrink-0 items-start justify-between gap-4 p-6 pb-4">
            <div class="space-y-1">
              <h2 class="text-lg font-bold tracking-tight text-ink-950 dark:text-ink-50">{{ title }}</h2>
              <p v-if="description" class="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{{ description }}</p>
            </div>
            <Button v-if="showClose" variant="ghost" size="icon" class="h-8 w-8 hover:bg-ink-100 dark:hover:bg-ink-800 rounded-lg shrink-0" @click="$emit('close')">
              <X class="h-4 w-4 text-ink-500 dark:text-ink-400" />
            </Button>
          </div>
          
          <!-- Content block -->
          <div class="overflow-y-auto p-6 pt-0 text-left">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
