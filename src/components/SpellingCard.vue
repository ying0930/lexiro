<script setup lang="ts">
import { Check, ClipboardCopy } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PROMPTS from '@/lib/prompts'
import Badge from './ui/badge/Badge.vue'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'
import Input from './ui/input/Input.vue'

const props = defineProps<{
  entry: { item: { word: string, pos: string, meaning: string, example: string } }
  index: number
  total: number
  review?: boolean
  draft: { answer: string, submitted?: boolean } | null
  batchMode?: boolean
}>()

const emit = defineEmits<{
  'draft-change': [payload: { answer: string, submitted: boolean }]
  'toast': [message: string]
}>()

const { t } = useI18n()

const answer = ref('')
const submitted = ref(false)
const copied = ref(false)

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
  [() => props.entry, () => props.draft?.answer, () => props.draft?.submitted],
  ([, ans, sub]) => {
    answer.value = ans ?? ''
    submitted.value = props.batchMode ? false : Boolean(sub)
  },
  { immediate: true },
)

watch([answer, submitted], () => {
  emit('draft-change', {
    answer: answer.value,
    submitted: submitted.value,
  })
})

function submit() {
  submitted.value = true
}

async function copyExplanationPrompt() {
  const text = PROMPTS.explainSpellingQuestion
    .replace('{{MEANING}}', props.entry.item.meaning)
    .replace('{{EXAMPLE}}', props.entry.item.example)
    .replace('{{USER_ANSWER}}', answer.value.trim() || '未作答')
    .replace('{{CORRECT_ANSWER}}', props.entry.item.word)

  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    emit('toast', t('result.copiedAiPromptSingle', { word: props.entry.item.word }))
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  catch (err) {
    emit('toast', t('toast.copyFailed'))
    console.error('Failed to copy text: ', err)
  }
}
</script>

<template>
  <Card class="p-6 sm:p-8" :glow="false">
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Badge :variant="review ? 'destructive' : 'secondary'" class="text-[10px] px-2 py-0.5 font-semibold">
            {{ review ? '錯題複習' : $t('setCard.spelling') }}
          </Badge>
          <span class="text-xs font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-wider">
            {{ $t('result.question', { index: index + 1 }) }} / {{ total }} 題
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3 self-start sm:self-auto shrink-0">
        <div class="text-left sm:text-right">
          <p class="text-[10px] uppercase font-bold tracking-wider text-ink-400 dark:text-ink-500">
            {{ $t('flashcard.meaning') }}
          </p>
          <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
            {{ entry.item.meaning }}
          </p>
        </div>

        <div class="flex flex-col items-end gap-1.5 shrink-0 pl-3 border-l border-ink-200 dark:border-ink-800">
          <div class="flex items-center gap-2">
            <Badge variant="secondary" class="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-ink-100 dark:bg-ink-800 border-none">
              {{ batchMode ? '待送出' : submitted ? '已完成' : $t('home.inProgress') }}
            </Badge>
            <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs text-ink-600 dark:text-ink-400 px-3 hover:bg-ink-100 dark:hover:bg-ink-800" @click="copyExplanationPrompt">
              <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-600" />
              <ClipboardCopy v-else class="h-3.5 w-3.5" />
              <span>{{ copied ? '已複製' : $t('result.aiExplain') }}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Example Block (例句) -->
    <div class="rounded-2xl bg-ink-100/50 dark:bg-ink-900/40 border border-ink-200/50 dark:border-ink-800/50 p-5 text-left">
      <p class="text-xs font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
        {{ $t('flashcard.example') }}
      </p>
      <p class="mt-3 text-[15px] leading-relaxed text-ink-800 dark:text-ink-200 font-medium sm:text-base">
        {{ blankedExample }}
      </p>
    </div>

    <!-- Interactive Input Block -->
    <div class="mt-6 space-y-2 text-left">
      <label class="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
        請輸入完整英文單字
      </label>
      <Input
        v-model="answer"
        placeholder="例如：apple"
        :disabled="submitted"
        class="font-mono text-base tracking-wide"
        @keydown.enter.prevent="submit"
      />
      <p class="text-[11px] text-ink-400 dark:text-ink-500 leading-relaxed font-medium">
        判定將忽略大小寫與前後空白。留空送出將被視為略過。
      </p>
    </div>

    <!-- Explanation Block (Single Mode Submitted) -->
    <div v-if="!batchMode && submitted" class="mt-6 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 text-left transition-all duration-300">
      <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
        {{ isCorrect ? $t('result.correct') : answer.trim() ? $t('result.wrong') : $t('result.skipped') }}
      </p>
      <p class="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
        {{ $t('result.correctAnswer') }}：<span class="font-bold text-emerald-600 dark:text-emerald-400"> {{ entry.item.word }}</span>
        <span v-if="entry.item.pos" class="font-semibold text-emerald-500">（{{ entry.item.pos }}）</span>，
        <span class="block mt-1 font-medium text-ink-800 dark:text-ink-200">{{ entry.item.meaning }}</span>
      </p>
    </div>
  </Card>
</template>
