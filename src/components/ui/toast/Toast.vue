<script setup lang="ts">
withDefaults(defineProps<{
  message: string
  visible: boolean
  class?: string
}>(), {
  class: '',
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-4 scale-95 opacity-0"
      enter-to-class="translate-y-0 scale-100 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 scale-100 opacity-100"
      leave-to-class="translate-y-4 scale-95 opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-x-0 bottom-8 z-[70] mx-auto w-fit max-w-sm rounded-xl bg-ink-950/90 dark:bg-ink-50/90 text-white dark:text-ink-950 px-5 py-3 text-xs sm:text-sm font-medium shadow-xl backdrop-blur-md border border-ink-800/10 dark:border-ink-200/10 flex items-center justify-center gap-2"
      >
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>
