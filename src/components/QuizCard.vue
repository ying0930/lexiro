<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { cn } from '@/lib/cn'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'

const props = defineProps<{
  entry: { item: { word: string, pos: string, meaning: string, example: string, question: { prompt: string, opts: string[], ans: number } } }
  index: number
  total: number
  review?: boolean
  draft: { selectedIndex: number | null } | null
}>()

const emit = defineEmits<{
  'draft-change': [payload: { selectedIndex: number | null }]
  'next': []
  'toast': [message: string]
}>()

const labels = ['A', 'B', 'C', 'D']
const selectedIndex = ref<number | null>(null)
const answered = ref(false)

const answerText = computed(() => props.entry.item.question.opts[props.entry.item.question.ans])
const promptParts = computed(() => props.entry.item.question.prompt.split('_____'))
const hasBlank = computed(() => props.entry.item.question.prompt.includes('_____'))

watch(
  () => props.draft?.selectedIndex,
  (val) => {
    selectedIndex.value = val ?? null
    answered.value = val !== null && val !== undefined
  },
  { immediate: true },
)

function choose(index: number) {
  if (answered.value)
    return
  answered.value = true
  selectedIndex.value = index
  emit('draft-change', { selectedIndex: index })
}

function next() {
  emit('next')
}

function optionClass(index: number) {
  const isCorrect = index === props.entry.item.question.ans
  const isSelected = index === selectedIndex.value

  return cn(
    'flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 outline-none',
    !answered.value && 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-850 active:scale-[98%] focus-visible:ring-2 focus-visible:ring-emerald-500/20',
    !answered.value && isSelected && 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20',
    answered.value && 'cursor-default',
    answered.value && isCorrect && 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-500/5 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold ring-2 ring-emerald-500/10',
    answered.value && isSelected && !isCorrect && 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 ring-2 ring-red-500/10',
    answered.value && !isSelected && !isCorrect && 'border-ink-200 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-900 text-ink-400 dark:text-ink-500 opacity-60',
  )
}
</script>

<template>
  <Card class="p-6 sm:p-8" :glow="false">
    <!-- Question Block (題幹) -->
    <div class="rounded-2xl bg-ink-100/50 dark:bg-ink-900/40 border border-ink-200/50 dark:border-ink-800/50 p-5 text-left">
      <p class="text-xs font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
        題幹
      </p>
      <p class="mt-3 text-[15px] leading-relaxed text-ink-800 dark:text-ink-200 font-medium sm:text-base">
        <template v-if="!answered && hasBlank">
          {{ promptParts[0] }}
          <span class="mx-1.5 inline-block w-16 border-b-2 border-ink-300 dark:border-ink-700 align-middle" />
          {{ promptParts.slice(1).join('_____') }}
        </template>
        <template v-else-if="answered && hasBlank">
          {{ props.entry.item.question.prompt.replace('_____', answerText) }}
        </template>
        <template v-else>
          {{ props.entry.item.question.prompt }}
        </template>
      </p>
    </div>

    <!-- Options Grid -->
    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <button
        v-for="(option, optionIndex) in entry.item.question.opts"
        :key="`${optionIndex}`"
        :class="optionClass(optionIndex)"
        :disabled="answered"
        @click="choose(optionIndex)"
      >
        <span class="shrink-0 text-ink-400 dark:text-ink-500 font-bold">{{ labels[optionIndex] }}.</span>
        <span class="text-ink-800 dark:text-ink-200">{{ option }}</span>
      </button>
    </div>

    <!-- Explanation Block (shown immediately after answering) -->
    <div v-if="answered" class="mt-6 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 text-left transition-all duration-300">
      <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
        {{ selectedIndex === entry.item.question.ans ? $t('result.correct') : $t('result.wrong') }}
      </p>
      <p class="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
        {{ $t('result.correctAnswer') }}：<span class="font-bold text-emerald-600 dark:text-emerald-400"> {{ answerText }}</span>。
        <span class="block mt-1 font-medium text-ink-800 dark:text-ink-200">{{ entry.item.meaning }}</span>
      </p>
    </div>

    <!-- Skip / Next -->
    <div class="mt-6 flex justify-end">
      <Button variant="default" class="gap-2" @click="next">
        <span>{{ answered ? (index + 1 >= total ? $t('practice.submitAll') : $t('practice.next')) : $t('practice.skip') }}</span>
        <ArrowRight class="h-4 w-4" />
      </Button>
    </div>
  </Card>
</template>
