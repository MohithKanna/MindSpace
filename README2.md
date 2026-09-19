# Mindspace

Mindspace is a local-first, browser-based rich-text block editor. It is built with plain HTML, CSS, and JavaScript. It has no build step and no application server.

## Release Status

This repository is suitable for a student project and an initial `v1.0.0` release. It is functional, but it should not yet be described as a fully production-stable editor.

Current release characteristics:

- Documents are stored locally in the browser.
- The application works without an account or backend.
- Minor editor and browser-compatibility issues may remain.
- Automated test coverage is currently minimal: the available Python test files are helper-style scripts and `unittest discover` finds no test cases.
- Browser smoke testing is required before calling the release production-ready.

## Features

### Documents

- Create a new document.
- Open a document from the dashboard.
- Rename and delete documents from the dashboard.
- Navigate between documents using the editor sidebar.
- Open a document directly with `index.html?id=<page-id>`.
- When the editor opens without an `id`:
    - open the most recently updated document if one exists;
    - otherwise create a new empty document.

### Editing

- Contenteditable block editor.
- Paragraphs and block types including headings, blockquote, code, ordered lists, and unordered lists where supported by the toolbar.
- Inline formatting:
    - bold;
    - italic;
    - underline;
    - strikethrough;
    - superscript and subscript;
    - text color and highlight color;
    - font family and font size;
    - code styling.
- Block alignment, line height, and text transformation controls.
- Paste as plain text.
- Native undo/redo behavior through browser editing commands.
- Caret restoration after document rendering.

### Editor tools

- Floating toolbar for selected text.
- Static toolbar for caret-level formatting.
- Find and replace with next/previous navigation and replace-all support.
- Word suggestions loaded from the bundled English frequency dataset.
- Dark mode.
- Focus mode.
- Adjustable editor width.
- Spellcheck toggle.
- Autocomplete toggle.
- Configurable autosave and save delay.
- Cursor-reactive background particles that repel the pointer.

## Running Locally

Mindspace must be served over HTTP. Do not open the HTML files directly with `file://`, because ES modules, IndexedDB, and relative asset loading require an HTTP origin.

The server root must be the repository's `src/` directory.

### Python

From the repository root:

```bash
python3 -m http.server --directory src 8080
```

Open:

- Dashboard: `http://localhost:8080/ui/dashboard.html`
- Editor: `http://localhost:8080/ui/index.html`

### npx

If Node.js is available:

```bash
npx serve src
```

Use the URL printed by `serve` and append `/ui/dashboard.html` or `/ui/index.html`.

## Main User Workflows

### Start from the dashboard

1. Open `ui/dashboard.html`.
2. Select `Open Mindspace` to enter the editor.
3. If saved documents exist, the editor opens the newest by `updatedAt`.
4. If none exist, the editor creates and opens a new empty page.

### Create a document

Use `New document` on the dashboard or the plus button in the editor sidebar. A page is created in IndexedDB before navigation to its editor URL.

### Open a specific document

The dashboard and sidebar navigate to URLs in this form:

```text
ui/index.html?id=p-<generated-id>
```

The explicit URL ID takes priority over recent-document selection.

### Save a document

Changes are marked dirty and saved after a debounce delay when autosave is enabled. The editor also requests saving on blur, page visibility changes, and before unload. `Ctrl+S` on Linux/Windows or `Cmd+S` on macOS forces a save.

## Storage

### IndexedDB

The database name is `EditorDB`, version `1`, with one object store named `pages`. The object store uses `id` as its key path.

A saved page has this shape:

```json
{
    "id": "p-example",
    "pageId": "p-example",
    "title": "A document title",
    "meta": {
        "caret": null,
        "style": null,
        "createdAt": 1700000000000,
        "updatedAt": 1700000000000
    },
    "contents": {
        "map": {
            "block-id": {
                "id": "block-id",
                "text": "Hello world",
                "attrs": {
                    "align": "left",
                    "lineHeight": "normal",
                    "blocktype": "p"
                },
                "children": [
                    {
                        "text": "Hello world",
                        "marks": {}
                    }
                ]
            }
        },
        "order": ["block-id"]
    }
}
```

`PageRepository.listPages()` sorts documents by `meta.updatedAt` in descending order. This ordering is used both by the dashboard and by the editor's no-query startup behavior.

### localStorage

Editor preferences are stored under the `editor_prefs` key. These preferences include:

- theme;
- focus mode;
- editor width;
- autosave delay;
- autocomplete;
- spellcheck;
- autosave.

Clearing browser site data clears both preferences and locally saved documents.

## Architecture

```text
Dashboard HTML
  -> DashboardView.js
  -> PageRepository.js
  -> IndexedDBService.js

Editor HTML
  -> app.js
  -> EditorHandler.js
  -> DocumentManager.js
  -> BlockManager.js
  -> DOMmanager.js
  -> Normalizer / Denormalizer
  -> IndexedDBService.js
```

### Application startup

`src/app.js` creates the editor services and resolves the current page in this order:

1. Read `id` from the URL query string.
2. If no ID exists, list pages and choose the newest updated page.
3. If the page list is empty, create a new page.
4. Load the page into the editor.
5. Start event listeners and the mutation observer.
6. Render the sidebar.

### Document state

`DocumentManager` owns the currently opened page, title, metadata, dirty state, autosave setting, and save delay. `BlockManager` owns the in-memory block map and ordered block IDs.

`PageRepository` handles document-level CRUD. `IndexedDBService` is the low-level wrapper around IndexedDB transactions.

### DOM and JSON synchronization

The application treats the DOM as the editing surface and the JSON block model as the persisted state.

- `Denormalizer` converts stored block JSON into editable DOM blocks.
- User input is read by `Normalizer` and written into `BlockManager`.
- `MutationObserver` detects added and removed top-level blocks.
- Input, selection, and suggestion events are debounced where appropriate.
- Caret metadata is stored with the page and restored after rendering when possible.
- `DocumentManager` saves the current block data after the document becomes dirty.

Each block is represented by a top-level element with a `data-blockid` attribute. Text is represented by child spans with mark information converted to inline styles during rendering.

## Source Layout

```text
src/
  app.js                         Editor application entry point
  core/
    BlockManager.js              In-memory ordered block state
    Denormalizer.js              JSON blocks -> DOM
    DocumentManager.js           Current document and autosave
    IndexedDBService.js          IndexedDB wrapper
    Normalizer.js                DOM -> normalized block JSON
    PageRepository.js             Document CRUD and ordering
  dataset/
    wordfreq-en-25000-log.json   Autocomplete word data
  editor/
    DOMmanager.js                DOM loading and caret restoration
    EditorHandler.js             Event/control coordinator
    InputHandler.js              Input synchronization
    KeyDownHandler.js            Keyboard commands and structural keys
    Listener.js                  Browser event registration
    ObservationHandler.js        Mutation-to-block synchronization
    Observer.js                  MutationObserver wrapper
    SelectionManager.js          Selection and caret state
  style/
    CaretStyler.js               Formatting at the caret
    SelectionStyler.js            Formatting selected text
    StyleFactory.js               Style detection and DOM transforms
    StyleManager.js              Formatting coordinator
  suggestions/
    SuggestionManager.js         Autocomplete behavior
  toolbar/
    FloatingToolBar.js            Selection toolbar
    OptionsMenu.js                Preferences and settings
    StaticToolBar.js              Caret toolbar
  ui/
    dashboard.html                Dashboard and landing page
    DashboardView.js              Dashboard document list and CRUD
    FindReplace.js                Find and replace
    home.js                       Typewriter and particle animation
    Sidebar.js                    Editor document navigation
    index.html                    Editor interface
    theme-init.js                 Early theme initialization
    *.css                         Dashboard, landing, and editor styles
```

## Keyboard Shortcuts

- `Ctrl+S` / `Cmd+S`: save immediately.
- `Ctrl+B` / `Cmd+B`: bold.
- `Ctrl+I` / `Cmd+I`: italic.
- `Ctrl+U` / `Cmd+U`: underline.
- `Ctrl+F` / `Cmd+F`: open or close find and replace.
- `Enter` in the title: shift title text and handle the title edit flow.
- `Tab` or `ArrowRight`: accept an active word suggestion.
- `Escape`: clear a suggestion or close find and replace.

## Browser Requirements

Use a modern browser with support for:

- ES modules;
- IndexedDB;
- `MutationObserver`;
- `contenteditable` and Selection/Range APIs;
- CSS Custom Highlight API for find-and-replace highlighting;
- `crypto.randomUUID()` where available, with a fallback ID generator.

Find-and-replace depends on `CSS.highlights` and `Highlight`. Browsers without those APIs may load the editor but will not support that feature correctly.

## Known Limitations and Risks

- Data is local to the browser profile and origin. There is no cloud sync, export, account system, or backup mechanism.
- Clearing browser storage permanently removes local documents.
- There is no migration system for future IndexedDB schema changes.
- Automated test coverage is not yet meaningful. Add browser-level tests for document creation, recent-page opening, editing, saving, rename, delete, and reload persistence.
- The application has no centralized error UI for IndexedDB, dataset loading, or unsupported browser APIs.
- Some editor behavior relies on browser `contenteditable`, Selection/Range, and deprecated `execCommand` behavior, so formatting and caret behavior can vary across browsers.
- Find-and-replace edits the DOM directly and relies on later input or mutation processing to persist changes. This should be verified carefully with browser tests.
- The dashboard and editor do not provide a user-facing conflict-resolution model for multiple tabs editing the same page.
- The current page resolver intentionally treats the newest `updatedAt` page as the recent document when the editor URL has no explicit ID.
- The current repository contains `spec.txt` and helper scripts that describe design ideas, but they are not the runtime contract. The source files are authoritative.

## Verification Checklist for v1

Before tagging a release, test manually in a clean browser profile:

1. Open the dashboard with no documents.
2. Open the editor and confirm that one new page is created.
3. Type text, format it, reload, and confirm it persists.
4. Return to the dashboard and confirm the page appears.
5. Create a second page and confirm it opens directly.
6. Open the editor without a query ID and confirm the newest page opens.
7. Rename and delete pages from the dashboard.
8. Navigate between pages through the sidebar.
9. Test autosave, `Ctrl+S`/`Cmd+S`, and browser reload.
10. Test find and replace, autocomplete, dark mode, focus mode, and responsive sidebar behavior.
11. Move the pointer over the dashboard and confirm particles repel the cursor.
12. Check the browser console for errors.

## Suggested GitHub Release

For the current state, use:

```text
v1.0.0 - Initial Student Release
```

Describe it as a functional initial release with known minor issues and local-only persistence. Reserve a stable production label for a later version after browser testing and meaningful automated coverage are added.
