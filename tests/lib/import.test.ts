import type { ImportResult, VocabSet } from '@/types'
import { describe, expect, it, vi } from 'vitest'
import {
  applyImportedSets,
  createImportVersionDiff,
  ensureUniqueSetId,
  parseImportJson,
  refreshImportVersionDiffs,
  summarizeDuplicateResult,
} from '@/lib/import'

function makeSet(name: string, words: Array<{ word: string, meaning?: string, example?: string }>): VocabSet {
  return {
    id: `set-${name}`,
    setName: name,
    difficulty: 2,
    items: words.map((w, i) => ({
      id: `w-${i}`,
      word: w.word,
      pos: '',
      meaning: w.meaning ?? 'test meaning',
      example: w.example ?? 'test example',
      question: { prompt: 'Test prompt', opts: ['A', 'B', 'C', 'D'], ans: 0 },
    })),
  }
}

describe('createImportVersionDiff', () => {
  it('returns identical=true for identical sets', () => {
    const local = makeSet('A', [{ word: 'hello' }, { word: 'world' }])
    const imported = makeSet('A', [{ word: 'hello' }, { word: 'world' }])
    const diff = createImportVersionDiff(local, imported)
    expect(diff.identical).toBe(true)
    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
    expect(diff.changed).toEqual([])
    expect(diff.localCount).toBe(2)
    expect(diff.importedCount).toBe(2)
    expect(diff.setName).toBe('A')
    expect(diff.localSetId).toBe('set-A')
  })

  it('detects added words', () => {
    const local = makeSet('A', [{ word: 'hello' }])
    const imported = makeSet('A', [{ word: 'hello' }, { word: 'world' }])
    const diff = createImportVersionDiff(local, imported)
    expect(diff.identical).toBe(false)
    expect(diff.added).toEqual(['world'])
    expect(diff.removed).toEqual([])
    expect(diff.changed).toEqual([])
  })

  it('detects removed words', () => {
    const local = makeSet('A', [{ word: 'hello' }, { word: 'world' }])
    const imported = makeSet('A', [{ word: 'hello' }])
    const diff = createImportVersionDiff(local, imported)
    expect(diff.identical).toBe(false)
    expect(diff.removed).toEqual(['world'])
    expect(diff.added).toEqual([])
    expect(diff.changed).toEqual([])
  })

  it('detects changed words (same word, different content)', () => {
    const local = makeSet('A', [{ word: 'hello', meaning: 'old meaning' }])
    const imported = makeSet('A', [{ word: 'hello', meaning: 'new meaning' }])
    const diff = createImportVersionDiff(local, imported)
    expect(diff.identical).toBe(false)
    expect(diff.changed).toEqual(['hello'])
    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
  })

  it('handles case-insensitive word matching', () => {
    const local = makeSet('A', [{ word: 'Hello' }])
    const imported = makeSet('A', [{ word: 'hello' }, { word: 'WORLD' }])
    const diff = createImportVersionDiff(local, imported)
    expect(diff.identical).toBe(false)
    expect(diff.added).toEqual(['WORLD'])
    expect(diff.changed).toEqual(['hello'])
    expect(diff.removed).toEqual([])
  })

  it('handles empty sets', () => {
    const local = makeSet('A', [])
    const imported = makeSet('A', [{ word: 'hello' }])
    const diff = createImportVersionDiff(local, imported)
    expect(diff.identical).toBe(false)
    expect(diff.added).toEqual(['hello'])
    expect(diff.removed).toEqual([])
  })
})

describe('ensureUniqueSetId', () => {
  it('returns baseId when no conflict', () => {
    expect(ensureUniqueSetId('set-a', new Set(['set-b', 'set-c']))).toBe('set-a')
  })

  it('appends -1 on simple conflict', () => {
    expect(ensureUniqueSetId('set-a', new Set(['set-a']))).toBe('set-a-1')
  })

  it('increments counter for multiple conflicts', () => {
    expect(ensureUniqueSetId('set-a', new Set(['set-a', 'set-a-1', 'set-a-2']))).toBe('set-a-3')
  })

  it('fills gaps in numbering', () => {
    expect(ensureUniqueSetId('set-a', new Set(['set-a', 'set-a-2']))).toBe('set-a-1')
  })

  it('handles empty existing set', () => {
    expect(ensureUniqueSetId('set-a', new Set())).toBe('set-a')
  })
})

describe('refreshImportVersionDiffs', () => {
  it('creates diffs for matching names', () => {
    const local = [makeSet('A', [{ word: 'hello' }])]
    const target = [makeSet('A', [{ word: 'hello' }, { word: 'world' }])]
    const result = refreshImportVersionDiffs(local, target, {})
    expect(result.diffs).toHaveLength(1)
    expect(result.diffs[0].setName).toBe('A')
    expect(result.diffs[0].added).toEqual(['world'])
    expect(result.choices).toEqual({ A: 'local' })
  })

  it('skips target sets with no local match', () => {
    const local = [makeSet('A', [{ word: 'hello' }])]
    const target = [makeSet('B', [{ word: 'world' }])]
    const result = refreshImportVersionDiffs(local, target, {})
    expect(result.diffs).toHaveLength(0)
    expect(result.choices).toEqual({})
  })

  it('preserves existing choices', () => {
    const local = [makeSet('A', [{ word: 'hello' }])]
    const target = [makeSet('A', [{ word: 'world' }])]
    const result = refreshImportVersionDiffs(local, target, { A: 'imported' })
    expect(result.diffs).toHaveLength(1)
    expect(result.choices).toEqual({ A: 'imported' })
  })

  it('matches by trimmed name', () => {
    const local = [makeSet('A', [{ word: 'hello' }])]
    const target = [makeSet(' A ', [{ word: 'world' }])]
    const result = refreshImportVersionDiffs(local, target, {})
    expect(result.diffs).toHaveLength(1)
    expect(result.diffs[0].setName).toBe(' A ')
  })

  it('returns empty for no target sets', () => {
    const local = [makeSet('A', [{ word: 'hello' }])]
    const result = refreshImportVersionDiffs(local, [], {})
    expect(result.diffs).toHaveLength(0)
    expect(result.choices).toEqual({})
  })
})

describe('summarizeDuplicateResult', () => {
  it('generates single message for skippedByName', () => {
    const result: ImportResult = {
      imported: [],
      skippedByName: ['SetA', 'SetB'],
      skippedByContent: [],
      renamedIds: [],
      replacedVersions: [],
    }
    expect(summarizeDuplicateResult(result)).toBe('保留本機版本 2 個：SetA、SetB')
  })

  it('generates single message for replacedVersions', () => {
    const result: ImportResult = {
      imported: [],
      skippedByName: [],
      skippedByContent: [],
      renamedIds: [],
      replacedVersions: ['SetA'],
    }
    expect(summarizeDuplicateResult(result)).toBe('使用匯入版本更新 1 個：SetA')
  })

  it('generates single message for skippedByContent', () => {
    const result: ImportResult = {
      imported: [],
      skippedByName: [],
      skippedByContent: ['SetA'],
      renamedIds: [],
      replacedVersions: [],
    }
    expect(summarizeDuplicateResult(result)).toBe('偵測到重複內容，略過 1 個：SetA')
  })

  it('generates single message for renamedIds', () => {
    const result: ImportResult = {
      imported: [],
      skippedByName: [],
      skippedByContent: [],
      renamedIds: [{ setName: 'SetA', from: 'old', to: 'new' }],
      replacedVersions: [],
    }
    expect(summarizeDuplicateResult(result)).toBe('因 id 衝突已改用新 id：SetA')
  })

  it('combines multiple messages with semicolon separator', () => {
    const result: ImportResult = {
      imported: [],
      skippedByName: ['SetA'],
      skippedByContent: ['SetB'],
      renamedIds: [{ setName: 'SetC', from: 'id1', to: 'id2' }],
      replacedVersions: ['SetD'],
    }
    const text = summarizeDuplicateResult(result)
    expect(text).toContain('保留本機版本 1 個：SetA')
    expect(text).toContain('使用匯入版本更新 1 個：SetD')
    expect(text).toContain('偵測到重複內容，略過 1 個：SetB')
    expect(text).toContain('因 id 衝突已改用新 id：SetC')
  })

  it('returns empty string for empty result', () => {
    const result: ImportResult = {
      imported: [],
      skippedByName: [],
      skippedByContent: [],
      renamedIds: [],
      replacedVersions: [],
    }
    expect(summarizeDuplicateResult(result)).toBe('')
  })
})

describe('applyImportedSets', () => {
  describe('append mode', () => {
    it('appends new sets with no name or content conflict', () => {
      const local = [makeSet('A', [{ word: 'hello' }])]
      const target = [makeSet('B', [{ word: 'world' }]), makeSet('C', [{ word: 'foo' }])]
      const result = applyImportedSets(local, target, 'append', {})
      expect(result.imported).toHaveLength(2)
      expect(result.imported[0].setName).toBe('B')
      expect(result.imported[1].setName).toBe('C')
      expect(result.skippedByName).toEqual([])
      expect(result.skippedByContent).toEqual([])
      expect(result.renamedIds).toEqual([])
      expect(result.replacedVersions).toEqual([])
    })

    it('skips duplicate by name when choice is local', () => {
      const local = [makeSet('A', [{ word: 'hello' }])]
      const target = [makeSet('A', [{ word: 'world' }])]
      const result = applyImportedSets(local, target, 'append', { A: 'local' })
      expect(result.imported).toHaveLength(0)
      expect(result.skippedByName).toEqual(['A'])
      expect(result.replacedVersions).toEqual([])
    })

    it('replaces by name when choice is imported', () => {
      const local = [makeSet('A', [{ word: 'hello' }])]
      const target = [makeSet('A', [{ word: 'world' }])]
      const result = applyImportedSets(local, target, 'append', { A: 'imported' })
      expect(result.imported).toHaveLength(0)
      expect(result.replacedVersions).toEqual(['A'])
      expect(result.skippedByName).toEqual([])
    })

    it('defaults to local when no choice provided', () => {
      const local = [makeSet('A', [{ word: 'hello' }])]
      const target = [makeSet('A', [{ word: 'world' }])]
      const result = applyImportedSets(local, target, 'append', {})
      expect(result.skippedByName).toEqual(['A'])
      expect(result.replacedVersions).toEqual([])
    })

    it('skips duplicate by content signature (different name, same content)', () => {
      const local = [makeSet('A', [{ word: 'hello' }])]
      const target = [makeSet('B', [{ word: 'hello' }])]
      const result = applyImportedSets(local, target, 'append', {})
      expect(result.imported).toHaveLength(0)
      expect(result.skippedByContent).toEqual(['B'])
    })

    it('skips duplicate content within the same import batch', () => {
      const local = [makeSet('A', [{ word: 'hello' }])]
      const target = [
        makeSet('B', [{ word: 'world' }]),
        makeSet('C', [{ word: 'world' }]),
      ]
      const result = applyImportedSets(local, target, 'append', {})
      expect(result.imported).toHaveLength(1)
      expect(result.imported[0].setName).toBe('B')
      expect(result.skippedByContent).toEqual(['C'])
    })

    it('renames sets when ID conflicts with existing', () => {
      const local = [makeSet('A', [{ word: 'hello' }])]
      const target = [{ ...makeSet('B', [{ word: 'world' }]), id: 'set-A' }]
      const result = applyImportedSets(local, target, 'append', {})
      expect(result.imported).toHaveLength(1)
      expect(result.imported[0].id).not.toBe('set-A')
      expect(result.renamedIds).toHaveLength(1)
      expect(result.renamedIds[0].from).toBe('set-A')
      expect(result.renamedIds[0].to).not.toBe('set-A')
    })

    it('does not add to renamedIds when ID is unique', () => {
      const local = [makeSet('A', [{ word: 'hello' }])]
      const target = [{ ...makeSet('B', [{ word: 'world' }]), id: 'unique-id' }]
      const result = applyImportedSets(local, target, 'append', {})
      expect(result.renamedIds).toEqual([])
      expect(result.imported[0].id).toBe('unique-id')
    })
  })

  describe('overwrite mode', () => {
    it('replaces all local sets with imported sets', () => {
      const local = [makeSet('A', [{ word: 'hello' }]), makeSet('B', [{ word: 'foo' }])]
      const target = [makeSet('C', [{ word: 'world' }])]
      const result = applyImportedSets(local, target, 'overwrite', {})
      expect(result.imported).toHaveLength(1)
      expect(result.imported[0].setName).toBe('C')
      expect(result.skippedByName).toEqual([])
      expect(result.skippedByContent).toEqual([])
      expect(result.renamedIds).toEqual([])
      expect(result.replacedVersions).toEqual([])
    })

    it('handles duplicate IDs among target sets in overwrite mode', () => {
      const target = [
        { ...makeSet('A', [{ word: 'hello' }]), id: 'dup' },
        { ...makeSet('B', [{ word: 'world' }]), id: 'dup' },
      ]
      const result = applyImportedSets([], target, 'overwrite', {})
      expect(result.imported).toHaveLength(2)
      expect(result.imported[0].id).toBe('dup')
      expect(result.imported[1].id).toBe('dup-1')
    })

    it('generates fallback IDs when target set has no id', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(1704067200000))
      const target = [{ ...makeSet('A', [{ word: 'hello' }]), id: '' }]
      const result = applyImportedSets([], target, 'overwrite', {})
      expect(result.imported).toHaveLength(1)
      expect(result.imported[0].id).toBe('imported-1704067200000-1')
      vi.useRealTimers()
    })

    it('trims whitespace from target set IDs in overwrite mode', () => {
      const target = [{ ...makeSet('A', [{ word: 'hello' }]), id: '  my-id  ' }]
      const result = applyImportedSets([], target, 'overwrite', {})
      expect(result.imported).toHaveLength(1)
      expect(result.imported[0].id).toBe('my-id')
    })
  })

  describe('mixed scenario', () => {
    it('handles replace, skip, and rename simultaneously', () => {
      const local = [
        makeSet('A', [{ word: 'hello' }]),
        makeSet('B', [{ word: 'world' }]),
      ]
      const target = [
        { ...makeSet('A', [{ word: 'hello-updated' }]) },
        { ...makeSet('B', [{ word: 'world-updated' }]) },
        { ...makeSet('C', [{ word: 'new' }]), id: 'set-A' },
        makeSet('D', [{ word: 'world' }]),
      ]
      const result = applyImportedSets(local, target, 'append', { A: 'imported', B: 'local' })
      expect(result.replacedVersions).toEqual(['A'])
      expect(result.skippedByName).toEqual(['B'])
      expect(result.renamedIds).toHaveLength(1)
      expect(result.renamedIds[0].from).toBe('set-A')
      expect(result.skippedByContent).toEqual(['D'])
      expect(result.imported).toHaveLength(1)
      expect(result.imported[0].setName).toBe('C')
      expect(result.imported[0].id).not.toBe('set-A')
    })
  })
})

describe('parseImportJson', () => {
  const validJson = {
    setName: 'Test',
    items: [
      {
        word: 'hello',
        meaning: '你好',
        example: 'Hello!',
        question: { prompt: 'Test', opts: ['A', 'B', 'C', 'D'], ans: 0 },
      },
    ],
  }

  it('parses valid JSON', () => {
    const result = parseImportJson(JSON.stringify(validJson))
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.data.setName).toBe('Test')
      expect(result.data.items).toHaveLength(1)
      expect(result.data.items[0].word).toBe('hello')
    }
  })

  it('parses JSON with markdown code fences (```json)', () => {
    const input = `\`\`\`json\n${JSON.stringify(validJson)}\n\`\`\``
    const result = parseImportJson(input)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.data.setName).toBe('Test')
    }
  })

  it('parses JSON with bare markdown fences (```)', () => {
    const input = `\`\`\`\n${JSON.stringify(validJson)}\n\`\`\``
    const result = parseImportJson(input)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.data.setName).toBe('Test')
    }
  })

  it('parses JSON with markdown fences and no line breaks', () => {
    const input = `\`\`\`json\n${JSON.stringify(validJson)}\`\`\``
    const result = parseImportJson(input)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.data.setName).toBe('Test')
    }
  })

  it('returns error for invalid JSON', () => {
    const result = parseImportJson('{invalid}')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('JSON 格式錯誤')
    }
  })

  it('returns error when items field is missing', () => {
    const result = parseImportJson(JSON.stringify({ setName: 'Test' }))
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('缺少 items 陣列')
    }
  })

  it('returns error for empty string', () => {
    const result = parseImportJson('')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('JSON 格式錯誤')
    }
  })

  it('returns error for non-object JSON', () => {
    const result = parseImportJson(JSON.stringify('hello'))
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('最外層必須是單一 JSON object')
    }
  })
})
