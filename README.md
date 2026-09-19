# Mindspace

> **Write what comes to mind.**

A rich-text, block-based document editor built from scratch in vanilla JavaScript —
no frameworks, no build step, no dependencies. Multiple documents, persisted locally
in IndexedDB, with a landing page, a Notion-style document dashboard, and a
persistent sidebar for navigation while editing.

---

## Why this project is interesting

Most "rich text editor" demos just wrap `document.execCommand` around a
`contenteditable` div and call it done. Mindspace doesn't: the DOM is treated as a
**disposable rendering target**, not a source of truth. A plain JSON object
(blocks + marks) is the real state, and the DOM is reconciled back into it after
every meaningful change.

```json
{
  "map": {
    "b1": {
      "id": "b1",
      "type": "paragraph",
      "children": [
        { "text": "Hello ", "marks": {} },
        { "text": "World", "marks": { "bold": true, "color": "#ff0000" } }
      ],
      "attrs": { "align": "left" }
    }
  },
  "order": ["b1"]
}
```

This is the same basic philosophy used by Notion, Slate.js, and ProseMirror —
built here by hand with zero dependencies.

---

## Features

- **Multi-document workflow** — dashboard for create / rename / delete, plus a
  persistent sidebar for quick navigation while editing
- **Rich formatting** — bold, italic, underline, strikethrough, super/subscript,
  font family & size, text & highlight colors, alignment, line height, letter
  spacing, text transform, block types (h1–h3, blockquote, code, lists)
- **Two toolbars** — a floating toolbar on selection, a persistent bottom bar for
  caret-position formatting
- **Typing-style persistence** — toggle bold before typing and it sticks, solved
  correctly via a caret-level pending-style tracker (`CaretStyler`)
- **Live autocomplete** — 25 k-word frequency list
- **Find & Replace** — built on the CSS Custom Highlight API
- **Dark mode · Focus mode · Adjustable content width**
- **Keyboard shortcuts** — `Ctrl/Cmd+S` save, `Ctrl/Cmd+F` find,
  `Ctrl/Cmd+B/I/U` bold/italic/underline

---

## Running locally

This is a **static site** — no build step, no `npm install`.
Because it uses IndexedDB and ES modules, serve it over HTTP (not `file://`).

> **Important:** the server root must be `src/` (not `src/ui/`) — `index.html`
> loads its JS via `../app.js`, so serving `ui/` directly will 404.

```bash
# Option A — npx serve
npx serve src

# Option B — Python
python3 -m http.server --directory src 8080
```

Then open:

| URL | Page |
|-----|------|
| `http://localhost:<port>/ui/dashboard.html` | Landing page + document list |
| `http://localhost:<port>/ui/index.html` | Jump straight into the editor |

---

## Project structure

```
mindspace/
├── README.md
├── spec.txt                        Original design notes & data-model spec
└── src/
    ├── app.js                      Entry point — wires all manager classes together
    │
    ├── core/                       Pure logic, no DOM knowledge
    │   ├── BlockManager.js         In-memory block map — the source of truth
    │   ├── Normalizer.js           DOM → JSON block model
    │   ├── Denormalizer.js         JSON block model → DOM
    │   ├── DocumentManager.js      Owns the open document + autosave
    │   ├── PageRepository.js       CRUD across all saved documents
    │   └── IndexedDBService.js     Generic IndexedDB get/put/getAll/delete wrapper
    │
    ├── editor/                     Editor runtime — event wiring & state
    │   ├── EditorHandler.js        Central event dispatcher
    │   ├── Listener.js             Keyboard, input, paste, selection events
    │   ├── Observer.js             MutationObserver wrapper
    │   ├── ObservationHandler.js   Handles mutation batches
    │   ├── InputHandler.js         Handles input events
    │   ├── KeyDownHandler.js       Handles keydown events (Enter, Backspace, …)
    │   ├── DOMmanager.js           Injects / replaces the editor DOM
    │   └── SelectionManager.js     Caret/selection tracking + save/restore
    │
    ├── style/                      Formatting logic
    │   ├── StyleManager.js         Coordinates caret & selection stylers
    │   ├── StyleFactory.js         Low-level CSS / block-type transforms
    │   ├── CaretStyler.js          Caret-level pending-style tracker
    │   └── SelectionStyler.js      Selection-based span wrapping
    │
    ├── suggestions/
    │   └── SuggestionManager.js    Live word autocomplete
    │
    ├── toolbar/
    │   ├── StaticToolBar.js        Persistent bottom formatting bar
    │   ├── FloatingToolBar.js      Floating toolbar shown on selection
    │   └── OptionsMenu.js          Settings panel (theme, width, autosave, …)
    │
    └── ui/                         HTML, CSS, and page-level JS
        ├── index.html              Editor page
        ├── style.css               Editor & shell styles
        ├── dashboard.html          Landing page + document list
        ├── dashboard.css           Dashboard styles
        ├── home.css                Landing hero styles
        ├── home.js                 Typewriter + particle animation
        ├── theme-init.js           Flicker-free dark/light mode init
        ├── Sidebar.js              Persistent doc-list sidebar
        ├── DashboardView.js        Document list rendering & CRUD
        └── FindReplace.js          Find & Replace panel
```

---

## Architecture notes

| Concern | How it's handled |
|---------|-----------------|
| Source of truth | Plain JSON block model, never the DOM |
| DOM sync | `MutationObserver` + debounced input → `Normalizer` reconciles back to JSON |
| Caret recovery | Saved as `{ blockId, childIndex, offset }`, restored via Range API |
| Persistence | IndexedDB, debounced autosave + save-on-blur / tab-hide / close |
| Styling | `CaretStyler` (pending caret styles) + `SelectionStyler` (span wrapping) |

---

## Known limitations

- Undo/Redo uses the browser's native (deprecated) `execCommand`; a proper
  snapshot-based stack is described in `spec.txt` but not yet wired up.
- No collaboration, accounts, or backend — local-first, single-user by design.
- No slash-command (`/`) menu yet for inserting blocks.
