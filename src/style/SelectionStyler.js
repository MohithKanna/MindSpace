const FONT_MAP = {
    Inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    "Plus Jakarta Sans": "'Plus Jakarta Sans', sans-serif",
    Outfit: "'Outfit', sans-serif",
    Poppins: "'Poppins', sans-serif",
    Roboto: "'Roboto', sans-serif",
    "Playfair Display": "'Playfair Display', Georgia, serif",
    Lora: "'Lora', Georgia, serif",
    Merriweather: "'Merriweather', serif",
    "JetBrains Mono": "'JetBrains Mono', monospace",
    "Fira Code": "'Fira Code', monospace",
    "Segoe UI": "'Segoe UI', sans-serif",
    Arial: "Arial, sans-serif",
    Georgia: "Georgia, serif",
    "Courier New": "'Courier New', monospace",
};

export function getFullFontFamily(fontName) {
    if (!fontName || fontName === "inherit") return "inherit";
    const clean = fontName.replace(/['"]/g, "").split(",")[0].trim();
    if (FONT_MAP[clean]) return FONT_MAP[clean];
    if (fontName.includes(",")) return fontName;
    return `'${clean}', sans-serif`;
}

export class SelectionStyler {
    constructor(payload) {
        this.styleFactory = payload.styleFactory;
        this.selectionManager = payload.selectionManager;
        this.activeStyles = {};
    }
    manage = (payload) => {
        const { style, value, update } = payload;
        if (style === "removeStyle") return this.clearFormatting();
        if (style === "block-type") return this.changeType(value);
        if (style === "underline") return this._getStyledByBrowser(style);
        if (style === "strikethrough") return this._getStyledByBrowser(style);
        if (update) return (this.activeStyles = payload.activeStyles);
        if (style) this._applyStyles(style, value);
    };

    clearFormatting() {
        this.activeStyles = {};

        const sel = window.getSelection();
        const liveRange =
            sel && sel.rangeCount > 0 && !sel.isCollapsed
                ? sel.getRangeAt(0).cloneRange()
                : null;

        const clearParentSpanContext = (anchorNode) => {
            if (!anchorNode) return;
            let node =
                anchorNode.nodeType === Node.TEXT_NODE
                    ? anchorNode.parentElement
                    : anchorNode;
            while (
                node &&
                node.tagName === "SPAN" &&
                !node.hasAttribute("data-blockid")
            ) {
                node.style.cssText = "";
                node = node.parentElement;
            }
        };

        if (sel && sel.isCollapsed) {
            clearParentSpanContext(sel.anchorNode);
        }

        try {
            document.execCommand("removeFormat", false, null);
        } catch {}

        const stripInlineStyleFromNode = (node) => {
            if (!node || !node.parentElement) return;
            let el = node.parentElement;
            while (
                el &&
                el.tagName === "SPAN" &&
                !el.hasAttribute("data-blockid")
            ) {
                el.style.cssText = "";
                const nextParent = el.parentElement;
                if (
                    nextParent &&
                    nextParent.tagName === "SPAN" &&
                    !nextParent.hasAttribute("data-blockid")
                ) {
                    el = nextParent;
                    continue;
                }
                break;
            }
        };

        if (!liveRange) {
            const anchorNode = sel?.anchorNode;
            if (anchorNode) {
                const textNode =
                    anchorNode.nodeType === Node.TEXT_NODE
                        ? anchorNode
                        : anchorNode.firstChild;
                if (textNode) stripInlineStyleFromNode(textNode);
            }
            return;
        }

        const ancestor = liveRange.commonAncestorContainer;
        const textNodes = [];
        if (ancestor.nodeType === Node.TEXT_NODE) {
            textNodes.push(ancestor);
        } else {
            const walker = document.createTreeWalker(
                ancestor,
                NodeFilter.SHOW_TEXT,
            );
            while (walker.nextNode()) {
                if (liveRange.intersectsNode(walker.currentNode)) {
                    textNodes.push(walker.currentNode);
                }
            }
        }

        textNodes.forEach((node) => stripInlineStyleFromNode(node));
    }

    _getStyledByBrowser(mark) {
        document.execCommand(mark, false, null);
    }

    changeType(type) {
        if (!type) return;

        const listTypes = ["unordered-list", "ordered-list", "none-list"];
        if (listTypes.includes(type)) {
            return this._handleListType(type);
        }

        this._changeTo(type);
    }
    _handleListType(type) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);
        let parentEl = range.startContainer;

        while (
            parentEl &&
            parentEl.tagName !== "UL" &&
            parentEl.tagName !== "OL"
        ) {
            parentEl = parentEl.parentElement;
        }

        if (parentEl) {
            const removeCmd =
                parentEl.tagName === "UL"
                    ? "insertUnorderedList"
                    : "insertOrderedList";
            return this._getStyledByBrowser(removeCmd);
        }
        if (type !== "none-list") {
            this._getStyledByBrowser(type);
        }
    }
    _changeTo(type) {
        const blocks = this.selectionManager({ getSelectedBlocks: true });
        if (!blocks?.length) return;
        blocks.forEach((b) => {
            this.styleFactory({ transformBlock: true, el: b, type });
        });
    }
    MARK_TO_CSS = {
        bold: { prop: "fontWeight", on: "bold", off: "normal" },
        italic: { prop: "fontStyle", on: "italic", off: "normal" },
        superscript: { prop: "verticalAlign", on: "super", off: "baseline" },
        subscript: { prop: "verticalAlign", on: "sub", off: "baseline" },
        code: { prop: "fontFamily", on: "monospace", off: "inherit" },
        color: { prop: "color", on: null, off: "" },
        backgroundColor: {
            prop: "backgroundColor",
            on: null,
            off: "transparent",
        },
        fontSize: { prop: "fontSize", on: null, off: "inherit" },
        fontFamily: { prop: "fontFamily", on: null, off: "inherit" },
        letterSpacing: { prop: "letterSpacing", on: null, off: "normal" },
        textTransform: { prop: "textTransform", on: null, off: "none" },
        textDecorationLine: {
            prop: "textDecorationLine",
            on: null,
            off: "none",
        },
        textDecorationStyle: {
            prop: "textDecorationStyle",
            on: null,
            off: "solid",
        },
    };
    _applyStyles(key, value) {
        this.selectionManager({ splitBoundaries: true });
        const textNodes = this.selectionManager({
            getTextNodes: true,
        });
        if (!textNodes?.length) return;
        if (typeof value === "string" || typeof value === "number") {
            this.activeStyles[key] = value;
        } else {
            this.activeStyles[key] = !this.activeStyles[key];
        }
        const storedValue = this.activeStyles[key];
        const css = this.MARK_TO_CSS[key];

        textNodes.forEach((textNode) => {
            this.wrapWithStyles(textNode, key, storedValue, css);
        });
    }
    wrapWithStyles(textNode, key, value, css) {
        if (!css) return textNode;

        const parent = textNode.parentNode;
        const isDecorationMark = key === "underline" || key === "strikethrough";

        if (
            parent &&
            parent.nodeName === "SPAN" &&
            !parent.hasAttribute("data-blockid") &&
            parent.childNodes.length === 1 &&
            parent.firstChild === textNode
        ) {
            if (isDecorationMark) {
                parent.style.textDecoration = this._buildTextDecoration(
                    key,
                    value,
                );
                return parent;
            }

            parent.style[css.prop] = value ? (css.on ?? value) : "";
            return parent;
        }

        let cssVal = value ? (css.on ?? value) : "";
        if (
            key === "fontSize" &&
            cssVal &&
            /^\d+$/.test(String(cssVal).trim())
        ) {
            cssVal = String(cssVal).trim() + "px";
        }
        if (key === "fontFamily" && cssVal && cssVal !== "inherit") {
            cssVal = getFullFontFamily(cssVal);
        }

        const span = document.createElement("span");
        parent.insertBefore(span, textNode);
        span.appendChild(textNode);

        if (isDecorationMark) {
            span.style.textDecoration = this._buildTextDecoration(key, value);
        } else {
            span.style[css.prop] = cssVal;
        }
        return span;
    }

    _buildTextDecoration(changedMark, newValue) {
        const underline =
            changedMark === "underline"
                ? !!newValue
                : !!this.activeStyles["underline"];
        const strikethrough =
            changedMark === "strikethrough"
                ? !!newValue
                : !!this.activeStyles["strikethrough"];

        const parts = [];
        if (underline) parts.push("underline");
        if (strikethrough) parts.push("line-through");
        return parts.length ? parts.join(" ") : "none";
    }
}
