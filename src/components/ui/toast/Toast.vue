<script setup>
defineProps({
  message: { type: String, default: '' },
  visible: { type: Boolean, default: false },
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-x-0 bottom-6 z-[70] mx-auto w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
      >
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>
