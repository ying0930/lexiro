<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { onMounted, onUnmounted } from 'vue'
import Button from '../button/Button.vue'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  widthClass?: string
  showClose?: boolean
}>(), {
  title: '',
  description: '',
  widthClass: 'max-w-lg',
  showClose: true,
})
defineEmits<{
  close: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (!props.open)
    return
  if (e.key === 'Backspace' && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
    e.preventDefault()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-md"
        @click.self="$emit('close')"
      >
        <div class="dialog-content-panel flex max-h-full w-full flex-col rounded-3xl border border-ink-200/50 dark:border-ink-800/50 bg-white dark:bg-ink-900 shadow-2xl overflow-hidden" :class="[widthClass]">
          <div class="flex shrink-0 items-start justify-between gap-4 p-6 pb-4">
            <div class="space-y-1">
              <h2 class="text-lg font-bold tracking-tight text-ink-950 dark:text-ink-50">
                {{ title }}
              </h2>
              <p v-if="description" class="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
                {{ description }}
              </p>
            </div>
            <Button v-if="showClose" variant="ghost" size="icon" class="h-8 w-8 hover:bg-ink-100 dark:hover:bg-ink-800 rounded-lg shrink-0" @click="$emit('close')">
              <X class="h-4 w-4 text-ink-500 dark:text-ink-400" />
            </Button>
          </div>

          <div class="overflow-y-auto p-6 pt-0 text-left">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
