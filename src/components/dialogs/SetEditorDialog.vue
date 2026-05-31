<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useSetsStore } from '@/stores/sets'
import Button from '../ui/button/Button.vue'
import DialogFooter from '../ui/dialog-footer/DialogFooter.vue'
import Dialog from '../ui/dialog/Dialog.vue'
import Input from '../ui/input/Input.vue'
import StatusMessage from '../ui/status-message/StatusMessage.vue'
import EditorItemCard from './EditorItemCard.vue'

const setsStore = useSetsStore()
const { setEditorOpen, setEditorMode, setEditorName, setEditorDraftItems, setEditorError } = storeToRefs(setsStore)
const { closeSetEditor, removeEditorItem, addEditorItem, saveSetEditor } = setsStore

function updateEditorItem(itemIndex: number, item: typeof setEditorDraftItems.value[number]) {
  setEditorDraftItems.value = setEditorDraftItems.value.map((current, index) => index === itemIndex ? item : current)
}
</script>

<template>
  <Dialog
    :open="setEditorOpen"
    :title="setEditorMode === 'create' ? $t('editor.create') : $t('editor.edit')"
    :description="setEditorMode === 'create' ? $t('editor.createDescription') : $t('editor.editDescription')"
    width-class="max-w-4xl"
    @close="closeSetEditor"
  >
    <div class="space-y-5">
      <div class="flex flex-col gap-1.5 text-left">
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">{{ $t('editor.setName') }}</label>
        <Input v-model="setEditorName" :placeholder="$t('editor.setName')" />
      </div>

      <div v-if="setEditorMode === 'edit'" class="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
        <EditorItemCard
          v-for="(item, itemIndex) in setEditorDraftItems"
          :key="item.id"
          :item="item"
          :item-index="itemIndex"
          @remove="removeEditorItem(itemIndex)"
          @update:item="updateEditorItem(itemIndex, $event)"
        />

        <Button variant="outline" class="w-full gap-2 border-dashed py-3.5" @click="addEditorItem">
          <Plus class="h-4 w-4" />
          <span>{{ $t('editor.addWord') }}</span>
        </Button>
      </div>

      <StatusMessage v-if="setEditorError" tone="error">
        {{ setEditorError }}
      </StatusMessage>

      <DialogFooter>
        <Button variant="outline" @click="closeSetEditor">
          {{ $t('editor.cancel') }}
        </Button>
        <Button variant="default" @click="saveSetEditor">
          {{ $t('editor.save') }}
        </Button>
      </DialogFooter>
    </div>
  </Dialog>
</template>
