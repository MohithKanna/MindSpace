export class Listener {
    constructor(rootElement, callback) {
        this.isActive = false;
        this.rootElement = rootElement;
        this.callback = callback;
        this.handleInput = debounce(this._Input, 300);
        this.handleSelection = debounce(this._selection, 80);
        this.handleSuggestion = debounce(this._suggestion, 50);
    }
    _isEditorTarget(target) {
        if (!target) return false;

        return (
            target.id === "editor" ||
            target.id === "editor-title" ||
            target.closest?.("#editor")
        );
    }
    _Input(e) {
        const target = e.target;
        const targetId = e.target.id;
        this.callback("INPUT", { target, targetId });
    }
    handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        this.rootElement.execCommand("insertText", false, text);
    }
    handleKeyDown(e) {
        const key = e.key;
        const target = e.target;
        const targetId = e.target.id;
        this.callback("KEYDOWN", { key, target, targetId, e });
    }
    handleDelay() {
        this.callback("INPUT", { delay: true });
    }
    _selection() {
        this.callback("SELECTION", { selection: true });
    }
    _suggestion() {
        this.callback("SUGGESTION", { suggestion: true });
    }
    applyPendingStyles(e) {
        this.callback("STYLER", { apply: true, e });
    }
    _handleSaveRequest(forced = false) {
        if (forced) {
            this.callback("DOCUMENTMANAGER", "SAVE_NOW");
        } else {
            this.callback("DOCUMENTMANAGER", "SAVE_REQUEST");
        }
    }
    start() {
        if (this.isActive) return;

        this._onInput = (e) => {
            if (!this._isEditorTarget(e.target)) return;
            this.handleDelay();
            this.handleSuggestion();
            this.handleInput(e);
        };
        this._onBeforeInput = (e) => {
            if (e.inputType !== "insertText") return;
            if (e.target.id === "editor") {
                this.applyPendingStyles(e);
            }
        };
        this._onPaste = (e) => {
            if (!this._isEditorTarget(e.target)) return;
            if (!e.clipboardData) return;
            this.handlePaste(e);
        };
        this._onKeyDown = (e) => {
            if (!this._isEditorTarget(e.target)) return;
            this.handleKeyDown(e);
        };
        this._onBlur = () => {
            this._handleSaveRequest();
        };
        this._onBeforeUnload = (e) => {
            this._handleSaveRequest(true);
            const notSaved = this.callback("DOCUMENTMANAGER", "NOT_SAVED");
            if (notSaved) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        this._onVisibilityChange = () => {
            if (document.hidden) {
                this._handleSaveRequest();
            }
        };
        this._onSelectionChange = () => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;

            let node = sel.getRangeAt(0).startContainer;

            if (node.nodeType === Node.TEXT_NODE) {
                node = node.parentElement;
            }

            if (!node?.closest?.("#editor")) return;
            this.handleDelay();
            this.handleSelection();
        };

        this.rootElement.addEventListener("input", this._onInput);
        this.rootElement.addEventListener("beforeinput", this._onBeforeInput);
        this.rootElement.addEventListener("paste", this._onPaste);
        this.rootElement.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("blur", this._onBlur);
        window.addEventListener("beforeunload", this._onBeforeUnload);
        document.addEventListener("visibilitychange", this._onVisibilityChange);
        this.rootElement.addEventListener(
            "selectionchange",
            this._onSelectionChange,
        );
        this.isActive = true;
    }

    stop() {
        if (!this.isActive) return;
        this.rootElement.removeEventListener("input", this._onInput);
        this.rootElement.removeEventListener(
            "beforeinput",
            this._onBeforeInput,
        );
        this.rootElement.removeEventListener("paste", this._onPaste);
        this.rootElement.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("blur", this._onBlur);
        window.removeEventListener("beforeunload", this._onBeforeUnload);
        document.removeEventListener(
            "visibilitychange",
            this._onVisibilityChange,
        );
        this.rootElement.removeEventListener(
            "selectionchange",
            this._onSelectionChange,
        );

        this.isActive = false;
    }
}
function debounce(fn, delay) {
    let timerId = null;
    return function (...args) {
        const context = this;
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
            fn.apply(context, args);
            timerId = null;
        }, delay);
    };
}
