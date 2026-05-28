# Wordmem Project Structure

```
├── src/
│   ├── components/
│   │   ├── dialogs/
│   │   │   ├── ConfirmDialog.vue       # Confirmation modal (delete etc.)
│   │   │   ├── DriveBackupSelector.vue # Custom Google Drive backup selector
│   │   │   ├── ImportDialog.vue        # Import/merge dialog
│   │   │   ├── ImportSettings.vue      # Shared import configuration & diff selector
│   │   │   ├── PracticeDialog.vue      # Mode selection dialog
│   │   │   ├── SetEditorDialog.vue     # Add/edit set dialog
│   │   │   ├── TransferDialog.vue      # Google Drive transfer dialog
│   │   │   └── VersionUpdateDialog.vue # Version update reminder dialog
│   │   ├── ui/
│   │   │   ├── badge/Badge.vue
│   │   │   ├── button/Button.vue
│   │   │   ├── card/Card.vue
│   │   │   ├── dialog/Dialog.vue        # Generic modal wrapper
│   │   │   ├── input/Input.vue
│   │   │   ├── progress/Progress.vue
│   │   │   ├── textarea/Textarea.vue
│   │   │   └── toast/Toast.vue
│   │   ├── AppHeader.vue               # Top nav bar
│   │   ├── FlashcardView.vue           # Single flashcard display
│   │   ├── FlashcardsView.vue          # Practice mode: flashcard
│   │   ├── HomeView.vue                # Main list of sets
│   │   ├── PracticeView.vue            # Practice mode: quiz
│   │   ├── QuizCard.vue                # Single quiz card
│   │   ├── ResultView.vue              # Session result summary
│   │   ├── SetCard.vue                 # Set card in home list
│   │   └── SpellingCard.vue            # Practice mode: spelling
│   ├── constants/
│   │   ├── backup.ts                   # Export version, ZIP filename, save delay
│   │   ├── index.ts
│   │   └── storage.ts                  # Storage keys, theme key
│   ├── lib/
│   │   ├── clipboard.ts                # Shared clipboard copy utility
│   │   ├── cn.ts                       # clsx + twMerge utility
│   │   ├── difficulty-prompts.ts       # Per-level AI prompt chunks (Lv1–4)
│   │   ├── file.ts                     # ZIP build/parse, download
│   │   ├── googleDrive.ts              # OAuth + Drive API v3
│   │   ├── i18n.ts                     # vue-i18n instance + plugin
│   │   ├── import.ts                   # Import parsing, diffing, merge
│   │   ├── persist.ts                  # Async IndexedDB + debounce persistence
│   │   ├── prompts.ts                  # AI prompt templates
│   │   ├── useVirtualList.ts           # Sliding window virtual list composable
│   │   ├── validation.ts              # Normalize/validate helpers
│   │   └── worker.ts                   # Web Worker wrapper (ZIP ops)
│   ├── workers/
│   │   └── backup.worker.ts            # ZIP build/parse off the main thread
│   ├── locales/
│   │   └── zh-TW.ts                    # ~180 i18n keys (Traditional Chinese)
│   ├── router/
│   │   └── index.ts                    # 5 routes
│   ├── stores/
│   │   ├── backup.ts                   # Google Drive backup/restore
│   │   ├── session.ts                  # Practice session lifecycle
│   │   ├── sets.ts                     # Card CRUD, import, export
│   │   └── ui.ts                       # Theme, toast, confirm, transfer
│   ├── types/
│   │   ├── backup.ts                   # Drive file metadata
│   │   ├── index.ts
│   │   ├── session.ts                  # Session, Entry, Draft
│   │   └── set.ts                      # VocabSet, VocabItem
│   ├── App.vue                         # Root layout + router-view
│   ├── main.ts                         # App bootstrap
│   └── style.css                       # Tailwind v4 CSS
├── tests/
│   ├── lib/
│   │   ├── import.test.ts              # 43 tests
│   │   └── validation.test.ts          # 77 tests
│   └── stores/
│       ├── session.test.ts             # 20 tests
│       └── sets.test.ts                # 34 tests
├── env.d.ts                            # Vue SFC type shim
├── eslint.config.js                    # @antfu/eslint-config
├── index.html
├── package.json
├── tsconfig.json                       # TS 6 strict, vue-tsc
├── vite.config.ts                      # Vite + Vue + PWA
└── vitest.config.ts
```

## Architecture

- **State**: 4 Pinia setup stores (`sets`, `session`, `backup`, `ui`)
- **UI**: Vue 3.5 `<script setup lang="ts">` + Tailwind v4 + lucide-vue-next
- **Routing**: vue-router 4 (5 routes)
- **i18n**: vue-i18n 11 (traditional Chinese, ~150 keys)
- **Storage**: IndexedDB via `idb-keyval` + localStorage fallback (debounced writes)
- **Export**: ZIP via fflate in Web Worker (sets); Google Drive via GIS + Drive API v3
- **Testing**: Vitest (174 tests, 4 files)
