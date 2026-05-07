<script setup>
import Card from './ui/card/Card.vue'

const props = defineProps({
  item: { type: Object, default: null },
  index: { type: Number, required: true },
})
</script>

<template>
  <Card v-if="item" class="border-zinc-200 p-6 sm:p-7">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{{ item.word }}</h2>
        <p v-if="item.pos" class="mt-2 text-sm font-medium text-amber-700">{{ item.pos }}</p>
      </div>
      <div class="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
        <p class="text-xs text-zinc-400">第 {{ index + 1 }} 張</p>
      </div>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
      <div class="rounded-2xl bg-amber-50 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/70">中文意思</p>
        <p class="mt-3 text-lg leading-8 text-zinc-900">{{ item.meaning }}</p>
      </div>
      <div class="rounded-2xl bg-zinc-50 p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">例句</p>
        <p class="mt-3 text-[15px] leading-7 text-zinc-700 sm:text-base">{{ item.example }}</p>
      </div>
    </div>
  </Card>
</template>
