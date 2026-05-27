import { createRouter, createWebHistory } from 'vue-router'
import FlashcardsView from '@/components/FlashcardsView.vue'
import HomeView from '@/components/HomeView.vue'
import PracticeView from '@/components/PracticeView.vue'
import ResultView from '@/components/ResultView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/flashcard/:setId',
      name: 'flashcard',
      component: FlashcardsView,
      props: true,
    },
    {
      path: '/quiz/:setId',
      name: 'quiz',
      component: PracticeView,
      props: { mode: 'quiz' },
    },
    {
      path: '/spelling/:setId',
      name: 'spelling',
      component: PracticeView,
      props: { mode: 'spelling' },
    },
    {
      path: '/result',
      name: 'result',
      component: ResultView,
    },
  ],
})

export default router
