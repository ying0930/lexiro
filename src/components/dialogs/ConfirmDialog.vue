<script setup>
import { useVocab } from '../../composables/useVocab.js'
import Dialog from '../ui/dialog/Dialog.vue'
import Button from '../ui/button/Button.vue'

const {
  confirmOpen,
  confirmTitle,
  confirmMessage,
  resolveConfirm,
} = useVocab()
</script>

<template>
  <Dialog
    :open="confirmOpen"
    :title="confirmTitle"
    :description="confirmMessage"
    :show-close="false"
    width-class="max-w-md"
    @close="resolveConfirm(false)"
  >
    <div class="flex justify-end gap-2 pt-2">
      <Button variant="outline" @click="resolveConfirm(false)">取消</Button>
      <Button variant="destructive" @click="resolveConfirm(true)">確定</Button>
    </div>
  </Dialog>
</template>
