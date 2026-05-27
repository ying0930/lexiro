export interface Question {
  prompt: string
  opts: string[]
  ans: number
}

export interface VocabItem {
  id: string
  word: string
  pos: string
  meaning: string
  example: string
  question: Question
}

export interface VocabSet {
  id: string
  setName: string
  difficulty: number
  items: VocabItem[]
}

export interface EditorItem {
  id: string
  word: string
  pos: string
  meaning: string
  example: string
  question: EditorQuestion
}

export interface EditorQuestion {
  prompt: string
  opts: string[]
  ans: number
}
