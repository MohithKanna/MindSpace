export class Denormalizer {
    constructor(styleFactory) {
        this.styleFactory = styleFactory;
    }
    denormalizer(blocks) {
        if (!this.isValidInput(blocks)) {
            this.fragment = document.createDocumentFragment();
            this.fragment.appendChild(this.__fallback());
            return this.fragment;
        }
        this.__setup(blocks);
        const result = this.__constructBlock();
        this.__cleanup();
        return result;
    }
    __constructBlock() {
        this.fragment = document.createDocumentFragment();
        for (const id of this.order) {
            if (!this.map.has(id)) continue;
            const block = this.map.get(id);
            const el = document.createElement("div");
            el.dataset.blockid = id;
            el.classList.add("block");

            if (block.attrs?.align && block.attrs.align !== "left") {
                el.style.textAlign = block.attrs.align;
            }
            if (
                block.attrs?.lineHeight &&
                block.attrs.lineHeight !== "normal"
            ) {
                el.style.lineHeight = block.attrs.lineHeight;
            }
            if (block.attrs?.blocktype && block.attrs.blocktype !== "p") {
                el.dataset.blocktype = block.attrs.blocktype;
                this.styleFactory.transformBlock(block.attrs.blocktype, el);
            }

            if (!block.children || block.children.length === 0) {
                el.appendChild(document.createElement("br"));
            } else {
                this.__appendChildren(el, block.children);
            }
            this.fragment.appendChild(el);
        }
        if (!this.fragment.firstChild)
            this.fragment.appendChild(this.__fallback());
        return this.fragment;
    }

    __appendChildren(parent, children) {
        for (const child of children) {
            const span = document.createElement("span");
            span.textContent = child.text || "\u200B";

            const m = child.marks;
            if (!m) {
                parent.appendChild(span);
                continue;
            }

            // Boolean marks
            if (m.bold) span.style.fontWeight = "bold";
            if (m.italic) span.style.fontStyle = "italic";
            if (m.superscript) span.style.verticalAlign = "super";
            if (m.subscript) span.style.verticalAlign = "sub";

            // textDecoration — combine underline + strikethrough
            const decorations = [];
            if (m.underline) decorations.push("underline");
            if (m.strikethrough) decorations.push("line-through");
            if (decorations.length)
                span.style.textDecoration = decorations.join(" ");

            // code — overrides fontFamily + backgroundColor
            if (m.code) {
                span.style.fontFamily = "monospace";
                span.style.backgroundColor = "#f0f0f0";
                span.style.padding = "2px 4px";
                span.style.borderRadius = "4px";
            } else {
                if (m.color) span.style.color = m.color;
                if (m.backgroundColor)
                    span.style.backgroundColor = m.backgroundColor;
                if (m.fontFamily) span.style.fontFamily = m.fontFamily;
            }

            if (m.fontSize) span.style.fontSize = m.fontSize;

            parent.appendChild(span);
        }
    }

    isValidInput(blocks) {
        const isMapEmpty = !blocks.map || Object.keys(blocks.map).length === 0;
        const isOrderEmpty = !blocks.order || blocks.order.length === 0;
        if (isMapEmpty || isOrderEmpty) {
            return false;
        }
        return true;
    }
    __fallback() {
        const el = document.createElement("div");
        el.innerHTML = "<br>";
        el.classList.add("block");
        el.dataset.blockid = `b/?\-${crypto.randomUUID().slice(0, 12)}`;
        return el;
    }
    __setup(blocks) {
        this.map = new Map(Object.entries(blocks.map));
        this.order = blocks.order;
    }
    __cleanup() {
        this.map = null;
        this.order = null;
        this.fragment = null;
    }
}
