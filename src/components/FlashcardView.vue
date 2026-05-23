<script setup>
import Card from './ui/card/Card.vue'
import Badge from './ui/badge/Badge.vue'

const props = defineProps({
  item: { type: Object, default: null },
  index: { type: Number, required: true },
})
</script>

<template>
  <Card v-if="item" class="p-6 sm:p-8" :glow="true">
    <div class="flex flex-wrap items-start justify-between gap-4 text-left">
      <div class="space-y-2">
        <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">
          {{ item.word }}
        </h2>
        <Badge v-if="item.pos" variant="success" class="text-xs uppercase tracking-wider font-semibold">
          {{ item.pos }}
        </Badge>
      </div>
      
      <Badge variant="secondary" class="rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400 border-none bg-ink-100 dark:bg-ink-800">
        第 {{ index + 1 }} 張
      </Badge>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-2 text-left">
      <div class="rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-100/30 dark:border-emerald-900/40 p-6 flex flex-col justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            中文意思
          </p>
          <p class="mt-4 text-base sm:text-lg font-semibold leading-relaxed text-ink-900 dark:text-ink-100">
            {{ item.meaning }}
          </p>
        </div>
      </div>
      
      <div class="rounded-2xl bg-ink-100/50 dark:bg-ink-900/40 border border-ink-200/50 dark:border-ink-800/50 p-6">
        <p class="text-xs font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
          例句
        </p>
        <p class="mt-4 text-[15px] sm:text-base leading-relaxed text-ink-700 dark:text-ink-300 font-medium">
          {{ item.example }}
        </p>
      </div>
    </div>
  </Card>
</template>
