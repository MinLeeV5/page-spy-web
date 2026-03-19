# Room List Electron Support And Search Design

## Summary

This change adds Electron as a first-class platform in the online debugging room list and improves room discovery with a single keyword search input.

The room list sidebar currently exposes three separate text filters for `device id`, `project`, and `title`, plus structured filters for `os` and `platform`. The validated direction is to replace the three text filters with one room search input that matches:

- room title
- project name
- full room address
- the four-character short device id shown in the UI

At the same time, Electron rooms will be recognized from the client UA string when `room.name` contains `Electron/<version>`. Once recognized, Electron should appear consistently in:

- the room list platform filter
- room card platform icon and tooltip
- the devtools client information panel

No backend API changes are required.

## Goals

- Let users find rooms by entering any known identifier into one search field.
- Show Electron rooms as a distinct platform instead of falling back to Chrome.
- Preserve existing Web-like devtools behavior for Electron clients.
- Keep the change local to the frontend with minimal regression risk.

## Non-Goals

- No new backend fields or API protocol changes.
- No new room list panels or sidebar room switcher in the devtools page.
- No redesign of the room card layout beyond platform icon updates.
- No new automated test framework introduction in this task.

## User Experience

### Room List Search

The left sidebar on the room list page will replace the three text inputs:

- `device id`
- `project`
- `title`

with a single keyword field such as `Search room`.

This keyword is matched case-insensitively against:

- `room.tags.title`
- decoded `room.group`
- full `room.address`
- `room.address.slice(0, 4)`

The `os` and `platform` filters remain unchanged as structured filters and can be combined with the keyword search.

This reduces the cognitive load of deciding which field to use. A user can enter a page title, a project name, a short room code, or a full address and get the same result set.

### Electron Platform Display

Electron is treated as a platform type on par with existing browser or mini program platform entries.

When a room is reported with a UA containing `Electron/<version>`:

- the room card platform section shows the Electron icon
- the tooltip shows `Electron <version>`
- the platform filter includes an Electron option when at least one Electron room exists
- the devtools page client info panel shows Electron instead of Chrome

The room card does not add extra badges or duplicated text. The existing platform slot is enough and keeps the layout stable.

## Technical Design

### 1. Platform Recognition

The platform recognition logic is centralized in [`src/utils/brand.ts`](/Users/min/Works/page-spy-web/src/utils/brand.ts).

Changes:

- add an Electron image asset under [`src/assets/image`](/Users/min/Works/page-spy-web/src/assets/image)
- add `electron` to the browser platform config
- add an Electron label and logo mapping in `BROWSER_CONFIG`
- add an `electron` regexp to `BROWSER_REGEXPS`

The Electron regexp must be evaluated before the Chrome regexp. Electron UAs usually contain both `Chrome/...` and `Electron/...`; if Chrome matches first, Electron rooms will be misclassified.

The new recognition rule is:

```txt
Electron/([\d.]+)
```

This keeps the existing parsing flow intact while extending the recognized browser set.

### 2. Room List Filtering

The room list logic is implemented in [`src/pages/RoomList/index.tsx`](/Users/min/Works/page-spy-web/src/pages/RoomList/index.tsx).

Changes:

- replace the current `title`, `address`, and `project` conditions with a single `keyword`
- update the filter helper to match the keyword against title, group, full address, and short address
- keep `os` and `browser` filtering as-is
- keep the maximum room limit and sort behavior unchanged

The current submit path calls `getSpyRoom(group)` using the `project` field as a server-side filter. That behavior will be removed for the room list page so the UI can support a unified keyword search locally. The page will fetch the room list once per polling cycle and apply all keyword logic client-side.

### 3. Safe Group Matching

Room cards already decode `group` before display. Keyword matching should use the same human-readable project value, but decode failures must not break rendering or filtering.

Implementation should use a small safe decode helper:

- try `decodeURI(value)`
- on failure, return the original string

This helper should be used anywhere group text is normalized for search.

### 4. Devtools Compatibility

The devtools page relies on platform classification to decide which panels are visible. These checks live in [`src/store/platform-config.ts`](/Users/min/Works/page-spy-web/src/store/platform-config.ts) and [`src/pages/Devtools/index.tsx`](/Users/min/Works/page-spy-web/src/pages/Devtools/index.tsx).

Electron should behave like a browser platform, not like a new product family. That means it must be included in the browser platform set used by `isBrowser(...)`.

Expected result:

- `Page` panel remains visible
- browser storage types remain visible
- `System` panel remains visible

This avoids a regression where Electron is visually recognized but loses Web-specific debugging capabilities.

## Error Handling

- If the UA does not contain a valid `Electron/<version>` token, platform parsing falls back to the existing browser detection flow.
- If `group` decoding fails, filtering and display fall back to the raw string.
- If no room matches the keyword and structured filters, the existing empty state remains unchanged.

## Affected Files

Likely implementation touch points:

- [`src/utils/brand.ts`](/Users/min/Works/page-spy-web/src/utils/brand.ts)
- [`src/pages/RoomList/index.tsx`](/Users/min/Works/page-spy-web/src/pages/RoomList/index.tsx)
- [`src/pages/RoomList/RoomCard/index.tsx`](/Users/min/Works/page-spy-web/src/pages/RoomList/RoomCard/index.tsx)
- [`src/assets/locales/zh.json`](/Users/min/Works/page-spy-web/src/assets/locales/zh.json)
- [`src/assets/locales/en.json`](/Users/min/Works/page-spy-web/src/assets/locales/en.json)
- [`src/assets/locales/ja.json`](/Users/min/Works/page-spy-web/src/assets/locales/ja.json)
- [`src/assets/locales/ko.json`](/Users/min/Works/page-spy-web/src/assets/locales/ko.json)
- a new Electron icon asset under [`src/assets/image`](/Users/min/Works/page-spy-web/src/assets/image)

## Validation

Because the repository currently has no existing `test` script or colocated automated tests for this flow, validation should use:

- `yarn lint`
- manual regression checks in the room list and devtools pages

Manual scenarios:

1. A normal Chrome room still renders as Chrome.
2. A UA containing `Electron/x.y.z` renders as Electron.
3. The platform filter exposes Electron when Electron rooms exist.
4. Keyword search matches room title.
5. Keyword search matches decoded project name.
6. Keyword search matches both full address and the short four-character device id.
7. Electron rooms still show browser-only devtools panels.

## Rollout Notes

This is a safe frontend-only enhancement. If Electron reporting changes later and the UA no longer contains `Electron/<version>`, the UI simply falls back to existing browser detection without breaking room access.
