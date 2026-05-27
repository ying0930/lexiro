<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import Button from '../ui/button/Button.vue'
import Dialog from '../ui/dialog/Dialog.vue'

const {
  confirmOpen,
  confirmTitle,
  confirmMessage,
  resolveConfirm,
} = useUIStore()
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
      <Button variant="outline" @click="resolveConfirm(false)">
        {{ $t('confirm.cancel') }}
      </Button>
      <Button variant="destructive" @click="resolveConfirm(true)">
        {{ $t('confirm.confirm') }}
      </Button>
    </div>
  </Dialog>
</template>
