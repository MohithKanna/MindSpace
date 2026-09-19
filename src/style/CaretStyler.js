import { getFullFontFamily } from "./SelectionStyler.js";

export class CaretStyler {
    constructor(payload) {
        this.styleFactory = payload.styleFactory;
        this._setup(payload.setup);
    }
    manage = (payload) => {
        if (payload.apply) return this.handleBeforeInput(payload);
        if (payload.inlineStyle) return this.styleInline(payload);
        if (payload.blockStyle) return this.styleBlock(payload);
        if (payload.getStyle) return this.__getStorableData();
    };
    styleInline(payload) {
        switch (payload.command) {
            case "bold":
                this.inlineLevel_current.fontWeight =
                    this.inlineLevel_current.fontWeight === "bold"
                        ? "normal"
                        : "bold";
                break;

            case "italic":
                this.inlineLevel_current.fontStyle =
                    this.inlineLevel_current.fontStyle === "italic"
                        ? "normal"
                        : "italic";
                break;

            case "underline":
                this.decorationState.underline =
                    !this.decorationState.underline;
                this._applyDecoration();
                break;

            case "strikethrough":
                this.decorationState.strikethrough =
                    !this.decorationState.strikethrough;
                this._applyDecoration();
                break;

            case "removeStyle":
                this._setup();
                break;

            case "foreColor":
            case "color":
                this.inlineLevel_current.color = payload.value ?? "";
                break;
            case "fontSize":
                this.inlineLevel_current.fontSize = payload.value ?? "inherit";
                break;
            case "fontFamily":
                this.inlineLevel_current.fontFamily = getFullFontFamily(
                    payload.value ?? "inherit",
                );
                break;
            case "textTransform":
                this.inlineLevel_current.textTransform =
                    payload.value ?? "none";
                break;
            case "textDecorationStyle":
            case "textDecoration-style":
                this.decorationState.style = payload.value ?? "none";
                this._applyDecoration();
                break;
            case "textDecorationLine":
            case "textDecoration-line":
                this.decorationState[payload.value] =
                    !this.decorationState[payload.value];
                this._applyDecoration();
                break;
            case "letterSpacing":
                this.inlineLevel_current.letterSpacing =
                    payload.value ?? "normal";
                break;
            case "hiliteColor":
            case "backgroundColor":
                this.inlineLevel_current.backgroundColor =
                    payload.value ?? "transparent";
                break;
            case "superscript":
                this.inlineLevel_current.verticalAlign =
                    this.inlineLevel_current.verticalAlign === "super"
                        ? "baseline"
                        : "super";
                break;
            case "subscript":
                this.inlineLevel_current.verticalAlign =
                    this.inlineLevel_current.verticalAlign === "sub"
                        ? "baseline"
                        : "sub";
                break;
        }
    }
    styleBlock(payload) {
        switch (payload.command) {
            case "alignment":
                this.blockLevel_current.textAlign =
                    payload.value ?? this.blockLevel_default.textAlign;
                break;

            case "lineHeight":
                this.blockLevel_current.lineHeight =
                    payload.value ?? this.blockLevel_default.lineHeight;
                break;

            case "blockType":
                this.blockLevel_current.type = payload.value ?? "p";
                break;
        }
    }
    applyBlockStyles(el) {
        if (!el) return;
        let style = this.styleFactory({ readBlockStyles: true, el });
        const type = this.blockLevel_current.type ?? "p";
        this.styleFactory({ transformBlock: true, el, type });

        for (const [key, value] of Object.entries(this.blockLevel_current)) {
            if (key === "type") continue;
            if (style[key] !== value) {
                el.style[key] = value;
            }
        }
        el.dataset.blocktype = type;
    }
    applyInlineStyles(parentEl) {
        const span = document.createElement("span");

        // Copy existing inline styles from parent
        span.style.cssText = parentEl.style.cssText;

        // Apply only properties that differ from defaults
        for (const [key, value] of Object.entries(this.inlineLevel_current)) {
            const defaultVal = this._getDefault(key);
            if (value !== defaultVal) {
                span.style[key] = value;
            }
        }

        return span;
    }
    _getDefault(key) {
        const defaults = {
            fontWeight: "normal",
            fontStyle: "normal",
            textDecoration: "none",
            textTransform: "none",
            verticalAlign: "baseline",
            fontSize: "inherit",
            fontFamily: "inherit",
            color: "",
            letterSpacing: "normal",
            backgroundColor: "transparent",
        };
        return defaults[key] ?? "";
    }
    handleBeforeInput(payload) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        if (!sel.isCollapsed) return;

        const anchorNode = sel.anchorNode;
        const anchorOffset = sel.anchorOffset;
        const parentEl =
            anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
        const blockEl = parentEl.closest(".block");

        if (
            parentEl.tagName === "SPAN" &&
            this.isSameStyled("inline", parentEl) &&
            this.isSameStyled("block", blockEl)
        )
            return;
        payload.e.preventDefault();

        this.applyBlockStyles(blockEl);

        const newSpan = this.applyInlineStyles(parentEl);
        const textNode = document.createTextNode(payload.e.data);
        newSpan.appendChild(textNode);

        // Delegate insertion
        this._insertAtCaret(anchorNode, anchorOffset, newSpan);

        // Place caret
        const newRange = document.createRange();
        newRange.setStart(textNode, textNode.length);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    }
    _insertAtCaret(anchorNode, anchorOffset, newSpan) {
        if (
            anchorNode.nodeType !== Node.TEXT_NODE ||
            anchorNode.parentElement?.tagName !== "SPAN"
        ) {
            const sel = window.getSelection();
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(newSpan);
            return;
        }

        const parentSpan = anchorNode.parentElement;
        const text = anchorNode.textContent;

        // Caret at start — insert before parentSpan
        if (anchorOffset === 0) {
            parentSpan.parentNode.insertBefore(newSpan, parentSpan);
            return;
        }
        if (anchorOffset >= text.length) {
            parentSpan.parentNode.insertBefore(newSpan, parentSpan.nextSibling);
            return;
        }
        const afterText = anchorNode.splitText(anchorOffset);
        const afterSpan = document.createElement("span");
        afterSpan.style.cssText = parentSpan.style.cssText;
        afterSpan.appendChild(afterText);

        parentSpan.parentNode.insertBefore(newSpan, parentSpan.nextSibling);
        parentSpan.parentNode.insertBefore(afterSpan, newSpan.nextSibling);
    }
    isSameStyled(level, el) {
        let collectedStyle;
        let desired;
        if (level === "inline") {
            collectedStyle = this.styleFactory({ readInlineStyles: true, el });
            desired = this.inlineLevel_current;
        } else if (level === "block") {
            collectedStyle = this.styleFactory({ readBlockStyles: true, el });
            desired = this.blockLevel_current;
        } else {
            return false;
        }

        for (const [key, currentValue] of Object.entries(desired)) {
            // Skip default values — a plain span with no style is fine
            const defaultVal = this._getDefault(key);
            if (currentValue === defaultVal) continue;

            let collected = collectedStyle[key] ?? "";

            // Normalize fontFamily: compare only the primary family name
            if (key === "fontFamily") {
                const normCollected = collected
                    .replace(/['"/]/g, "")
                    .split(",")[0]
                    .trim()
                    .toLowerCase();
                const normCurrent = currentValue
                    .replace(/['"/]/g, "")
                    .split(",")[0]
                    .trim()
                    .toLowerCase();
                if (normCollected !== normCurrent) return false;
                continue;
            }

            if (collected !== currentValue) return false;
        }
        return true;
    }
    _applyDecoration() {
        const css = this.styleFactory({
            buildTextDecoration: true,
            state: this.decorationState,
        });
        this.inlineLevel_current.textDecoration = css;
    }
    __getStorableData() {
        return {
            inline: { ...this.inlineLevel_current },
            block: { ...this.blockLevel_current },
            decorationState: { ...this.decorationState },
        };
    }
    _setup(data) {
        this.inlineLevel_current = {
            fontWeight: "normal",
            fontStyle: "normal",
            textDecoration: "none",
            textTransform: "none",
            verticalAlign: "baseline",
            fontSize: "inherit",
            fontFamily: "inherit",
            color: "",
            letterSpacing: "normal",
            backgroundColor: "transparent",
        };
        this.decorationState = {
            underline: false,
            overline: false,
            strikethrough: false,
            style: "none",
        };
        this.blockLevel_current = {
            lineHeight: "normal",
            textAlign: "left",
            type: "p",
        };

        for (const [key, value] of Object.entries(this.inlineLevel_current)) {
            const set = data?.inline[key];
            if (set && set !== value) this.inlineLevel_current[key] = set;
        }
        for (const [key, value] of Object.entries(this.blockLevel_current)) {
            const set = data?.block[key];
            if (set && set !== value) this.blockLevel_current[key] = set;
        }
        for (const [key, value] of Object.entries(this.decorationState)) {
            const set = data?.decorationState[key];
            if (set && set !== value) this.decorationState[key] = set;
        }
    }
}
