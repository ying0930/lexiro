<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'

const props = defineProps({
  item: { type: Object, default: null },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
})

defineEmits(['prev', 'next'])

const isFirst = computed(() => props.index === 0)
const isLast = computed(() => props.index === props.total - 1)
</script>

<template>
  <Card v-if="item" class="border-zinc-200 p-6 sm:p-7">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Word Card</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{{ item.word }}</h2>
        <p v-if="item.pos" class="mt-2 text-sm font-medium text-amber-700">{{ item.pos }}</p>
      </div>
      <div class="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
        <p class="text-xs text-zinc-400">進度</p>
        <p class="mt-1 text-lg font-semibold text-zinc-950">{{ index + 1 }} / {{ total }}</p>
      </div>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
      <div class="rounded-2xl bg-amber-50 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/70">Meaning</p>
        <p class="mt-3 text-lg leading-8 text-zinc-900">{{ item.meaning }}</p>
      </div>
      <div class="rounded-2xl bg-zinc-50 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Example</p>
        <p class="mt-3 text-[15px] leading-7 text-zinc-700 sm:text-base">{{ item.example }}</p>
      </div>
    </div>

    <div class="mt-8 flex items-center justify-between gap-3">
      <Button variant="outline" :disabled="isFirst" @click="$emit('prev')">
        <ChevronLeft class="h-4 w-4" />
        上一張
      </Button>
      <Button variant="outline" :disabled="isLast" @click="$emit('next')">
        下一張
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </Card>
</template>
