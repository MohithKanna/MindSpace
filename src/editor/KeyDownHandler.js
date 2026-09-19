export class KeyDownHandler {
    _set_up(payload) {
        this.selectionManager = payload.selectionManager;
        this.documentManager = payload.documentManager;
        this.blockManager = payload.blockManager;
        this.normalizer = payload.normalizer;
        this.suggestionManager = payload.suggestionManager;
        this.styleManager = payload.styleManager;
    }
    _clean_up() {
        this.selectionManager = null;
        this.documentManager = null;
        this.blockManager = null;
        this.normalizer = null;
        this.styleManager = null;
    }
    handle(payload) {
        if (payload.key === "Enter") return this._handle_Enter(payload);
        if (payload.key === "Backspace") return this._handle_Backspace(payload);
        if (payload.key === "Tab") return this._handleTab(payload);
        if (payload.key === "ArrowRight")
            return this._handleArrowRight(payload);
        if (payload.key === "Escape") return this._handleEscape(payload);
        if (payload.setup) return this._set_up(payload);
        if (payload.cleanup) return this._clean_up();
        if (
            (payload.e.ctrlKey || payload.e.metaKey) &&
            payload.e.key.toLowerCase() === "s"
        )
            return this._handleSave(payload);
        if (
            (payload.e.ctrlKey || payload.e.metaKey) &&
            !payload.e.shiftKey &&
            ["b", "i", "u"].includes(payload.e.key.toLowerCase())
        )
            return this._handleFormatShortcut(payload);
    }
    _handleFormatShortcut(payload) {
        if (payload.targetId !== "editor") return;
        payload.e.preventDefault();
        const commandByKey = { b: "bold", i: "italic", u: "underline" };
        const command = commandByKey[payload.e.key.toLowerCase()];
        this.styleManager?.({ inlineStyle: true, command });
    }
    _handleSave(payload) {
        payload.e.preventDefault();
        this.documentManager("SAVE_NOW");
    }
    _handle_Backspace(payload) {
        if (this.suggestionManager({ hasSuggestion: true })) {
            this.suggestionManager({ clear: true });
        }
        if (payload.targetId === "editor") {
            const editor = document.getElementById("editor");
            if (editor.childNodes.length === 1) {
                const onlyChild = editor.childNodes[0];
                const isEmpty = onlyChild.textContent.trim().length === 0;
                if (isEmpty) {
                    payload.e.preventDefault();
                    if (onlyChild.innerHTML) {
                        onlyChild.innerHTML = " ";
                        onlyChild.dataset.blocktype = "";
                        onlyChild.style.cssText = "";
                    }
                    return;
                }
            }
        }
    }
    _handleTab(payload) {
        if (this.suggestionManager({ hasSuggestion: true })) {
            payload.e.preventDefault();
            this.suggestionManager({ acceptSuggestion: true });
        }
    }
    _handleArrowRight(payload) {
        if (this.suggestionManager({ hasSuggestion: true })) {
            payload.e.preventDefault();
            this.suggestionManager({ acceptSuggestion: true });
        }
    }
    _handleEscape(payload) {
        if (this.suggestionManager({ hasSuggestion: true })) {
            this.suggestionManager({ clear: true });
        }
    }
    _handle_Enter(payload) {
        const { targetId, target, e } = payload;
        if (targetId === "editor-title") {
            e.preventDefault();
            handleShifting(target);
            this.documentManager("MANAGE_TITLE", { title: target.textContent });
        }

        if (targetId === "editor") {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            let node = range.startContainer;
            while (node && node.nodeName !== "LI") {
                node = node.parentNode;
            }
            if (node) {
                const isEmpty = node.textContent.trim() === "";
                if (isEmpty) {
                    e.preventDefault();
                    handleEmptyLi(sel, node);
                    return;
                }
            }
            const targetElement =
                range.startContainer.nodeType === 3
                    ? range.startContainer.parentElement
                    : range.startContainer;

            node = targetElement.closest("[data-blockid]");

            setTimeout(() => {
                if (!node) return;
                const id = node.getAttribute("data-blockId");
                const block = this.normalizer(node, id);
                this.blockManager("UPDATE", { id, block });
            }, 0);
        }
    }
}

function handleShifting(target) {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const fullText = target.innerText;
    const caretPos = range.startOffset;
    const textToKeep = fullText.slice(0, caretPos);
    const textToMove = fullText.slice(caretPos);
    target.innerText = textToKeep;
    const editor = document.getElementById("editor");
    const firstBlock = editor.firstElementChild;
    if (textToMove === "" && firstBlock.innerText.trim() === "") {
        firstBlock.innerHTML = "<br>"; // default control better shift logic
    } else {
        firstBlock.innerText =
            textToMove + firstBlock.innerText.replace(/^\n/, "");
    }
    editor.focus();
    const newRange = document.createRange();
    const targetNode = firstBlock.firstChild || firstBlock;
    newRange.setStart(targetNode, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
}
function handleEmptyLi(sel, node) {
    const list = node.parentNode; // UL or OL
    const block = list.closest(".block"); // your wrapper
    // remove empty li
    node.remove();

    // create new div block OUTSIDE list
    const newDiv = document.createElement("div");
    newDiv.innerHTML = "<br>";

    // insert after list container
    block.parentNode.insertBefore(newDiv, block.nextSibling);

    // move cursor
    const newRange = document.createRange();
    newRange.setStart(newDiv, 0);
    newRange.collapse(true);

    sel.removeAllRanges();
    sel.addRange(newRange);

    // cleanup: if list empty → remove it
    if (!list.children.length) {
        block.remove();
    }
}
