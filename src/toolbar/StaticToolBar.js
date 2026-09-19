// Static-toolbar command names -> the equivalent SelectionStyler mark name,
// for commands that can be applied immediately to a selection.
const SELECTION_APPLICABLE_COMMANDS = {
    fontSize: "fontSize",
    fontFamily: "fontFamily",
    letterSpacing: "letterSpacing",
    textTransform: "textTransform",
    textDecorationLine: "textDecorationLine",
    textDecorationStyle: "textDecorationStyle",
    foreColor: "color",
    hiliteColor: "backgroundColor",
};

export class StaticToolBar {
    constructor({ caretStyler, selectionStyler }) {
        this.caretStyler = caretStyler;
        this.selectionStyler = selectionStyler;
        this.staticToolbar = document.getElementById("static-toolbar");
        this.typeSelect = document.getElementById("static-block-type");
        this.staticToolbarBtn = this.staticToolbar.querySelectorAll(
            ".static-toolbar-btn",
        );
        this.fontColorPicker = document.getElementById(
            "static-fontColor-picker",
        );
        this.backgroundColorPicker = document.getElementById(
            "static-backgroundColor-picker",
        );
        this.fontSizeSelect = document.getElementById("static-fontSize-select");
        this.fontFamilySelect = document.getElementById(
            "static-fontFamily-select",
        );

        this.staticToolbar.addEventListener("mousedown", (e) => {
            const target = e.target;
            const isNativeControl =
                target instanceof HTMLElement &&
                (target.closest("select") ||
                    target.closest("input") ||
                    target.closest("textarea") ||
                    target.closest("button"));

            if (!isNativeControl) {
                e.preventDefault();
            }
        });

        this.staticToolbar.addEventListener(
            "click",
            this.handleToolBarClick.bind(this),
        );
        this.fontColorPicker?.addEventListener("input", (e) => {
            e.preventDefault();
            this.applyStyle("inline", "foreColor", e.target.value);
            this._scheduleToolbarRefresh();
        });
        this.backgroundColorPicker?.addEventListener("input", (e) => {
            e.preventDefault();
            this.applyStyle("inline", "hiliteColor", e.target.value);
            this._scheduleToolbarRefresh();
        });
        this.fontSizeSelect?.addEventListener("change", (e) => {
            this.applyStyle("inline", "fontSize", e.target.value + "px");
            this._scheduleToolbarRefresh();
        });

        this.setupPopover();
        this.initDefaults();
    }

    initDefaults() {
        const defaults = {
            blockType: "paragraph",
            fontFamily: "Segoe UI",
            textTransform: "none",
            textDecorationLine: "none",
            textDecorationStyle: "solid",
            lineHeight: "normal",
            letterSpacing: "normal",
            alignment: "left",
        };

        Object.entries(defaults).forEach(([cmd, defaultVal]) => {
            const popover = this.staticToolbar?.querySelector(
                `.static-popover[data-command="${cmd}"]`,
            );
            const textArea = popover?.querySelector(".value-txt");
            if (
                textArea &&
                (!textArea.textContent || textArea.textContent.trim() === "")
            ) {
                textArea.textContent = " " + defaultVal;
            }
        });

        if (this.fontSizeSelect && !this.fontSizeSelect.value) {
            this.fontSizeSelect.value = "16";
        }
    }

    handleToolBarClick(e) {
        const target = e.target;

        // Ignore clicks coming from inside options dropdown container
        if (target.closest(".static-container")) return;

        const btn = target.closest(".static-toolbar-btn");
        const popover = target.closest(".static-popover");

        if (popover) {
            e.preventDefault();
            this._handleContainerClick(popover);
            return;
        }
        if (btn) {
            e.preventDefault();
            const handling = btn.dataset.handling;
            if (handling === "style") {
                if (btn.dataset.command === "removeStyle") {
                    this.staticToolbarBtn.forEach((b) => {
                        if (b.dataset.handling === "style")
                            b.classList.remove("active");
                    });
                    this.applyStyle("inline", "removeStyle");
                    // Immediately reset all toolbar UI to defaults so it
                    // doesn't keep showing stale values after clearing.
                    this._resetToolbarToDefaults();
                    this._scheduleToolbarRefresh();
                    return;
                }
                btn.classList.toggle("active");
                this.applyStyle("inline", btn.dataset.command);
                this._scheduleToolbarRefresh();
                return;
            }
            if (handling === "timeline")
                return document.execCommand(btn.dataset.command, false, null);
        }
    }

    _handleContainerClick(triggerEl) {
        const cmd = triggerEl?.dataset?.command;
        const popup = document.getElementById(`static-${cmd}`);
        if (!popup || !cmd) return;
        this.delegateCommand(cmd, popup, triggerEl);
    }

    applyStyle(level, command, value = null) {
        const effectiveLevel =
            level ||
            (SELECTION_APPLICABLE_COMMANDS[command] ? "inline" : "inline");
        if (effectiveLevel === "inline") {
            const selectionMark =
                SELECTION_APPLICABLE_COMMANDS[command] || command;
            const sel = window.getSelection();
            const hasActiveSelection =
                selectionMark &&
                sel &&
                sel.rangeCount > 0 &&
                !sel.isCollapsed &&
                this.selectionStyler;

            if (command === "removeStyle") {
                this.caretStyler({
                    inlineStyle: true,
                    command: "removeStyle",
                });
                if (hasActiveSelection) {
                    this.selectionStyler({ style: "removeStyle" });
                }
                return;
            }

            if (hasActiveSelection) {
                return this.selectionStyler({ style: selectionMark, value });
            }

            return this.caretStyler({
                inlineStyle: true,
                command,
                value,
            });
        }
        if (level === "block") {
            this.caretStyler({
                blockStyle: true,
                command,
                value,
            });

            // Also apply block style to DOM element directly
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                let node = sel.getRangeAt(0).startContainer;
                if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
                const blockEl = node.closest("[data-blockid]");
                if (blockEl) {
                    if (command === "alignment" || command === "textAlign") {
                        blockEl.style.textAlign = value || "left";
                    } else if (command === "lineHeight") {
                        blockEl.style.lineHeight = value || "normal";
                    } else if (command === "blockType" || command === "type") {
                        this.caretStyler.applyBlockStyles(blockEl);
                    }
                }
            }
        }
    }

    delegateCommand(cmd, popup, triggerEl) {
        if (!cmd) return;
        if (cmd === this.currentContainer) {
            this.hidePopover(popup);
            this.currentContainer = null;
            return;
        }
        this.hideAllPopovers();
        this.currentContainer = cmd;
        this.showPopover(popup);
        this.positionPopover(popup, triggerEl);
    }

    handlePopoverClick(e) {
        e.stopPropagation(); // Stop click from bubbling to #static-toolbar
        const el = e.target.closest(".static-options");
        if (!el) return;
        const container = el.closest(".static-container");
        const popover = container.closest(".static-popover");
        const textArea = popover?.querySelector(".value-txt");

        const value = el.dataset.value;
        const command = popover?.dataset?.command;
        const level = popover?.dataset?.level;

        this.updateDisplayElement(textArea, value);
        this.applyStyle(level, command, value);
        this.hidePopover(container);
        this.currentContainer = null;
        this._scheduleToolbarRefresh();
    }

    updateDisplayElement(el, value) {
        if (el) el.textContent = " " + (value || "none");
    }

    hidePopover = (el) => {
        if (!el) return;
        el.classList.add("hidden");
        if (
            typeof el.hidePopover === "function" &&
            el.hasAttribute("popover")
        ) {
            try {
                el.hidePopover();
            } catch {}
        }
    };

    showPopover = (el) => {
        if (!el) return;
        el.classList.remove("hidden");
        if (
            typeof el.showPopover === "function" &&
            el.hasAttribute("popover")
        ) {
            try {
                el.showPopover();
            } catch {}
        }
    };

    getAllPopovers = () => document.querySelectorAll(".static-container");

    hideAllPopovers = () =>
        this.getAllPopovers().forEach((popover) => this.hidePopover(popover));

    positionPopover(popover, triggerEl) {
        if (!triggerEl || !popover) return;
        const targetRect = triggerEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const popoverHeight =
            popover.offsetHeight || popover.scrollHeight || 200;
        const popoverWidth = popover.offsetWidth || popover.scrollWidth || 160;

        let left = targetRect.left + targetRect.width / 2;
        let top = targetRect.top - popoverHeight - 8;

        if (top < 8) {
            if (targetRect.bottom + popoverHeight + 8 <= viewportHeight) {
                top = targetRect.bottom + 8;
            } else {
                top = Math.max(
                    8,
                    Math.min(
                        targetRect.top - 8,
                        viewportHeight - popoverHeight - 8,
                    ),
                );
            }
        }

        if (top + popoverHeight > viewportHeight - 8) {
            top = Math.max(8, viewportHeight - popoverHeight - 8);
        }

        const minLeft = popoverWidth / 2 + 8;
        const maxLeft = viewportWidth - popoverWidth / 2 - 8;
        left = Math.max(minLeft, Math.min(maxLeft, left));

        popover.style.position = "fixed";
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
        popover.style.transform = "translateX(-50%)";
        popover.style.maxHeight = `${Math.min(280, viewportHeight - 16)}px`;
    }

    setupPopover() {
        const popovers = this.getAllPopovers();
        popovers.forEach((popover) => {
            popover.addEventListener(
                "click",
                this.handlePopoverClick.bind(this),
            );
            popover.classList.add("hidden");
        });

        document.addEventListener("click", (e) => {
            if (!this.currentContainer) return;
            const activePopover = document.getElementById(
                `static-${this.currentContainer}`,
            );
            const activeTrigger = this.staticToolbar?.querySelector(
                `.static-popover[data-command="${this.currentContainer}"]`,
            );
            if (
                activePopover &&
                !activePopover.contains(e.target) &&
                (!activeTrigger || !activeTrigger.contains(e.target))
            ) {
                this.hidePopover(activePopover);
                this.currentContainer = null;
            }
        });
    }

    clenupPopover = () =>
        this.getAllPopovers().forEach((popover) =>
            popover.removeEventListener(
                "click",
                this.handlePopoverClick.bind(this),
            ),
        );

    /**
     * Dispatch a synthetic selectionchange so the standard caret-read
     * pipeline fires and re-syncs the toolbar from the live DOM.
     * Using rAF lets the DOM settle after any style mutations first.
     */
    _scheduleToolbarRefresh() {
        requestAnimationFrame(() => {
            document.dispatchEvent(new Event("selectionchange"));
        });
    }

    /**
     * Reset every toolbar UI control to its default visual state.
     * Called immediately after "Remove Style" so the UI never shows
     * stale values while waiting for the next caret move.
     */
    _resetToolbarToDefaults() {
        // Bold / italic / etc. active classes
        this.staticToolbarBtn.forEach((b) => {
            if (b.dataset.handling === "style") b.classList.remove("active");
        });

        // Color pickers
        if (this.fontColorPicker) {
            this.fontColorPicker.value = "#37352f";
            const label = this.fontColorPicker.closest(".color-btn");
            if (label) {
                label.style.backgroundColor = "transparent";
                label.style.color = "var(--border)";
                label.style.borderColor = "var(--border)";
            }
        }
        // i need text and border in same color for both font and background
        // better if text is contrasting with background, but for now just reset to default
        if (this.backgroundColorPicker) {
            this.backgroundColorPicker.value = "#ffffff";
            const label = this.backgroundColorPicker.closest(".color-btn");
            if (label) {
                label.style.backgroundColor = "transparent";
                label.style.color = "var(--border)";
                label.style.borderColor = "var(--border)";
            }
        }

        // Font-size select
        if (this.fontSizeSelect) this.fontSizeSelect.value = "16";

        // Popover value labels
        const defaults = {
            blockType: "paragraph",
            fontFamily: "Inter",
            textTransform: "none",
            textDecorationLine: "none",
            textDecorationStyle: "solid",
            lineHeight: "normal",
            letterSpacing: "normal",
            alignment: "left",
        };
        Object.entries(defaults).forEach(([cmd, val]) => {
            const popover = this.staticToolbar?.querySelector(
                `.static-popover[data-command="${cmd}"]`,
            );
            const textArea = popover?.querySelector(".value-txt");
            if (textArea) textArea.textContent = " " + val;
        });
    }

    update(data) {
        if (!data) return;
        this.staticToolbarBtn.forEach((btn) => {
            const style = btn.getAttribute("data-command");
            btn.classList.toggle("active", !!data[style]);
        });

        // Update Font Size select
        if (data.fontSize && this.fontSizeSelect) {
            const parsedSize = Math.round(parseFloat(data.fontSize));
            if (!isNaN(parsedSize)) {
                const valStr = String(parsedSize);
                const optionExists = Array.from(
                    this.fontSizeSelect.options,
                ).some((opt) => opt.value === valStr);
                if (optionExists) {
                    this.fontSizeSelect.value = valStr;
                }
            }
        }

        // Update color pickers & live border/color indicators according to caret colors
        if (this.fontColorPicker) {
            const fontLabel = this.fontColorPicker.closest(".color-btn");
            const hex = data.color ? toHex(data.color) : null;
            if (hex) {
                this.fontColorPicker.value = hex;
                if (fontLabel) fontLabel.style.borderColor = data.color;
            } else {
                this.fontColorPicker.value = "#37352f";
                if (fontLabel) fontLabel.style.borderColor = "var(--border)";
            }
        }

        if (this.backgroundColorPicker) {
            const bgLabel = this.backgroundColorPicker.closest(".color-btn");
            const hex =
                data.backgroundColor && data.backgroundColor !== "transparent"
                    ? toHex(data.backgroundColor)
                    : null;
            if (hex) {
                this.backgroundColorPicker.value = hex;
                if (bgLabel)
                    bgLabel.style.backgroundColor = data.backgroundColor;
            } else {
                this.backgroundColorPicker.value = "#ffffff";
                if (bgLabel) bgLabel.style.backgroundColor = "transparent";
            }
        }

        // Dynamic value display mapping for static toolbar popover buttons
        const fontFamClean = data.fontFamily
            ? data.fontFamily.replace(/['"]/g, "").split(",")[0].trim()
            : null;

        const decorationParts = [];
        if (data.underline) decorationParts.push("underline");
        if (data.strikethrough) decorationParts.push("line-through");

        const valueMap = {
            blockType: data.blockType || data.type || "paragraph",
            fontFamily: fontFamClean || "Inter",
            textTransform: data.textTransform || "none",
            textDecorationLine: decorationParts.length
                ? decorationParts.join(" ")
                : "none",
            textDecorationStyle: "solid",
            lineHeight: data.lineHeight || "normal",
            letterSpacing: data.letterSpacing || "normal",
            alignment: data.textAlign || data.alignment || "left",
        };

        Object.entries(valueMap).forEach(([cmd, val]) => {
            const popover = this.staticToolbar?.querySelector(
                `.static-popover[data-command="${cmd}"]`,
            );
            const textArea = popover?.querySelector(".value-txt");
            if (textArea && val) {
                textArea.textContent = " " + val;
            }
        });
    }
}

function toHex(colorStr) {
    if (!colorStr || colorStr === "transparent" || colorStr === "inherit")
        return null;
    if (colorStr.startsWith("#")) return colorStr;
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
        const [r, g, b] = match.map(Number);
        return (
            "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")
        );
    }
    return null;
}
