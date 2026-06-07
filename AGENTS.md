# lexiro Codebase Guidelines for AI Agents

Welcome, Agent! To keep the lexiro application maintainable, scalable, and beautifully designed, you MUST strictly adhere to the rules and architectural standards detailed in this document.

---

## 🚨 Core Strict Guidelines

### 1. Max 400 Lines per Vue Component
- **STRICT CONSTRAINT**: No single `.vue` file is allowed to exceed **400 lines** (including `<script>`, `<template>`, and `<style>` blocks).
- **Action**: If you are adding features and the file is approaching **350 lines**, you **MUST** proactively refactor and split it.
  - Extract complex template blocks into dedicated sub-components.
  - Move standalone calculations, state mappings, and helpers to helper files in `src/lib/` or composables.

### 2. The Rule of Two (重複兩次即拆分)
- **STRICT CONSTRAINT**: Any business logic, UI template block, formatting helper, or utility used **two times or more** across the application **MUST** be extracted and shared.
- **Examples**:
  - **Clipboard copy operations**: Do not write `navigator.clipboard.writeText` locally. Use `copyToClipboard` from `@/lib/clipboard`.
  - **Import settings panels**: Extracted into a shared `ImportSettings.vue`.
  - **Form elements**: Always use shared UI primitives in `src/components/ui/` (e.g. `Button.vue`, `Input.vue`, `Textarea.vue`, `Badge.vue`, `Card.vue`).

---

## 📁 Codebase Directory Architecture

Ensure new files are placed in their proper semantic location:
```
src/
├── components/
│   ├── dialogs/       # Specific overlays & modals (must be under 400 lines!)
│   ├── ui/            # Reusable core visual primitives (Card, Button, Badge, etc.)
│   └── *.vue          # Main layout or view components
├── constants/         # Static configuration, storage keys, config strings
├── lib/               # Shared logic, helpers, parsers, and custom composables
├── locales/           # i18n localization translation key sheets
├── router/            # Vue Router page mapping
├── stores/            # Pinia setup stores (sets, session, backup, ui)
├── types/             # Explicit TypeScript interface & type definitions
└── workers/           # Background Web Workers (fflate compression etc.)
```

---

## 💻 Tech Stack & Coding Standards

### 1. Vue 3 `<script setup>` with TypeScript
- Always use `<script setup lang="ts">`.
- Maintain strict typing. Avoid using `any` unless absolutely necessary; declare precise types in `src/types/`.
- Leverage Pinia setup stores (`useSetsStore`, `useSessionStore`, `useBackupStore`, `useUIStore`) for global reactive states and action dispatching.

### 2. Styling (Tailwind CSS v4)
- Use standard utility classes from Tailwind CSS v4.
- Make extensive use of custom theme tokens (e.g. `.panel` utilities, `text-ink-950`, `bg-ink-100`, `dark:bg-ink-900`).
- Use the `cn(...)` utility (from `@/lib/cn`) to safely join conditional classes and resolve Tailwind utility conflicts.

### 3. Localization (i18n)
- Do not hardcode user-facing strings.
- Always use `$t(...)` in templates or `const { t } = useI18n()` in scripts.
- Put the translation keys in `src/locales/zh-TW.ts`.

---

## 🧪 Testing & Verification

Before finalizing any changes, you must ensure that all test suites pass perfectly.
- **Test files location**: `tests/` directory (categorized by stores and library logic).
- **Run Typechecking**: `npm run typecheck` to verify strict compilation.
- **Run Linter**: `npm run lint` to check for style violations.
- **Run Unit Tests**: `npm run test` (uses Vitest) to check for regressions.

Thank you for keeping the lexiro codebase clean and elegant! ✨
