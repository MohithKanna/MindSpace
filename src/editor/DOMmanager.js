export class DOMmanager {
    constructor() {
        this.editorEl = document.getElementById("editor");
        this.titleEl = document.getElementById("editor-title");
        this.tasks = {
            GET_PREV_ID: (p) => this._getPrevBlock(p.node),
            IS_LAST_EL: (p) => this.isLastEL(p.node),
            IS_FIRST_EL: (p) => this.isFirstEl(p.node),
            GET_CHILD_LIST: () => this.getChildList(),
            LOAD_TEXT: (p) => this._loadText(p.frame),
            SET_UP: (p) => this._set_up(p),
            LOAD_TITLE: (p) => this._loadTitle(p.title),
            INSERT_CARET: (p) => this._insertCaret(p),
        };
    }
    _set_up = (p) => {
        this._loadText(p.frame);
        this._loadTitle(p.title);
        this._insertCaret(p.caret);
    };
    _loadText(frame) {
        this.editorEl.innerHTML = "";
        this.editorEl.appendChild(frame);
    }
    _loadTitle(title) {
        this.titleEl.innerHTML = "";
        this.titleEl.textContent = title;
    }
    _insertCaret(caretObj) {
        if (!caretObj) return;

        let blockEl;
        if (caretObj.nestedBlocks && caretObj.nestedBlocks.length > 0) {
            // Traverse nested blocks from outermost to innermost
            let currentElement = this.editorEl;
            for (let i = caretObj.nestedBlocks.length - 1; i >= 0; i--) {
                const nestedBlock = caretObj.nestedBlocks[i];
                const parentBlock = currentElement.querySelector(
                    `[data-blockid="${nestedBlock.blockId}"]`,
                );
                if (!parentBlock) return;
                currentElement = parentBlock.children[nestedBlock.index];
                if (!currentElement) return;
            }
            blockEl = currentElement.querySelector(
                `[data-blockid="${caretObj.blockId}"]`,
            );
        } else {
            // Direct block lookup
            blockEl = this.editorEl.querySelector(
                `[data-blockid="${caretObj.blockId}"]`,
            );
        }

        if (!blockEl) return;

        const targetChild = blockEl.childNodes[caretObj.childIndex];
        if (!targetChild) {
            const brEl = blockEl.querySelector("br");
            if (brEl) {
                const range = document.createRange();
                const sel = window.getSelection();
                range.setStartAfter(brEl);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            return;
        }

        const textNode =
            targetChild.nodeType === 3 ? targetChild : targetChild.firstChild;

        const range = document.createRange();
        const sel = window.getSelection();

        try {
            range.setStart(textNode, caretObj.offset);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch {
            const brEl = blockEl.querySelector("br");
            if (brEl) {
                range.setStartAfter(brEl);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
    manage(work, payload) {
        return this.tasks[work]?.(payload);
    }
    isLastEL(node) {
        const lastChild = this.editorEl.lastElementChild;
        return lastChild === node;
    }
    isFirstEl(node) {
        const firstChild = this.editorEl.firstElementChild;
        return firstChild === node;
    }
    _getPrevBlock(node) {
        let prev = node.previousElementSibling;
        while (prev && !prev.hasAttribute("data-blockid")) {
            prev = prev.previousElementSibling;
        }
        return prev?.dataset?.blockid;
    }
    getChildList() {
        return Array.from(this.editorEl.children);
    }
}
