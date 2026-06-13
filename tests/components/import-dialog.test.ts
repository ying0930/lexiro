// @vitest-environment happy-dom

import type { VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ImportDialog from '@/components/dialogs/ImportDialog.vue'
import { i18n } from '@/lib/i18n'
import { useSetsStore } from '@/stores/sets'

function findButton(label: string): HTMLButtonElement {
  const button = Array.from(document.body.querySelectorAll('button')).find(element =>
    element.textContent?.includes(label),
  )

  if (!(button instanceof HTMLButtonElement)) {
    throw new TypeError(`Button not found: ${label}`)
  }

  return button
}

function mountImportDialog() {
  const pinia = createPinia()
  const wrapper = mount(ImportDialog, {
    attachTo: document.body,
    global: {
      plugins: [pinia, i18n],
    },
  })
  const store = useSetsStore(pinia)

  return { store, wrapper }
}

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('import dialog', () => {
  it('keeps the dialog open and shows the JSON step after clicking next', async () => {
    const mounted = mountImportDialog()
    wrapper = mounted.wrapper
    const { store } = mounted

    store.openImport()
    await nextTick()

    expect(store.importOpen).toBe(true)
    expect(document.body.textContent).toContain('請輸入想學習的單字')

    findButton('下一步').click()
    await nextTick()

    expect(store.importOpen).toBe(true)
    expect(store.importStep).toBe(2)
    expect(document.body.textContent).toContain('或者直接貼上 JSON')
    expect(document.body.textContent).toContain('匯入')
    expect(document.body.querySelector('textarea')?.getAttribute('placeholder')).toContain('{"items"')
  })

  it('opens the set editor after importing valid JSON from the second step', async () => {
    const mounted = mountImportDialog()
    wrapper = mounted.wrapper
    const { store } = mounted

    store.openImport()
    store.nextImportStep()
    store.importJson = JSON.stringify({
      setName: 'Fruits',
      items: [
        {
          word: 'apple',
          meaning: '蘋果',
          example: 'I eat an apple.',
          question: {
            prompt: '蘋果的英文是？',
            opts: ['apple', 'banana', 'cherry', 'date'],
            ans: 0,
          },
        },
      ],
    })
    await nextTick()

    findButton('匯入').click()
    await nextTick()

    expect(store.importOpen).toBe(false)
    expect(store.setEditorOpen).toBe(true)
    expect(store.setEditorMode).toBe('create')
    expect(store.pendingSetItems).toHaveLength(1)
    expect(store.pendingSetItems[0].word).toBe('apple')
  })
})
