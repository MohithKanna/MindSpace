export class SuggestionManager {
    constructor() {
        this.field = document.getElementById("suggestion-field");
        this.currentSuggestion = null;
        this.data = null;
        this.canSuggest = false;
    }

    async loadData() {
        try {
            const response = await fetch(
                "../dataset/wordfreq-en-25000-log.json",
            );
            if (!response.ok) throw new Error("File not found");
            const json = await response.json();
            // Store all words in descending order of frequency (most common first)
            this.data = json.map(([word]) => word.toLowerCase());
            this.canSuggest = true;
        } catch {}
    }

    manage(payload) {
        if (payload.hasSuggestion) return this._hasSuggestion();
        if (payload.suggestion) return this._suggestion();
        if (payload.acceptSuggestion) return this.acceptSuggestion();
        if (payload.cleanup) return this.cleanup();
        if (payload.setup) return this.loadData();
        if (payload.clear) return this._clear();
    }

    _isInsideWord(range) {
        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE) return false;

        const textAfter = node.textContent.slice(range.startOffset);
        return textAfter.length > 0 && /\w/.test(textAfter[0]);
    }

    _getPrefix(range, block) {
        const preRange = range.cloneRange();
        preRange.selectNodeContents(block);
        preRange.setEnd(range.startContainer, range.startOffset);

        const textBeforeCaret = preRange.toString();
        if (!textBeforeCaret) return "";

        const parts = textBeforeCaret.split(/\s+/);
        const lastPart = parts[parts.length - 1];
        if (!lastPart || !/^[a-zA-Z]+$/.test(lastPart)) return "";
        return lastPart.toLowerCase();
    }

    _getCaretRect(range) {
        const rects = range.getClientRects();
        if (rects.length > 0) return rects[0];
        return range.getBoundingClientRect();
    }

    _suggestion() {
        if (!this.canSuggest || !this.data) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return this._clear();

        const range = sel.getRangeAt(0);
        if (!range.collapsed) return this._clear();

        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        const block = node.closest("[data-blockid]");
        if (!block) return this._clear();

        if (this._isInsideWord(range)) return this._clear();

        const prefix = this._getPrefix(range, block);
        // Only suggest for prefixes of length 2 or more to prevent noise
        if (!prefix || prefix.length < 2) return this._clear();

        const preRange = range.cloneRange();
        preRange.selectNodeContents(block);
        preRange.setEnd(range.startContainer, range.startOffset);
        const textBeforeCaret = preRange.toString();
        const caretOffset = textBeforeCaret.length;
        const startOffset = caretOffset - prefix.length;

        // Find the highest frequency word starting with this prefix
        const match = this.data.find(
            (word) => word.startsWith(prefix) && word.length > prefix.length,
        );

        if (!match) return this._clear();

        const suffix = match.slice(prefix.length);

        this.currentSuggestion = {
            full: match,
            suffix,
            prefix,
            startOffset,
            caretOffset,
            block,
            textNode: range.startContainer,
            nodeOffset: range.startOffset,
        };

        this._updateField(range, suffix);
    }

    _updateField(range, suffix) {
        if (!this.field || !suffix) return;

        const rect = this._getCaretRect(range);
        if (!rect || (rect.top === 0 && rect.left === 0)) return;

        // Match font size, font family, line height & weight of span/block at caret
        let el = range.startContainer;
        if (el.nodeType === Node.TEXT_NODE) el = el.parentElement;

        if (el && typeof window !== "undefined") {
            const comp = window.getComputedStyle(el);
            this.field.style.fontSize = comp.fontSize;
            this.field.style.fontFamily = comp.fontFamily;
            this.field.style.lineHeight = `${rect.height}px`;
            this.field.style.fontWeight = comp.fontWeight;
            this.field.style.fontStyle = comp.fontStyle;
            this.field.style.letterSpacing = comp.letterSpacing;
        }

        this.field.style.left = `${rect.left + window.scrollX}px`;
        this.field.style.top = `${rect.top + window.scrollY}px`;
        this.field.textContent = suffix;
        this.field.style.display = "block";
    }

    acceptSuggestion() {
        const suggestion = this.currentSuggestion;
        if (!suggestion) return false;

        const { textNode, nodeOffset, prefix, full, block } = suggestion;

        if (!textNode || !textNode.parentNode) {
            this._clear();
            return false;
        }

        const caretPosInBlock = suggestion.startOffset + full.length;

        const before = textNode.textContent.slice(
            0,
            nodeOffset - prefix.length,
        );
        const after = textNode.textContent.slice(nodeOffset);
        textNode.textContent = before + full + after;

        setTimeout(() => {
            this.restoreCaretByOffset(block, caretPosInBlock);
        }, 0);

        this._clear();
        return true;
    }

    restoreCaretByOffset(block, targetOffset) {
        const walker = document.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT,
            null,
        );
        let remaining = targetOffset;

        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (remaining <= node.length) {
                const range = document.createRange();
                range.setStart(node, remaining);
                range.collapse(true);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
            remaining -= node.length;
        }
    }

    _hasSuggestion() {
        return this.currentSuggestion !== null;
    }

    _clear() {
        this.currentSuggestion = null;
        if (!this.field) return;
        this.field.style.display = "none";
        this.field.textContent = "";
    }

    cleanup() {
        this.data = null;
        this.canSuggest = false;
        this._clear();
    }
}
