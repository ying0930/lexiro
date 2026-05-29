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
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 sm:p-6 backdrop-blur-xl"
        @click.self="$emit('close')"
      >
        <div class="dialog-content-panel flex max-h-full w-full flex-col rounded-[22px] border border-ink-200/60 dark:border-ink-200/10 bg-white dark:bg-ink-800 shadow-2xl overflow-hidden" :class="[widthClass]">
          <!-- Drag / Top Bar Decoration to mimic native iOS bottom sheet sheet handles -->
          <div class="w-12 h-1.5 rounded-full bg-ink-200 dark:bg-ink-300 mx-auto mt-3 shrink-0" />

          <div class="flex shrink-0 items-start justify-between gap-4 px-6 pt-4 pb-3">
            <div class="space-y-1 text-left">
              <h2 class="text-lg font-bold tracking-tight text-ink-950 dark:text-ink-50">
                {{ title }}
              </h2>
              <p v-if="description" class="text-xs text-ink-500 dark:text-ink-400 leading-relaxed font-medium">
                {{ description }}
              </p>
            </div>
            <Button v-if="showClose" variant="ghost" size="icon" class="h-8 w-8 hover:bg-ink-200 dark:hover:bg-ink-200/60 rounded-xl shrink-0" @click="$emit('close')">
              <X class="h-4.5 w-4.5 text-ink-500 dark:text-ink-400" />
            </Button>
          </div>

          <div class="overflow-y-auto px-6 pb-6 pt-1 text-left">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
