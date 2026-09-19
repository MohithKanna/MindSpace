export class SelectionManager {
    _set_up(payload) {
        this.styleManager = payload.styleManager;
        this.caret = {};
        this.editorEl = document.getElementById("editor");
    }
    manage = (payload) => {
        if (payload.getselection) this._getSelection();
        if (payload.selection) return this.handleSelection();

        if (payload.saveSelection) return this._saveSelection();
        if (payload.splitBoundaries) return this._splitBoundaries();
        if (payload.restoreSelection) return this._restoreSelection(payload);

        if (payload.getCaret) return this.caret;
        if (payload.getBlock) return this.getCurrentBlock();

        if (payload.getSelectedBlocks) return this.getSelectedBlocks();
        if (payload.getTextNodes) return this.getTextNodes();

        if (payload.setup) return this._set_up(payload);
    };
    handleSelection() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        return sel.isCollapsed
            ? this._handleCaret(sel)
            : this._handleRange(range);
    }
    getSelectedBlocks() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        return Array.from(this.editorEl.children).filter((child) => {
            return (
                child.hasAttribute("data-blockid") &&
                range.intersectsNode(child)
            );
        });
    }
    getCurrentBlock() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        return this._findBlock(sel.getRangeAt(0).startContainer);
    }
    _getSelection() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const range = sel.getRangeAt(0);
        this.currentRange = range;
    }
    getTextNodes(range) {
        let currentRange = range ?? this.currentRange;
        if (!currentRange) {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return [];
            currentRange = sel.getRangeAt(0);
        }
        const ancestor = currentRange.commonAncestorContainer;
        if (ancestor.nodeType === Node.TEXT_NODE) return [ancestor];
        const walker = document.createTreeWalker(
            ancestor,
            NodeFilter.SHOW_TEXT,
        );

        const nodes = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (currentRange.intersectsNode(node)) nodes.push(node);
        }
        return nodes;
    }
    _splitBoundaries() {
        const range = this.currentRange ?? this._getLiveRange();
        if (!range) return;
        const { startContainer, startOffset, endContainer, endOffset } = range;
        if (
            endContainer.nodeType === Node.TEXT_NODE &&
            endOffset < endContainer.length
        ) {
            endContainer.splitText(endOffset);
        }
        if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
            const newStart = startContainer.splitText(startOffset);
            range.setStart(newStart, 0);
        }
    }
    _getLiveRange() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        return sel.getRangeAt(0);
    }
    _saveSelection() {
        const range = this.currentRange ?? this._getLiveRange();
        if (!range) return null;
        const startMarker = document.createElement("span");
        const endMarker = document.createElement("span");

        startMarker.setAttribute("data-selection", "start");
        endMarker.setAttribute("data-selection", "end");

        // invisible but keeps position
        startMarker.style.display = "inline-block";
        endMarker.style.display = "inline-block";
        startMarker.style.width = "0";
        endMarker.style.width = "0";

        const clonedRange = range.cloneRange();

        clonedRange.collapse(false);
        clonedRange.insertNode(endMarker);

        clonedRange.setStart(range.startContainer, range.startOffset);
        clonedRange.collapse(true);
        clonedRange.insertNode(startMarker);

        return { startMarker, endMarker };
    }
    _restoreSelection(markers) {
        const { startMarker, endMarker } = markers;
        const sel = window.getSelection();
        const range = document.createRange();

        if (!startMarker || !endMarker) return;

        range.setStartAfter(startMarker);
        range.setEndBefore(endMarker);

        startMarker.remove();
        endMarker.remove();

        sel.removeAllRanges();
        sel.addRange(range);
    }

    _handleRange(range) {
        const rect = range.getBoundingClientRect();
        this.currentRange = range;
        this.styleManager?.({
            mode: "selection",
            bounds: {
                start: this._getNodePath(
                    range.startContainer,
                    range.startOffset,
                ),
                end: this._getNodePath(range.endContainer, range.endOffset),
                ancestor: range.commonAncestorContainer,
            },
            textNodes: this.getTextNodes(range),
            position: this._getRectMeta(rect),
            range,
        });
    }

    _handleCaret(sel) {
        const node = sel.anchorNode;
        const blockEl = this._findBlock(node);

        if (!blockEl) return null;

        const childIndex = this._getDirectChildIndex(blockEl, node);

        const nestedBlocks = this._getNestedBlocks(blockEl);

        this.caret = {
            blockId: blockEl.dataset.blockid,
            childIndex,
            offset: sel.anchorOffset,
            nestedBlocks: nestedBlocks.length ? nestedBlocks : null,
        };
        this.styleManager?.({ mode: "caret", node });
    }

    _findBlock(node) {
        let current =
            node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

        while (current && current !== this.editorEl) {
            if (this._isBlock(current)) return current;
            current = current.parentElement;
        }
        return null;
    }

    _isBlock(el) {
        return (
            el?.nodeType === Node.ELEMENT_NODE &&
            el.hasAttribute("data-blockid")
        );
    }

    _getDirectChildIndex(blockEl, node) {
        let target = node;

        while (target && target.parentElement !== blockEl) {
            target = target.parentElement;
        }

        return Array.prototype.indexOf.call(blockEl.childNodes, target);
    }

    _getNestedBlocks(blockEl) {
        const result = [];
        let current = blockEl;
        let parent = blockEl.parentElement;

        while (parent) {
            if (this._isBlock(parent)) {
                result.push({
                    blockId: parent.dataset.blockid,
                    index: Array.prototype.indexOf.call(
                        parent.children,
                        current,
                    ),
                });
                current = parent;
            }
            parent = parent.parentElement;
        }

        return result;
    }

    _getNodePath(node, offset) {
        const path = [];
        let current = node;

        while (current && current !== this.editorEl) {
            if (this._isBlock(current)) {
                path.unshift(current.dataset.blockid);
                break;
            }

            const parent = current.parentElement;
            if (parent) {
                const index = Array.prototype.indexOf.call(
                    parent.childNodes,
                    current,
                );
                if (index >= 0) path.unshift(index);
            }

            current = parent;
        }

        path.push(offset);
        return path.join(":");
    }

    _getRectMeta(rect) {
        return {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
        };
    }
}
