# Replication Spec: PDF Reader + AI Chat Popup

Build brief for the Expressway Integrated Manual pattern: a book-style PDF reader with a floating AI assistant.

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FileViewerPage (/files/[fileId])                           │
│  ├── Toolbar (page jump, search, bookmarks, settings)       │
│  ├── PDFViewer (react-pdf + pdf.js)                         │
│  │     └── BookPage × 1 or 2 (spread layout)                │
│  ├── DocumentChatWidget (fixed FAB + slide-up panel)        │
│  ├── SelectionToolbar (on text select)                      │
│  └── NoteComposerDialog                                     │
└─────────────────────────────────────────────────────────────┘
```

### Stack

- Next.js App Router, React 18+, TypeScript
- react-pdf / pdfjs-dist for rendering
- @tanstack/react-query for server state
- Axios client with Bearer auth + cookies
- Inline styles + Tailwind utility classes mixed

### Key source files (reference implementation)

| Area | Files |
|------|-------|
| Page shell | `app/files/[fileId]/page.tsx` |
| PDF engine | `components/pdf-viewer.tsx` |
| Loading UI | `components/pdf-loading-ui.tsx` |
| AI widget | `components/document-chat-widget.tsx` |
| Reader chat sizing | `lib/reader-chat-room.ts` |
| API | `lib/api.ts` |
| PDF download | `lib/pdf-download.ts` |

### This repo (Vite / React)

| Area | Files |
|------|-------|
| PDF viewer | `src/components/PdfBookViewer.tsx` |
| Page loading | `src/components/PdfViewerPageLoading.tsx` |
| AI widget | `src/components/DocumentChatWidget.tsx` |
| Reader chat tokens | `src/utils/readerChatRoom.ts` |
| Chat core | `src/components/ChatTab.tsx` |
| API | `src/api/client.ts` |

---

## 2. Visual design system

### PDF reader (neutral slate)

- White cards, border-slate-200, soft shadows
- Primary actions: bg-slate-900 buttons
- Progress bars: sky/blue gradient
- Error states: rose border + rose-50 background

### AI chat (“Reference Librarian” aesthetic)

| Token | Value | Usage |
|-------|-------|-------|
| Navy | `#1a2744` | Header, FAB default, user accent |
| Gold | `#c97c2a` | Accents, hover, assistant left border |
| Paper | `#faf8f3` | Panel body, inputs |
| Border | `#d0c4aa` | Dividers, scrollbars |
| Muted | `#8a7a60` | Secondary text |
| BG | `#f4f1ec` | Message area |

**Fonts:** Headings — `'Playfair Display', Georgia, serif`; Body — `'Source Serif 4', Georgia, serif`

---

## 3. PDF reader — detailed UX

### 3.1 Page route & data flow

Route: `/files/[fileId]?page=N&keyword=...&returnTo=...&preview=...`

**Load sequence**

1. `GET /files/:fileId` — metadata
2. `GET /files/pdf/:fileId` — JSON `{ url, filename?, expiresIn? }` (presigned S3 URL)
3. Pass URL to react-pdf `<Document file={url}>` (range requests; no Blob)
4. Show page loader until metadata + URL ready
5. Show in-viewer loader while PDF.js parses
6. Remount: `<PDFViewer key={viewerPdfSrc}>`

### 3.2 Layout modes

- **Desktop spread (≥1024px):** two pages, spine gutter, click halves to flip, max ~520px/page
- **Mobile:** single page, tap halves, swipe ≥30px, 460ms slide animation
- **Inline:** zoom locked 100%, ~700px height, prev/next below
- **Fullscreen:** native/pseudo fullscreen, zoom presets, auto-hide menu, bottom scrubber

### 3.3 Navigation

Spread math: desktop +2 pages; mobile +1. `toSpreadStart(page)` aligns odd left page.

Flip animation (desktop): 460ms overlay with `bookFlipNext` / `bookFlipPrev`.

### 3.4 Zoom (fullscreen only)

Presets: `[1, 1.2, …, 3]`. Pinch snap to nearest preset. Pan when zoomed.

### 3.5–3.8 Bookmarks, highlights, notes

See full API tables in integration checklist (§5).

### 3.9 Loading & error UX

- **Page loader:** checklist (file details ✓, PDF stream ✓), progress bar
- **In-viewer loader:** 88% download + 12% parse weight
- **Error:** rose panel; common cause S3 CORS / expired presigned URL

---

## 4. AI chat popup — detailed UX

### 4.1 Placement

- PDF reader: `layout="reader"`, `stackZClass="z-40"` (or `z-[70]` fullscreen)
- Collapsed FAB: bottom/right 32px (default) or reader-scaled via `readerChatRoom.ts`
- Open panel: 360×500 default; reader uses `min(52rem × 68rem, viewport)` × 0.5 when windowed

### 4.2 FAB

- Hint pill: *Press "/" to open AI chat*
- Bookmark-tab shape, navy → gold hover
- `/` toggles open/close (skip when focus in input/textarea/contenteditable)

### 4.3 Panel

- Slide-up 320ms `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Header (navy), sidebar overlay 260px, messages, input
- Assistant: gold left border + markdown; User: navy right border

### 4.4 Streaming / typing

Full response then character reveal (punctuation 85ms, space 22ms, other 14ms). Pending: *Consulting the archive…*

### 4.5 Chatroom lifecycle

Create → `POST /chat`; List → `GET /chat`; History → `GET /chat/:chatId`; Send → `POST /chatbot { chatId, text }`

---

## 5. Integration checklist

**PDF reader:** presigned URL, S3 CORS, react-pdf worker, URL sync, spread layout, fullscreen/zoom, bookmarks/highlights/notes, selection toolbar, loading components.

**AI chat:** chatroom CRUD, chatbot POST, FAB + `/` shortcut, slide-up panel, sidebar, markdown + typing, model picker, reference page links.

**Shared:** Bearer auth, navy/gold tokens, auth gate on `/files/*`.

---

## 6. Edge cases

- Auth hydration before redirect
- Race on chat switch: apply history only if `response.id === activeChatId`
- PDF worker termination errors suppressed on unmount
- No page flip when text selected
- Presigned URL 300s TTL → remount on new URL

---

## 7. Component tree

```
FileViewerPage
├── PdfViewerPageLoading
├── Toolbar
├── PDFViewer → BookPage × 1–2
├── DocumentChatWidget
├── SelectionToolbar
└── NoteComposerDialog
```

---

## 8. Reference constants

```ts
const C = {
  navy: "#1a2744",
  gold: "#c97c2a",
  paper: "#faf8f3",
  border: "#d0c4aa",
  muted: "#8a7a60",
  bg: "#f4f1ec",
};
const PANEL_TRANSITION_MS = 320;
const FLIP_DURATION = 460;
const MOBILE_BREAKPOINT = 1024;
const FULLSCREEN_ZOOM_SCALES = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3];
const READER_CHAT_ROOM = {
  fabSizeRem: 8,
  fabBottomRem: 1.25,
  fabRightRem: 1.25,
  panelWidthRem: 52,
  panelHeightRem: 68,
  panelMaxWidthCss: "calc(100vw - 2.5rem)",
  panelMaxHeightCss: "85dvh",
};
```

See `src/utils/readerChatRoom.ts` for the ported helpers used in this frontend.
