<script setup>
import { computed, ref, watch } from 'vue'
import Badge from './ui/badge/Badge.vue'
import Card from './ui/card/Card.vue'
import Button from './ui/button/Button.vue'
import { ClipboardCopy, Check } from 'lucide-vue-next'
import PROMPTS from '../../prompts.js'
import { cn } from '../lib/utils'

const props = defineProps({
  entry: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  review: { type: Boolean, default: false },
  draft: { type: Object, default: null },
  batchMode: { type: Boolean, default: false },
})

const emit = defineEmits(['draft-change', 'toast'])

const labels = ['A', 'B', 'C', 'D']
const selectedIndex = ref(null)
const answered = ref(false)
const copied = ref(false)

const answerText = computed(() => props.entry.item.question.opts[props.entry.item.question.ans])
const promptParts = computed(() => props.entry.item.question.prompt.split('_____'))
const hasBlank = computed(() => props.entry.item.question.prompt.includes('_____'))

watch(
  [() => props.entry, () => props.draft],
  () => {
    selectedIndex.value = props.draft?.selectedIndex ?? null
    answered.value = props.batchMode ? false : Boolean(props.draft?.answered)
  },
  { immediate: true, deep: true },
)

watch([selectedIndex, answered], () => {
  emit('draft-change', {
    selectedIndex: selectedIndex.value,
    answered: answered.value,
  })
})

function choose(index) {
  if (!props.batchMode && answered.value) return
  selectedIndex.value = index
}

async function copyExplanationPrompt() {
  const q = props.entry.item.question
  const questionStr = q.prompt
  const optionsStr = q.opts.map((opt, i) => `${labels[i]}. ${opt}`).join('\n')
  const userAnswerStr = selectedIndex.value !== null ? q.opts[selectedIndex.value] : '未作答'
  const correctAnswerStr = q.opts[q.ans]
  const meaningStr = props.entry.item.meaning || ''
  const exampleStr = props.entry.item.example || ''

  const text = PROMPTS.explainQuestion
    .replace('{{QUESTION}}', questionStr)
    .replace('{{OPTIONS}}', optionsStr)
    .replace('{{USER_ANSWER}}', userAnswerStr)
    .replace('{{CORRECT_ANSWER}}', correctAnswerStr)
    .replace('{{MEANING}}', meaningStr)
    .replace('{{EXAMPLE}}', exampleStr)

  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    emit('toast', '已複製此題解析指令，請貼至 AI 平台獲得解析')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    emit('toast', '複製失敗')
    console.error('Failed to copy text: ', err)
  }
}

function optionClass(index) {
  const isCorrect = index === props.entry.item.question.ans
  const isSelected = index === selectedIndex.value

  return cn(
    'flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 outline-none',
    // Normal Interactive State
    !answered.value && 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-850 active:scale-[98%] focus-visible:ring-2 focus-visible:ring-emerald-500/20',
    // Selected State (Not Submitted)
    !answered.value && isSelected && 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20',
    // Answered / Submitted State
    answered.value && 'cursor-default',
    // Correct Option Highlighting
    answered.value && isCorrect && 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-500/5 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold ring-2 ring-emerald-500/10',
    // Selected and Incorrect Option Highlighting
    answered.value && isSelected && !isCorrect && 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 ring-2 ring-red-500/10',
    // Unselected and Incorrect Option Highlighting
    answered.value && !isSelected && !isCorrect && 'border-ink-200 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-900 text-ink-400 dark:text-ink-500 opacity-60',
  )
}
</script>

<template>
  <Card class="p-6 sm:p-8" :glow="true">
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Badge :variant="review ? 'destructive' : 'indigo'" class="text-[10px] px-2 py-0.5 font-semibold">
            {{ review ? '錯題複習' : '選擇練習' }}
          </Badge>
          <span class="text-xs font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-wider">
            第 {{ index + 1 }} / {{ total }} 題
          </span>
        </div>
      </div>
      
      <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <Badge variant="secondary" class="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-ink-100 dark:bg-ink-800 border-none">
          {{ batchMode ? '待送出' : answered ? '已完成' : '進行中' }}
        </Badge>
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs text-ink-600 dark:text-ink-400 px-3 hover:bg-ink-100 dark:hover:bg-ink-800" @click="copyExplanationPrompt">
          <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-600" />
          <ClipboardCopy v-else class="h-3.5 w-3.5" />
          <span>{{ copied ? '已複製' : 'AI 解析' }}</span>
        </Button>
      </div>
    </div>

    <!-- Question Block (題幹) -->
    <div class="rounded-2xl bg-ink-100/50 dark:bg-ink-900/40 border border-ink-200/50 dark:border-ink-800/50 p-5 text-left">
      <p class="text-xs font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">題幹</p>
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
        :key="`${entry.item.id}-${optionIndex}`"
        :class="optionClass(optionIndex)"
        :disabled="answered"
        @click="choose(optionIndex)"
      >
        <span class="shrink-0 text-ink-400 dark:text-ink-500 font-bold">{{ labels[optionIndex] }}.</span>
        <span class="text-ink-800 dark:text-ink-200">{{ option }}</span>
      </button>
    </div>

    <!-- Explanation Block (Single Mode Answered) -->
    <div v-if="!batchMode && answered" class="mt-6 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 text-left transition-all duration-300">
      <p class="text-sm font-bold text-ink-950 dark:text-ink-50">
        {{
          selectedIndex === entry.item.question.ans
            ? '答案正確'
            : selectedIndex === null
              ? '已略過此題'
              : '答案錯誤'
        }}
      </p>
      <p class="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
        正解是 <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ answerText }}</span>。
        <span class="block mt-1 font-medium text-ink-800 dark:text-ink-200">{{ entry.item.meaning }}</span>
      </p>
    </div>
  </Card>
</template>
