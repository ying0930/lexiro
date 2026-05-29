<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'
import Input from './ui/input/Input.vue'

const props = defineProps<{
  entry: { item: { word: string, pos: string, meaning: string, example: string } }
  index: number
  total: number
  review?: boolean
  draft: { answer: string } | null
}>()

const emit = defineEmits<{
  'draft-change': [payload: { answer: string }]
  'next': []
  'toast': [message: string]
}>()

const answer = ref('')
const submitted = ref(false)

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const wordHint = computed(() => {
  const word = props.entry.item.word
  if (word.length <= 1)
    return word
  return `${word[0]}${'＿'.repeat(word.length - 2)}${word[word.length - 1]}`
})

const blankedExample = computed(() => {
  const word = props.entry.item.word
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i')

  if (regex.test(props.entry.item.example)) {
    return props.entry.item.example.replace(regex, '_____')
  }

  return props.entry.item.example
})

const normalizedAnswer = computed(() => answer.value.trim().toLowerCase())
const normalizedWord = computed(() => props.entry.item.word.trim().toLowerCase())
const isCorrect = computed(() => normalizedAnswer.value === normalizedWord.value)

watch(
  [() => props.draft?.answer, () => props.entry],
  ([ans]) => {
    answer.value = ans ?? ''
    submitted.value = Boolean(ans)
  },
  { immediate: true },
)

function submit() {
  if (submitted.value)
    return
  submitted.value = true
  emit('draft-change', { answer: answer.value })
}

function next() {
  emit('next')
}
</script>

<template>
  <Card class="p-6 sm:p-8 border border-ink-200/50 dark:border-ink-200/5 shadow-sm">
    <!-- Word hint: first and last letter -->
    <div class="mb-6 text-left">
      <p class="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-accent-primary">
        {{ wordHint }}
      </p>
    </div>

    <!-- Example Block (例句) -->
    <div class="rounded-2xl bg-ink-100 dark:bg-ink-100/30 border border-ink-200/40 dark:border-ink-200/5 p-5 text-left">
      <p class="text-xs font-extrabold uppercase tracking-widest text-ink-400 dark:text-ink-500">
        {{ $t('flashcard.example') }}
      </p>
      <p class="mt-3 text-[15px] leading-relaxed text-ink-950 dark:text-ink-50 font-bold sm:text-base">
        {{ blankedExample }}
      </p>
    </div>

    <!-- Answer Input Block -->
    <div v-if="!submitted" class="mt-6 space-y-2 text-left">
      <label class="text-xs font-extrabold uppercase tracking-wider text-ink-500 dark:text-ink-400">
        {{ $t('spelling.inputLabel') }}
      </label>
      <div class="flex gap-3">
        <Input
          v-model="answer"
          :placeholder="$t('spelling.placeholder')"
          class="flex-1 font-mono text-base tracking-wide rounded-xl"
          @keydown.enter.prevent="submit"
        />
        <Button variant="default" class="shrink-0 rounded-xl" @click="submit">
          {{ $t('result.check') }}
        </Button>
      </div>
      <p class="text-[11px] text-ink-400 dark:text-ink-500 leading-relaxed font-semibold">
        {{ $t('spelling.inputHint') }}
      </p>
    </div>

    <!-- Explanation Block (shown immediately after submitting) -->
    <div v-if="submitted" class="mt-6 rounded-2xl border border-ink-200/60 dark:border-ink-200/5 bg-ink-100 dark:bg-ink-100/30 p-5 text-left transition-all duration-300">
      <p class="text-sm font-extrabold" :class="[isCorrect ? 'text-emerald-600 dark:text-emerald-400' : answer.trim() ? 'text-red-500' : 'text-ink-500']">
        {{ isCorrect ? $t('result.correct') : answer.trim() ? $t('result.wrong') : $t('result.skipped') }}
      </p>
      <p class="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
        {{ $t('result.correctAnswer') }}：<span class="font-bold text-emerald-600 dark:text-emerald-400"> {{ entry.item.word }}</span>
        <span v-if="entry.item.pos" class="font-bold text-accent-primary">（{{ entry.item.pos }}）</span>，
        <span class="block mt-2 font-semibold text-ink-950 dark:text-ink-50">{{ entry.item.meaning }}</span>
      </p>

      <Button variant="default" class="mt-4 gap-2 rounded-xl" @click="next">
        <span>{{ index + 1 >= total ? $t('practice.submitAll') : $t('practice.next') }}</span>
        <ArrowRight class="h-4 w-4" />
      </Button>
    </div>
  </Card>
</template>
