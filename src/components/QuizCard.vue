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

const labels = ['1', '2', '3', '4']
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
    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
    !answered.value && 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100',
    !answered.value && isSelected && 'border-amber-300 bg-amber-50 text-zinc-900',
    answered.value && 'cursor-default',
    answered.value && isCorrect && 'border-green-300 bg-green-50 text-green-800',
    answered.value && isSelected && !isCorrect && 'border-red-300 bg-red-50 text-red-800',
    answered.value && !isSelected && !isCorrect && 'border-zinc-200 bg-zinc-50 text-zinc-500',
  )
}
</script>

<template>
  <Card class="border-zinc-200 p-5 sm:p-6">
    <div class="mb-5 flex items-start justify-between gap-4">
      <div class="space-y-2">
        <Badge variant="secondary">{{ review ? '錯題復習' : '選擇題練習' }}</Badge>
        <p class="text-sm text-zinc-500">第 {{ index + 1 }} / {{ total }} 題</p>
      </div>
      <div class="flex flex-col items-end gap-2">
        <Badge variant="secondary" class="rounded-full px-3 py-1 text-xs font-medium">
          {{ batchMode ? '待送出' : answered ? '已完成' : '進行中' }}
        </Badge>
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs text-zinc-600" @click="copyExplanationPrompt">
          <Check v-if="copied" class="h-3.5 w-3.5 text-green-600" />
          <ClipboardCopy v-else class="h-3.5 w-3.5" />
          {{ copied ? '已複製' : '複製本題解析' }}
        </Button>
      </div>
    </div>

    <div class="rounded-2xl bg-zinc-50 p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">題幹</p>
      <p class="mt-3 text-[15px] leading-7 text-zinc-800 sm:text-base">
        <template v-if="!answered && hasBlank">
          {{ promptParts[0] }}
          <span class="mx-1 inline-block w-20 border-b-2 border-zinc-300 align-middle" />
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

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <button
        v-for="(option, optionIndex) in entry.item.question.opts"
        :key="`${entry.item.id}-${optionIndex}`"
        :class="optionClass(optionIndex)"
        :disabled="answered"
        @click="choose(optionIndex)"
      >
        <span class="shrink-0 text-zinc-400">{{ labels[optionIndex] }}</span>
        <span>{{ option }}</span>
      </button>
    </div>

    <div v-if="!batchMode && answered" class="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
      <p class="text-sm font-semibold text-zinc-900">
        {{
          selectedIndex === entry.item.question.ans
            ? '正確'
            : selectedIndex === null
              ? '略過'
              : '錯誤'
        }}
      </p>
      <p class="mt-2 text-sm leading-6 text-zinc-600">
        正解是 <span class="font-semibold text-zinc-950">{{ answerText }}</span>。
        {{ entry.item.meaning }}
      </p>
    </div>
  </Card>
</template>
