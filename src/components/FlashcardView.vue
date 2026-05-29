<script setup lang="ts">
import Badge from './ui/badge/Badge.vue'
import Card from './ui/card/Card.vue'

defineProps<{
  item: { word: string, pos: string, meaning: string, example: string } | null
  index: number
}>()
</script>

<template>
  <Card v-if="item" class="p-6 sm:p-8 border border-ink-200/60 dark:border-ink-200/5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-4 text-left">
      <div class="space-y-2">
        <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50">
          {{ item.word }}
        </h2>
        <Badge v-if="item.pos" variant="default" class="text-xs uppercase tracking-wider font-semibold rounded-lg px-2.5 py-0.5">
          {{ item.pos }}
        </Badge>
      </div>

      <Badge variant="secondary" class="rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400 border-none bg-ink-100 dark:bg-ink-100/50">
        第 {{ index + 1 }} 張
      </Badge>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-2 text-left">
      <div class="rounded-2xl bg-accent-primary/5 dark:bg-accent-primary/10 border border-accent-primary/10 p-6 flex flex-col justify-between">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-widest text-accent-primary">
            {{ $t('flashcard.meaning') }}
          </p>
          <p class="mt-4 text-base sm:text-lg font-bold leading-relaxed text-ink-950 dark:text-ink-50">
            {{ item.meaning }}
          </p>
        </div>
      </div>

      <div class="rounded-2xl bg-ink-100 dark:bg-ink-100/30 border border-ink-200/40 dark:border-ink-200/5 p-6">
        <p class="text-xs font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
          {{ $t('flashcard.example') }}
        </p>
        <p class="mt-4 text-[15px] sm:text-base leading-relaxed text-ink-700 dark:text-ink-300 font-medium">
          {{ item.example }}
        </p>
      </div>
    </div>
  </Card>
</template>
