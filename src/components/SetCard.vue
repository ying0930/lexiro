<script setup lang="ts">
import { BookOpenText, PencilLine, Play, SpellCheck2, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import Button from './ui/button/Button.vue'
import Card from './ui/card/Card.vue'

defineProps<{
  set: { id: string, setName: string, difficulty: number, items: any[] }
  active?: boolean
}>()

defineEmits<{
  flashcards: [setId: string]
  quiz: [setId: string]
  spelling: [setId: string]
  delete: [setId: string]
  edit: [setId: string]
}>()

const { t } = useI18n()
</script>

<template>
  <Card
    class="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    :glow="false"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1.5 text-left">
        <h3 class="text-base sm:text-lg font-bold tracking-tight text-ink-950 dark:text-ink-50">
          {{ set.setName }}
        </h3>
        <p class="text-xs text-ink-400 dark:text-ink-500 font-medium">
          {{ $t('home.wordsCount', { count: set.items.length }) }}
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 leading-none">
          難度 {{ set.difficulty }}
        </span>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-ink-500 hover:text-ink-950 dark:hover:text-ink-50 hover:bg-ink-100 dark:hover:bg-ink-800"
          :aria-label="t('setCard.edit')"
          @click="$emit('edit', set.id)"
        >
          <PencilLine class="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          :aria-label="t('setCard.delete')"
          @click="$emit('delete', set.id)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <div class="mt-6 grid gap-2 sm:grid-cols-3">
      <Button variant="outline" class="w-full justify-center gap-2" @click="$emit('flashcards', set.id)">
        <BookOpenText class="h-4 w-4" />
        <span>{{ $t('setCard.flashcards') }}</span>
      </Button>

      <Button variant="default" class="w-full justify-center gap-2" @click="$emit('quiz', set.id)">
        <Play class="h-4 w-4" />
        <span>{{ $t('setCard.quiz') }}</span>
      </Button>

      <Button variant="outline" class="w-full justify-center gap-2" @click="$emit('spelling', set.id)">
        <SpellCheck2 class="h-4 w-4" />
        <span>{{ $t('setCard.spelling') }}</span>
      </Button>
    </div>
  </Card>
</template>
