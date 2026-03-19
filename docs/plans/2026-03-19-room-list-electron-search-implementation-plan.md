# Room List Electron Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Electron platform recognition to the online room list and devtools client info while replacing the room list's three text filters with one keyword search across room title, project, and device id.

**Architecture:** Extend the existing UA parsing and browser configuration in `src/utils/brand.ts` so Electron becomes a first-class browser type. Keep room polling unchanged, but move room text filtering entirely to local keyword matching in `src/pages/RoomList/index.tsx`, with safe group decoding and unchanged OS/platform filters.

**Tech Stack:** React 18, TypeScript, Ant Design 5, Zustand, Vite, Less, i18next

---

### Task 1: Add Electron platform recognition

**Files:**

- Create: `src/assets/image/electron.svg`
- Modify: `src/utils/brand.ts`
- Verify: `yarn lint`

**Step 1: Add the Electron icon**

Create `src/assets/image/electron.svg` with a simple vector icon that matches the existing asset usage pattern.

**Step 2: Extend browser metadata**

Update `src/utils/brand.ts` to:

- import the Electron icon
- add `electron` to the browser config list
- expose the Electron label and icon from `BROWSER_CONFIG`
- add `Electron/([\\d.]+)` to `BROWSER_REGEXPS`

**Step 3: Protect matching order**

Place the Electron regexp before Chrome matching so Electron UAs are not downgraded to Chrome.

**Step 4: Verify**

Run: `yarn lint`
Expected: lint passes without type or syntax errors from the new platform wiring.

### Task 2: Replace room list text filters with keyword search

**Files:**

- Modify: `src/pages/RoomList/index.tsx`
- Verify: `yarn lint`

**Step 1: Add safe search helpers**

Introduce small local helpers for:

- safe URI decoding of `group`
- keyword normalization
- matching title, group, full address, and short address

**Step 2: Update room request flow**

Keep polling with `getSpyRoom()`, but stop using the form's project value to request `/room/list?group=...`.

**Step 3: Update form state and filtering**

Replace `title`, `address`, and `project` conditions with a single `keyword`, while leaving `os` and `browser` intact.

**Step 4: Verify**

Run: `yarn lint`
Expected: room list filtering compiles cleanly and form bindings remain valid.

### Task 3: Update room list UI copy and platform display

**Files:**

- Modify: `src/pages/RoomList/index.tsx`
- Modify: `src/assets/locales/zh.json`
- Modify: `src/assets/locales/en.json`
- Modify: `src/assets/locales/ja.json`
- Modify: `src/assets/locales/ko.json`
- Verify: `yarn lint`

**Step 1: Update sidebar fields**

Replace the three text form items with a single room search input.

**Step 2: Add i18n copy**

Add one translation key for the new room search label and placeholder in all locale files.

**Step 3: Verify**

Run: `yarn lint`
Expected: no missing references from the new i18n key.

### Task 4: Final verification and review

**Files:**

- Review: `src/utils/brand.ts`
- Review: `src/pages/RoomList/index.tsx`
- Review: `src/assets/locales/*.json`

**Step 1: Run final verification**

Run: `yarn lint`

**Step 2: Manual checks**

Confirm:

- Electron UA renders Electron platform text and icon
- platform filter includes Electron when present
- keyword search matches title
- keyword search matches project name
- keyword search matches full address and four-character short id

**Step 3: Review**

Request code review on the completed diff before merging or handing off.
