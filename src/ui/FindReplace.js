export class FindReplace {
  constructor({ editorEl }) {
    this.editorEl = editorEl;
    this.panel = document.getElementById("find-replace-panel");
    this.findInput = document.getElementById("find-input");
    this.replaceInput = document.getElementById("replace-input");

    this.matches = [];
    this.currentIndex = -1;
    this.isOpen = false;

    this._bindEvents();
  }

  open() {
    this.isOpen = true;
    this.panel.classList.remove("hidden");
    this.findInput.focus();
  }

  close() {
    this.isOpen = false;
    this.panel.classList.add("hidden");
    this._clearHighlights();
    this.matches = [];
    this.currentIndex = -1;
    this.findInput.value = "";
    this.replaceInput.value = "";
  }
  _find(term) {
    this._clearHighlights();
    this.matches = [];
    this.currentIndex = -1;

    if (!term) return this._updateCount();

    const { fullText, map } = this._buildTextMap();
    const lower = fullText.toLowerCase();
    const search = term.toLowerCase();
    let index = 0;

    while ((index = lower.indexOf(search, index)) !== -1) {
      const startPos = map[index];
      const endPos = map[index + term.length - 1];

      if (startPos && endPos) {
        const range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset + 1);
        this.matches.push(range);
      }
      index += term.length;
    }

    if (this.matches.length === 0) return this._updateCount();

    CSS.highlights.set("find-match", new Highlight(...this.matches));

    this.currentIndex = 0;
    this._highlightCurrent();
    this._scrollToCurrent();
    this._updateCount();
  }

  next() {
    if (this.matches.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.matches.length;
    this._highlightCurrent();
    this._scrollToCurrent();
    this._updateCount();
  }

  previous() {
    if (this.matches.length === 0) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.matches.length) % this.matches.length;
    this._highlightCurrent();
    this._scrollToCurrent();
    this._updateCount();
  }

  replace() {
    if (this.matches.length === 0 || this.currentIndex === -1) return;

    const range = this.matches[this.currentIndex];
    const replaceTerm = this.replaceInput.value;

    range.deleteContents();
    range.insertNode(document.createTextNode(replaceTerm));

    const term = this.findInput.value;
    this._find(term);
  }

  replaceAll() {
    if (this.matches.length === 0) return;

    const replaceTerm = this.replaceInput.value;

    // Reverse — end to start
    [...this.matches].reverse().forEach((range) => {
      range.deleteContents();
      range.insertNode(document.createTextNode(replaceTerm));
    });

    this._clearHighlights();
    this.matches = [];
    this.currentIndex = -1;
    this._updateCount();
  }

  // ── Helpers ───────────────────────────────

  _buildTextMap() {
    const walker = document.createTreeWalker(
      this.editorEl,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let fullText = "";
    const map = []; // map[i] -> { node, offset } for character i of fullText

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent;
      if (!text) continue;

      for (let i = 0; i < text.length; i++) {
        map.push({ node, offset: i });
      }
      fullText += text;
    }

    return { fullText, map };
  }

  _highlightCurrent() {
    if (this.currentIndex === -1) return;
    CSS.highlights.set(
      "find-current",
      new Highlight(this.matches[this.currentIndex]),
    );
  }

  _scrollToCurrent() {
    if (this.currentIndex === -1 || !this.matches[this.currentIndex]) return;

    const range = this.matches[this.currentIndex];
    const rect = range.getBoundingClientRect();

    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      range.startContainer.parentElement?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }

  _clearHighlights() {
    CSS.highlights.delete("find-match");
    CSS.highlights.delete("find-current");
  }

  _updateCount() {
    const counter = document.getElementById("find-count");
    if (!counter) return;

    if (this.matches.length === 0) {
      counter.textContent = "No results";
      return;
    }

    counter.textContent = `${this.currentIndex + 1} of ${this.matches.length}`;
  }

  // ── Event Binding ─────────────────────────

  _bindEvents() {
    // Find input — search on every keystroke (debounced)
    this.findInput?.addEventListener("input", () => {
      clearTimeout(this._findTimer);
      this._findTimer = setTimeout(() => {
        this._find(this.findInput.value);
      }, 200);
    });

    // Enter in find input → next
    this.findInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.shiftKey ? this.previous() : this.next();
      }
      if (e.key === "Escape") this.close();
    });

    // Navigation buttons
    document
      .getElementById("find-next-btn")
      ?.addEventListener("click", () => this.next());

    document
      .getElementById("find-prev-btn")
      ?.addEventListener("click", () => this.previous());

    // Replace buttons
    document
      .getElementById("replace-btn")
      ?.addEventListener("click", () => this.replace());

    document
      .getElementById("replace-all-btn")
      ?.addEventListener("click", () => this.replaceAll());

    // Close button
    document
      .getElementById("find-replace-close")
      ?.addEventListener("click", () => this.close());

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) this.close();
    });

    // Keyboard shortcut — Ctrl+F / Cmd+F
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      }
    });
  }
}
