<script setup>
import { BookOpenText, Play, SpellCheck2, Trash2 } from 'lucide-vue-next'
import Badge from './ui/badge/Badge.vue'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'

defineProps({
  set: { type: Object, required: true },
  active: { type: Boolean, default: false },
})

defineEmits(['flashcards', 'quiz', 'spelling', 'delete'])
</script>

<template>
  <Card
    class="border-zinc-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold text-zinc-950">{{ set.setName }}</h3>
        <p class="text-sm text-zinc-500">{{ set.items.length }} 個單字</p>
      </div>
      <Badge v-if="active" variant="secondary">進行中</Badge>
    </div>


    <div class="mt-5 grid gap-2 sm:grid-cols-2">
      <Button variant="outline" class="justify-start" @click="$emit('flashcards', set.id)">
        <BookOpenText class="h-4 w-4" />
        單字卡
      </Button>
      <Button class="justify-start" @click="$emit('quiz', set.id)">
        <Play class="h-4 w-4" />
        開始練習
      </Button>
      <Button variant="outline" class="justify-start" @click="$emit('spelling', set.id)">
        <SpellCheck2 class="h-4 w-4" />
        拼字測試
      </Button>
      <Button
        variant="outline"
        class="justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        @click="$emit('delete', set.id)"
      >
        <Trash2 class="h-4 w-4" />
        刪除
      </Button>
    </div>
  </Card>
</template>
