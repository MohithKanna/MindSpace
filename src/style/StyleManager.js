import { FloatingToolBar } from "../toolbar/FloatingToolBar.js";
import { StaticToolBar } from "../toolbar/StaticToolBar.js";
import { CaretStyler } from "./CaretStyler.js";
import { SelectionStyler } from "./SelectionStyler.js";
export class StyleManager {
    constructor(payload) {
        this.editorEl = document.getElementById("editor");
        this.lastSelection = null;
        this.isVisible = false;
        this.styleFactory = payload.styleFactory;
        this.floatingToolBar = null;
        this.staticToolbar = null;
        this.styler = null;
    }

    manage = (payload) => {
        if (payload.apply) return this.caretStyler.manage(payload);
        if (payload.inlineStyle) return this.caretStyler.manage(payload);
        if (payload.mode === "caret") return this._handleCaret(payload);
        if (payload.mode === "selection") return this._handleSelection(payload);
        if (payload.setup) return this._setup(payload);
        if (payload.getStyle) return this._getStyle(payload);

        return this._reset();
    };

    _handleCaret({ node }) {
        this._hideToolbar();
        const active = this.styleFactory({
            collectStyles: true,
            textNode: node,
        });
        this.staticToolbar?.update(active);
    }

    _handleSelection(payload) {
        const { range, bounds, position, textNodes } = payload;
        if (!range) return this._hideToolbar();
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

        if (!this.editorEl.contains(node)) return this._hideToolbar();

        const currentSelection = {
            startPath: bounds?.start,
            startOffset: range.startOffset,
            endPath: bounds?.end,
            endOffset: range.endOffset,
        };

        if (this._isSameSelection(currentSelection)) return;

        this.lastSelection = currentSelection;

        const activeStyles = this.styleFactory({
            computeSelectionStyles: true,
            textNodes,
        });

        this.floatingToolBar?.update(activeStyles, position);

        this.selectionStyler.manage({ update: true, activeStyles });
        this.isVisible = true;
    }

    _reset() {
        this._hideToolbar();
    }
    _getStyle(payload) {
        return this.caretStyler?.manage(payload) ?? null;
    }

    _hideToolbar() {
        if (!this.isVisible) return;
        this.floatingToolBar?.hide();
        this.isVisible = false;
        this.lastSelection = null;
    }

    _isSameSelection(curr) {
        const prev = this.lastSelection;
        if (!prev) return false;

        return (
            prev.startPath === curr.startPath &&
            prev.startOffset === curr.startOffset &&
            prev.endPath === curr.endPath &&
            prev.endOffset === curr.endOffset
        );
    }

    _setup(payload) {
        this.selectionManager = payload.selectionManager;
        this.caretStyler = new CaretStyler({
            styleFactory: this.styleFactory,
            ...payload,
            setup: payload.style,
        });
        this.selectionStyler = new SelectionStyler({
            selectionManager: this.selectionManager,
            styleFactory: this.styleFactory,
        });

        this.floatingToolBar = new FloatingToolBar(this.selectionStyler.manage);
        this.staticToolbar = new StaticToolBar({
            caretStyler: this.caretStyler.manage,
            selectionStyler: this.selectionStyler.manage,
        });
    }
}
