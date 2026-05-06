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
    :class="active ? 'ring-1 ring-amber-300' : ''"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold text-zinc-950">{{ set.setName }}</h3>
        <p class="text-sm text-zinc-500">{{ set.items.length }} 個單字</p>
      </div>
      <Badge :variant="active ? 'default' : 'secondary'">
        {{ active ? '目前單字集' : '可開始' }}
      </Badge>
    </div>

    <p class="mt-4 text-sm leading-6 text-zinc-500">
      每筆資料包含單字、詞性、字義、例句與一題選擇題，可切換不同練習模式。
    </p>

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
