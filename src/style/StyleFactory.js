export class StyleFactory {
    constructor() {
        this.inlineLevel_default = {
            fontWeight: "normal",
            fontStyle: "normal",
            textDecoration: "none",
            textTransform: "none",
            verticalAlign: "baseline",
            letterSpacing: "normal",
            fontSize: "inherit",
            fontFamily: "inherit",
            color: "",
            backgroundColor: "transparent",
        };
        this.blockLevel_default = {
            lineHeight: "normal",
            textAlign: "left",
            type: "p",
        };
    }
    manage = (payload) => {
        if (payload.computeSelectionStyles)
            return this._computeSelectionStyles(payload.textNodes);
        if (payload.collectStyles) return this.collectStyles(payload.textNode);
        if (payload.readBlockStyles) return this._readBlockStyles(payload.el);
        if (payload.readInlineStyles) return this._readInlineStyles(payload.el);
        if (payload.transformBlock)
            return this.transformBlock(payload.type, payload.el);
        if (payload.buildStyle) return this.buildStyle(payload.nodeMarks);
        if (payload.buildTextDecoration)
            return this.buildTextDecoration(payload.state);
    };

    CHECK_FOR = {
        bold: {
            detect: (el) => {
                const fw = el.style.fontWeight;
                return (
                    fw === "bold" ||
                    el.tagName === "B" ||
                    el.tagName === "STRONG" ||
                    fw === "700"
                );
            },
        },
        italic: {
            detect: (el) => {
                return (
                    el.tagName === "I" ||
                    el.tagName === "EM" ||
                    el.style.fontStyle === "italic"
                );
            },
        },
        underline: {
            detect: (el) => {
                return (
                    el.tagName === "U" ||
                    el.style.textDecoration.includes("underline")
                );
            },
        },
        strikethrough: {
            detect: (el) => {
                return (
                    el.tagName === "S" ||
                    el.tagName === "STRIKE" ||
                    el.style.textDecoration.includes("line-through")
                );
            },
        },
        superscript: {
            detect: (el) => {
                return (
                    el.tagName === "SUP" || el.style.verticalAlign === "super"
                );
            },
        },
        subscript: {
            detect: (el) => {
                return el.tagName === "SUB" || el.style.verticalAlign === "sub";
            },
        },
        code: {
            detect: (el) => {
                return (
                    el.tagName === "CODE" ||
                    el.style.fontFamily.includes("monospace")
                );
            },
        },
        color: {
            detect: (el) => {
                const c = el.style.color;
                return c && c !== "inherit" ? c : null;
            },
        },
        backgroundColor: {
            detect: (el) => {
                const bg = el.style.backgroundColor;
                return bg && bg !== "transparent" ? bg : null;
            },
        },
    };
    BLOCK_STYLES = {
        h1: {
            fontSize: "2em",
            fontWeight: "bold",
            lineHeight: "1.2",
        },
        h2: {
            fontSize: "1.5em",
            fontWeight: "bold",
            lineHeight: "1.3",
        },
        h3: {
            fontSize: "1.25em",
            fontWeight: "bold",
            lineHeight: "1.4",
        },
        blockquote: {
            borderLeft: "3px solid #ccc",
            paddingLeft: "1em",
            fontStyle: "italic",
            color: "#666",
        },
        pre: {
            fontFamily: "monospace",
            backgroundColor: "#f0f0f0",
            padding: "1em",
            borderRadius: "4px",
            fontSize: "0.9em",
        },
    };
    ALL_BLOCK_PROPS = [
        ...new Set(
            Object.values(this.BLOCK_STYLES).flatMap((styles) =>
                Object.keys(styles),
            ),
        ),
    ];
    collectStyles(textNode) {
        const styles = this._emptyStyles();
        const seen = new Set();
        let el = textNode.parentElement;

        while (el && !el.hasAttribute("data-blockid")) {
            if (!seen.has("bold") && this.CHECK_FOR.bold.detect(el)) {
                styles.bold = true;
                seen.add("bold");
            }
            if (!seen.has("italic") && this.CHECK_FOR.italic.detect(el)) {
                styles.italic = true;
                seen.add("italic");
            }
            if (!seen.has("underline") && this.CHECK_FOR.underline.detect(el)) {
                styles.underline = true;
                seen.add("underline");
            }
            if (
                !seen.has("strikethrough") &&
                this.CHECK_FOR.strikethrough.detect(el)
            ) {
                styles.strikethrough = true;
                seen.add("strikethrough");
            }
            if (
                !seen.has("superscript") &&
                this.CHECK_FOR.superscript.detect(el)
            ) {
                styles.superscript = true;
                seen.add("superscript");
            }
            if (!seen.has("subscript") && this.CHECK_FOR.subscript.detect(el)) {
                styles.subscript = true;
                seen.add("subscript");
            }
            if (!seen.has("code") && this.CHECK_FOR.code.detect(el)) {
                styles.code = true;
                seen.add("code");
            }
            if (!seen.has("color")) {
                const c = this.CHECK_FOR.color.detect(el);
                if (c) {
                    styles.color = c;
                    seen.add("color");
                }
            }
            // convert colors here
            if (!seen.has("backgroundColor")) {
                const bg = this.CHECK_FOR.backgroundColor.detect(el);
                if (bg) {
                    styles.backgroundColor = bg;
                    seen.add("backgroundColor");
                }
            }
            if (!seen.has("fontFamily") && el.style.fontFamily) {
                styles.fontFamily = el.style.fontFamily;
                seen.add("fontFamily");
            }
            if (!seen.has("fontSize") && el.style.fontSize) {
                styles.fontSize = el.style.fontSize;
                seen.add("fontSize");
            }

            el = el.parentElement;
        }

        if (textNode) {
            try {
                const parent =
                    textNode.nodeType === Node.TEXT_NODE
                        ? textNode.parentElement
                        : textNode;
                if (parent && typeof window !== "undefined") {
                    const comp = window.getComputedStyle(parent);
                    if (!styles.fontSize && comp?.fontSize) {
                        styles.fontSize = comp.fontSize;
                    }
                    if (!styles.fontFamily && comp?.fontFamily) {
                        styles.fontFamily = comp.fontFamily;
                    }
                }
                const blockEl = parent?.closest?.("[data-blockid]");
                if (blockEl) {
                    styles.blockType =
                        blockEl.dataset?.blocktype ||
                        blockEl.tagName.toLowerCase() ||
                        "paragraph";
                    styles.textAlign = blockEl.style.textAlign || "left";
                    styles.lineHeight = blockEl.style.lineHeight || "normal";
                }
            } catch {}
        }

        return styles;
    }
    buildStyle(payload) {
        const styles = {};

        styles.fontWeight = payload.bold ? "bold" : "normal";

        styles.fontStyle = payload.italic ? "italic" : "normal";

        const decorations = [];
        if (payload.underline) decorations.push("underline");
        if (payload.strikethrough) decorations.push("line-through");
        styles.textDecoration =
            decorations.length > 0 ? decorations.join(" ") : "none";

        if (payload.superscript) {
            styles.verticalAlign = "super";
            styles.fontSize = "smaller";
        } else if (payload.subscript) {
            styles.verticalAlign = "sub";
            styles.fontSize = "smaller";
        } else {
            styles.verticalAlign = "baseline";
        }

        styles.color = payload.color || "";
        styles.fontFamily = payload.fontFamily || "inherit";
        styles.backgroundColor = payload.backgroundColor || "transparent";

        if (!payload.superscript && !payload.subscript) {
            styles.fontSize = payload.fontSize || "inherit";
        }
        if (payload.code) {
            styles.fontFamily = "monospace";
            styles.backgroundColor = "#f0f0f0";
            styles.padding = "2px 4px";
            styles.borderRadius = "4px";
        }
        return styles;
    }
    _emptyStyles() {
        return {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            superscript: false,
            subscript: false,
            code: false,
            color: "",
            backgroundColor: "",
            fontFamily: "",
            fontSize: "",
            textTransform: "",
            verticalAlign: "",
            letterSpacing: "",
        };
    }
    _computeSelectionStyles(textNodes) {
        if (!textNodes.length) return this._emptyStyles();
        const styles = textNodes.map((n) => this.collectStyles(n));
        return {
            bold: styles.every((m) => m.bold),
            italic: styles.every((m) => m.italic),
            underline: styles.every((m) => m.underline),
            strikethrough: styles.every((m) => m.strikethrough),
        };
    }
    _readInlineStyles(el) {
        const styles = { ...this.inlineLevel_default };
        let currentEl = el;
        const seen = new Set();
        while (currentEl && !currentEl.hasAttribute("data-blockid")) {
            if (
                !seen.has("fontWeight") &&
                this.CHECK_FOR.bold.detect(currentEl)
            ) {
                styles.fontWeight = "bold";
                seen.add("fontWeight");
            }
            if (
                !seen.has("fontStyle") &&
                this.CHECK_FOR.italic.detect(currentEl)
            ) {
                styles.fontStyle = "italic";
                seen.add("fontStyle");
            }
            if (
                !seen.has("underline") &&
                this.CHECK_FOR.underline.detect(currentEl)
            ) {
                if (
                    currentEl.style.textDecoration &&
                    currentEl.style.textDecoration !== "none"
                ) {
                    styles.textDecoration = currentEl.style.textDecoration;
                    seen.add("textDecoration");
                }
            }

            if (
                !seen.has("textDecoration") &&
                currentEl.style.textDecoration &&
                currentEl.style.textDecoration !== "none"
            ) {
                styles.textDecoration = currentEl.style.textDecoration;
                seen.add("textDecoration");
            }
            if (!seen.has("color")) {
                const c = this.CHECK_FOR.color.detect(currentEl);
                if (c) {
                    styles.color = this.rgbToHex(c);
                    seen.add("color");
                }
            }
            if (!seen.has("backgroundColor")) {
                const bg = this.CHECK_FOR.backgroundColor.detect(currentEl);
                if (bg) {
                    styles.backgroundColor = this.rgbToHex(bg);
                    seen.add("backgroundColor");
                }
            }
            if (!seen.has("fontFamily") && currentEl.style.fontFamily) {
                styles.fontFamily = currentEl.style.fontFamily; // keep full value, normalized in comparison
                seen.add("fontFamily");
            }
            if (!seen.has("fontSize") && currentEl.style.fontSize) {
                styles.fontSize = currentEl.style.fontSize;
                seen.add("fontSize");
            }
            if (!seen.has("textTransform") && currentEl.style.textTransform) {
                styles.textTransform = currentEl.style.textTransform;
                seen.add("textTransform");
            }
            if (!seen.has("letterSpacing") && currentEl.style.letterSpacing) {
                styles.letterSpacing = currentEl.style.letterSpacing;
                seen.add("letterSpacing");
            }
            if (!seen.has("verticalAlign") && currentEl.style.verticalAlign) {
                styles.verticalAlign = currentEl.style.verticalAlign;
                seen.add("verticalAlign");
            }
            currentEl = currentEl.parentElement;
        }
        return styles;
    }
    _readBlockStyles(el) {
        return {
            lineHeight:
                el.style.lineHeight || this.blockLevel_default.lineHeight,
            textAlign: el.style.textAlign || this.blockLevel_default.textAlign,
            type: el?.dataset?.blocktype || this.blockLevel_default.type,
        };
    }
    transformBlock(type, el) {
        if (!el) return;
        this.resetBlockStyles(el);
        const typeStyles = this.BLOCK_STYLES[type];
        if (typeStyles) {
            Object.entries(typeStyles).forEach(([prop, value]) => {
                el.style[prop] = value;
            });
        }
    }
    resetBlockStyles(el) {
        this.ALL_BLOCK_PROPS.forEach((prop) => {
            el.style[prop] = "";
        });
        el.dataset.blocktype = "p";
    }

    rgbToHex(rgb) {
        const result = rgb.match(/\d+/g);
        if (!result) return false;
        const [r, g, b] = result.map(Number);
        return (
            "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")
        );
    }
    buildTextDecoration(s) {
        const lines = [];
        if (s.underline) lines.push("underline");
        if (s.overline) lines.push("overline");
        if (s.strikethrough) lines.push("line-through");

        if (lines.length === 0) return "none";

        const style = s.style && s.style !== "none" ? s.style : "";
        return `${lines.join(" ")} ${style}`.trim();
    }
}
