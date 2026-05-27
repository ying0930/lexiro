import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => false,
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/components/HomeView.vue'),
    },
    {
      path: '/flashcard/:setId',
      name: 'flashcard',
      component: () => import('@/components/FlashcardsView.vue'),
      props: true,
    },
    {
      path: '/quiz/:setId',
      name: 'quiz',
      component: () => import('@/components/PracticeView.vue'),
      props: { mode: 'quiz' },
    },
    {
      path: '/spelling/:setId',
      name: 'spelling',
      component: () => import('@/components/PracticeView.vue'),
      props: { mode: 'spelling' },
    },
    {
      path: '/result',
      name: 'result',
      component: () => import('@/components/ResultView.vue'),
    },
  ],
})

export default router
