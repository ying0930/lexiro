<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import Button from '../ui/button/Button.vue'
import Dialog from '../ui/dialog/Dialog.vue'

const uiStore = useUIStore()
const { confirmOpen, confirmTitle, confirmMessage } = storeToRefs(uiStore)
const { resolveConfirm } = uiStore
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
