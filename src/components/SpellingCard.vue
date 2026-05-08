<script setup>
import { computed, ref, watch } from 'vue'
import Badge from './ui/badge/Badge.vue'
import Card from './ui/card/Card.vue'
import Input from './ui/input/Input.vue'
import Button from './ui/button/Button.vue'
import { ClipboardCopy, Check } from 'lucide-vue-next'
import PROMPTS from '../../prompts.js'

const props = defineProps({
  entry: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  review: { type: Boolean, default: false },
  draft: { type: Object, default: null },
  batchMode: { type: Boolean, default: false },
})

const emit = defineEmits(['draft-change', 'toast'])

const answer = ref('')
const submitted = ref(false)
const copied = ref(false)

function escapeRegExp(text) {
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
  [() => props.entry, () => props.draft],
  () => {
    answer.value = props.draft?.answer ?? ''
    submitted.value = props.batchMode ? false : Boolean(props.draft?.submitted)
  },
  { immediate: true, deep: true },
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
    emit('toast', '已複製此題解析指令，請貼至 AI 平台獲得解析')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    emit('toast', '複製失敗')
    console.error('Failed to copy text: ', err)
  }
}
</script>

<template>
  <Card class="border-zinc-200 p-5 sm:p-6">
    <div class="mb-5 flex items-start justify-between gap-4">
      <div class="space-y-2">
        <Badge variant="secondary">{{ review ? '錯題復習' : '拼字測試' }}</Badge>
        <p class="text-sm text-zinc-500">第 {{ index + 1 }} / {{ total }} 題</p>
      </div>
      <div class="flex flex-col items-end gap-2 text-right">
        <div class="text-right">
          <p class="text-xs text-zinc-400">中文意思</p>
          <p class="text-sm font-semibold text-zinc-900">{{ entry.item.meaning }}</p>
        </div>
        <div class="flex flex-col items-end gap-2 mt-2">
          <Badge variant="secondary" class="rounded-full px-3 py-1 text-xs font-medium">
            {{ batchMode ? '待送出' : submitted ? '已完成' : '進行中' }}
          </Badge>
          <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs text-zinc-600" @click="copyExplanationPrompt">
            <Check v-if="copied" class="h-3.5 w-3.5 text-green-600" />
            <ClipboardCopy v-else class="h-3.5 w-3.5" />
            {{ copied ? '已複製' : '複製本題解析' }}
          </Button>
        </div>
      </div>
    </div>

    <div class="rounded-2xl bg-zinc-50 p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">例句</p>
      <p class="mt-3 text-[15px] leading-7 text-zinc-800 sm:text-base">{{ blankedExample }}</p>
    </div>

    <div class="mt-5 space-y-3">
      <label class="text-sm font-medium text-zinc-700">請輸入完整英文單字</label>
      <Input
        v-model="answer"
        placeholder="輸入單字"
        :disabled="submitted"
        @keydown.enter.prevent="submit"
      />
      <p class="text-xs text-zinc-500">判定會忽略大小寫與前後空白，其餘需完全正確。留白送出會視為跳過。</p>
    </div>

    <div v-if="!batchMode && submitted" class="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
      <p class="text-sm font-semibold text-zinc-900">
        {{ isCorrect ? '正確' : answer.trim() ? '錯誤' : '略過' }}
      </p>
      <p class="mt-2 text-sm leading-6 text-zinc-600">
        正解是 <span class="font-semibold text-zinc-950">{{ entry.item.word }}</span>
        <span v-if="entry.item.pos">（{{ entry.item.pos }}）</span>，
        {{ entry.item.meaning }}
      </p>
    </div>
  </Card>
</template>
