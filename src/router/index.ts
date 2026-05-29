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
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})
router.onError((error) => {
  const isChunkError = error.message.includes('Failed to fetch dynamically imported module')
    || error.message.includes('Importing a module script failed')
  if (isChunkError) {
    window.location.reload()
  }
})

export default router
