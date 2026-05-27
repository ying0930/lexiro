import type { Ref } from 'vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const WINDOW_SIZE = 35
const STEP = 15

export function useVirtualList<T>(
  items: Ref<T[]>,
  topSentinel: Ref<HTMLElement | null>,
  bottomSentinel: Ref<HTMLElement | null>,
) {
  const windowStart = ref(0) as Ref<number>
  const windowEnd = ref(Math.min(STEP, items.value.length)) as Ref<number>

  const visibleItems = computed(() =>
    items.value.slice(windowStart.value, windowEnd.value),
  )

  let topObserver: IntersectionObserver | null = null
  let bottomObserver: IntersectionObserver | null = null

  function slideDown() {
    const remaining = items.value.length - windowEnd.value
    if (remaining <= 0)
      return
    const move = Math.min(STEP, remaining)
    windowStart.value += move
    windowEnd.value = Math.min(windowStart.value + WINDOW_SIZE, items.value.length)
  }

  function slideUp() {
    if (windowStart.value <= 0)
      return
    const move = Math.min(STEP, windowStart.value)
    windowStart.value -= move
    windowEnd.value = Math.min(windowStart.value + WINDOW_SIZE, items.value.length)
  }

  function setupObservers() {
    topObserver?.disconnect()
    bottomObserver?.disconnect()
    windowStart.value = 0
    windowEnd.value = Math.min(STEP, items.value.length)

    topObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && windowStart.value > 0)
        slideUp()
    }, { rootMargin: '400px' })

    bottomObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && windowEnd.value < items.value.length)
        slideDown()
    }, { rootMargin: '400px' })

    if (topSentinel.value)
      topObserver.observe(topSentinel.value)
    if (bottomSentinel.value)
      bottomObserver.observe(bottomSentinel.value)
  }

  onMounted(setupObservers)

  onUnmounted(() => {
    topObserver?.disconnect()
    bottomObserver?.disconnect()
  })

  watch(() => items.value.length, () => {
    setupObservers()
  })

  return {
    visibleItems,
    windowStart,
    windowEnd,
  }
}
