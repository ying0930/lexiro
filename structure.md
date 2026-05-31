# Wordmem Project Structure

Wordmem is a Vue 3 + Pinia vocabulary practice app with local persistence, ZIP backup, and optional Google Drive backup.

```
├── public/
│   └── icons/
│       └── wordmem.svg
├── src/
│   ├── components/
│   │   ├── dialogs/
│   │   │   ├── ConfirmDialog.vue
│   │   │   ├── DriveBackupSelector.vue
│   │   │   ├── EditorItemCard.vue
│   │   │   ├── ImportDialog.vue
│   │   │   ├── ImportSettings.vue
│   │   │   ├── PracticeDialog.vue
│   │   │   ├── SetEditorDialog.vue
│   │   │   ├── TransferDialog.vue
│   │   │   └── VersionUpdateDialog.vue
│   │   ├── ui/
│   │   │   ├── badge/Badge.vue
│   │   │   ├── button/Button.vue
│   │   │   ├── card/Card.vue
│   │   │   ├── dialog/Dialog.vue
│   │   │   ├── dialog-footer/DialogFooter.vue
│   │   │   ├── empty-state/EmptyState.vue
│   │   │   ├── input/Input.vue
│   │   │   ├── metric-pill/MetricPill.vue
│   │   │   ├── progress/Progress.vue
│   │   │   ├── section-panel/SectionPanel.vue
│   │   │   ├── status-message/StatusMessage.vue
│   │   │   ├── textarea/Textarea.vue
│   │   │   └── toast/Toast.vue
│   │   ├── AppHeader.vue
│   │   ├── FlashcardView.vue
│   │   ├── FlashcardsView.vue
│   │   ├── HomeView.vue
│   │   ├── PracticeView.vue
│   │   ├── QuizCard.vue
│   │   ├── ResultView.vue
│   │   ├── SetCard.vue
│   │   └── SpellingCard.vue
│   ├── constants/
│   │   ├── backup.ts
│   │   ├── index.ts
│   │   └── storage.ts
│   ├── lib/
│   │   ├── clipboard.ts
│   │   ├── cn.ts
│   │   ├── difficulty-prompts.ts
│   │   ├── file.ts
│   │   ├── googleDrive.ts
│   │   ├── i18n.ts
│   │   ├── import.ts
│   │   ├── persist.ts
│   │   ├── prompts.ts
│   │   ├── resultPrompts.ts
│   │   ├── useVirtualList.ts
│   │   ├── validation.ts
│   │   └── worker.ts
│   ├── locales/
│   │   └── zh-TW.ts
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   ├── backup.ts
│   │   ├── session.ts
│   │   ├── sets.ts
│   │   └── ui.ts
│   ├── types/
│   │   ├── backup.ts
│   │   ├── index.ts
│   │   ├── session.ts
│   │   └── set.ts
│   ├── workers/
│   │   └── backup.worker.ts
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── tests/
│   ├── lib/
│   │   ├── import.test.ts
│   │   └── validation.test.ts
│   └── stores/
│       ├── session.test.ts
│       └── sets.test.ts
├── AGENTS.md
├── env.d.ts
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Architecture

- **Frontend**: Vue 3 `<script setup lang="ts">`, Vue Router, Tailwind CSS v4, lucide-vue-next.
- **State**: Pinia setup stores split by domain: sets, session, backup, and UI.
- **Persistence**: IndexedDB through `idb-keyval`, with localStorage used for theme and related browser state.
- **Import/export**: ZIP backup parsing/building in a Web Worker; Google Drive integration through GIS and Drive API.
- **i18n**: Traditional Chinese strings live in `src/locales/zh-TW.ts`.
- **Testing**: Vitest covers library logic and Pinia store behavior.
