const STORAGE_KEY = "editor_prefs";
const WIDTHS = [100, 80, 70, 50];
const DELAYS = [1000, 2000, 3000, 4000];
export class OptionsMenu {
    constructor({
        editorEl,
        contentArea,
        suggestionManager,
        findReplace,
        documentManager,
    }) {
        this.editorEl = editorEl;
        this.contentArea = contentArea;
        this.suggestionManager = suggestionManager;
        this.findReplace = findReplace;
        this.documentManager = documentManager;

        this.popover = document.getElementById("options-popover");
        this.btn = document.getElementById("options-btn");
        this.isOpen = false;
        this.state = this._loadState();

        this._applyAll();

        this._bindEvents();
    }

    _defaultState() {
        return {
            darkMode: false,
            focusMode: false,
            width: 80,
            delay: 2000,
            autocomplete: true,
            spellcheck: true,
            autosave: true,
        };
    }

    _loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved
                ? { ...this._defaultState(), ...JSON.parse(saved) }
                : this._defaultState();
        } catch {
            return this._defaultState();
        }
    }

    _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch {}
    }

    _set(key, value) {
        this.state[key] = value;
        this._saveState();
    }

    _applyAll() {
        this._applyDarkMode(this.state.darkMode);
        this._applyFocusMode(this.state.focusMode);
        this._applyWidth(this.state.width);
        this._applyDelay(this.state.delay);
        this._applyAutocomplete(this.state.autocomplete);
        this._applyAutosave(this.state.autosave);
        this._applySpellcheck(this.state.spellcheck);
    }

    _applyDarkMode(value) {
        document.documentElement.dataset.theme = value ? "dark" : "light";
    }

    _applyFocusMode(value) {
        document.documentElement.classList.toggle("focus-mode", value);
    }

    _applyWidth(value) {
        const el =
            document.getElementById("editor-wrapper") || this.contentArea;
        if (el) {
            el.style.width = `${value}%`;
            el.style.maxWidth = "100%";
            el.style.marginLeft = "auto";
            el.style.marginRight = "auto";
        }
    }
    _applyDelay(value) {
        if (this.documentManager) {
            setTimeout(() => {
                this.documentManager("SAVE_DELAY", value);
            }, 2000);
        }
    }
    _applyAutosave(value) {
        if (this.documentManager) {
            setTimeout(() => {
                this.documentManager("AUTO_SAVE", value);
            }, 2000);
        }
    }
    _applyAutocomplete(value) {
        if (this.suggestionManager) {
            setTimeout(() => {
                this.suggestionManager.canSuggest = value;
            }, 2000);
        }
    }

    _applySpellcheck(value) {
        if (this.editorEl) {
            this.editorEl.spellcheck = value;
        }
    }
    _toggleDarkMode() {
        const value = !this.state.darkMode;
        this._set("darkMode", value);
        this._applyDarkMode(value);
        this._updateToggle("dark-mode-toggle", value);
    }

    _toggleFocusMode() {
        const value = !this.state.focusMode;
        this._set("focusMode", value);
        this._applyFocusMode(value);
        this._updateToggle("focus-mode-toggle", value);
        if (value) {
            this._onEscape = (e) => {
                if (e.key === "Escape") this._toggleFocusMode();
            };
            document.addEventListener("keydown", this._onEscape);
        } else {
            document.removeEventListener("keydown", this._onEscape);
        }
    }

    _setWidth(value) {
        this._set("width", value);
        this._applyWidth(value);
        this._updateWidthButtons(value);
    }
    _setDelay(value) {
        this._set("delay", value);
        this._applyDelay(value);
        this._updateDelayButtons(value);
    }
    _toggleAutocomplete() {
        const value = !this.state.autocomplete;
        this._set("autocomplete", value);
        this._applyAutocomplete(value);
        this._updateToggle("autocomplete-toggle", value);
    }
    _toggleAutoSave() {
        const value = !this.state.autosave;
        this._set("autosave", value);
        this._applyAutosave(value);
        this._updateToggle("autosave-toggle", value);
    }
    _toggleSpellcheck() {
        const value = !this.state.spellcheck;
        this._set("spellcheck", value);
        this._applySpellcheck(value);
        this._updateToggle("spellcheck-toggle", value);
    }

    _updateToggle(id, value) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("active", value);
    }

    _updateDelayButtons(activeDelay) {
        DELAYS.forEach((d) => {
            const btn = document.getElementById(`delay-${d}`);
            if (btn) btn.classList.toggle("active", d === activeDelay);
        });
    }
    _updateWidthButtons(activeWidth) {
        WIDTHS.forEach((w) => {
            const btn = document.getElementById(`width-${w}`);
            if (btn) btn.classList.toggle("active", w === activeWidth);
        });
    }

    _syncUI() {
        this._updateToggle("dark-mode-toggle", this.state.darkMode);
        this._updateToggle("focus-mode-toggle", this.state.focusMode);
        this._updateToggle("autocomplete-toggle", this.state.autocomplete);
        this._updateToggle("spellcheck-toggle", this.state.spellcheck);
        this._updateToggle("autosave-toggle", this.state.autosave);
        this._updateDelayButtons(this.state.delay);
        this._updateWidthButtons(this.state.width);
    }

    // ── Popover ───────────────────────────────

    open() {
        this.isOpen = true;
        this.popover.classList.remove("hidden");
        if (
            typeof this.popover.showPopover === "function" &&
            this.popover.hasAttribute("popover")
        ) {
            try {
                this.popover.showPopover();
            } catch {}
        }
        this._syncUI();
        this._positionPopover();
    }

    close() {
        this.isOpen = false;
        this.popover.classList.add("hidden");
        if (
            typeof this.popover.hidePopover === "function" &&
            this.popover.hasAttribute("popover")
        ) {
            try {
                this.popover.hidePopover();
            } catch {}
        }
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    _positionPopover() {
        if (!this.btn || !this.popover) return;
        const btnRect = this.btn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const popoverWidth = this.popover.offsetWidth || 260;
        const popoverHeight = this.popover.offsetHeight || 340;

        let left = btnRect.right - popoverWidth;
        let top = btnRect.bottom + 8;

        if (top + popoverHeight > viewportHeight - 8) {
            top = Math.max(8, btnRect.top - popoverHeight - 8);
        }
        if (top < 8) top = 8;

        if (left < 8) left = 8;
        if (left + popoverWidth > viewportWidth - 8) {
            left = viewportWidth - popoverWidth - 8;
        }

        this.popover.style.position = "fixed";
        this.popover.style.left = `${left}px`;
        this.popover.style.top = `${top}px`;
        this.popover.style.maxHeight = `${Math.min(420, viewportHeight - 16)}px`;
    }

    _bindEvents() {
        this.btn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close on outside click
        document.addEventListener("click", (e) => {
            if (
                this.isOpen &&
                !this.popover.contains(e.target) &&
                e.target !== this.btn
            ) {
                this.close();
            }
        });

        // Dark mode
        document
            .getElementById("dark-mode-toggle")
            ?.addEventListener("click", () => this._toggleDarkMode());

        // Focus mode
        document
            .getElementById("focus-mode-toggle")
            ?.addEventListener("click", () => this._toggleFocusMode());

        // Width buttons
        WIDTHS.forEach((w) => {
            document
                .getElementById(`width-${w}`)
                ?.addEventListener("click", () => this._setWidth(w));
        });
        DELAYS.forEach((d) => {
            document
                .getElementById(`delay-${d}`)
                ?.addEventListener("click", () => this._setDelay(d));
        });

        // Autocomplete
        document
            .getElementById("autocomplete-toggle")
            ?.addEventListener("click", () => this._toggleAutocomplete());

        // Spell check
        document
            .getElementById("spellcheck-toggle")
            ?.addEventListener("click", () => this._toggleSpellcheck());
        document
            .getElementById("autosave-toggle")
            ?.addEventListener("click", () => this._toggleAutoSave());

        // Find & Replace open
        document
            .getElementById("find-replace-btn")
            ?.addEventListener("click", () => {
                this.close();
                this.findReplace?.open();
            });
    }
}
