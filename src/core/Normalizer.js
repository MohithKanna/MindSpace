export class Normalizer {
    constructor(styleFactory) {
        this.styleFactory = styleFactory;
    }
    areMarksEqual(m1, m2) {
        const keys1 = Object.keys(m1);
        const keys2 = Object.keys(m2);
        if (keys1.length !== keys2.length) return false;
        return keys1.every((k) => m1[k] === m2[k]);
    }

    getStyles(element) {
        const marks = {};
        if (this.styleFactory.CHECK_FOR.bold.detect(element)) marks.bold = true;
        if (this.styleFactory.CHECK_FOR.italic.detect(element))
            marks.italic = true;
        if (this.styleFactory.CHECK_FOR.underline.detect(element))
            marks.underline = true;
        if (this.styleFactory.CHECK_FOR.strikethrough.detect(element))
            marks.strikethrough = true;
        if (this.styleFactory.CHECK_FOR.superscript.detect(element))
            marks.superscript = true;
        if (this.styleFactory.CHECK_FOR.subscript.detect(element))
            marks.subscript = true;
        if (this.styleFactory.CHECK_FOR.code.detect(element)) marks.code = true;
        const color = this.styleFactory.CHECK_FOR.color.detect(element);
        if (color) marks.color = this.styleFactory.rgbToHex(color);
        const bg = this.styleFactory.CHECK_FOR.backgroundColor.detect(element);
        if (bg) marks.backgroundColor = this.styleFactory.rgbToHex(bg);
        if (element.style.fontFamily)
            marks.fontFamily = element.style.fontFamily;
        if (element.style.fontSize) marks.fontSize = element.style.fontSize;
        return marks;
    }

    walk(node, inheritedMarks, accumulator) {
        node.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent;
                if (!text || (text === "" && !text.includes("\u00A0"))) return;

                const lastChild = accumulator[accumulator.length - 1];
                if (
                    lastChild &&
                    this.areMarksEqual(lastChild.marks, inheritedMarks)
                ) {
                    lastChild.text += text;
                } else {
                    accumulator.push({
                        text: text,
                        marks: { ...inheritedMarks },
                    });
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const localMarks = this.getStyles(child);
                const combinedMarks = { ...inheritedMarks, ...localMarks };

                this.walk(child, combinedMarks, accumulator);
            }
        });
    }
    normalizer(rootElement, id) {
        if (!rootElement || !id) return;

        const children = [];
        const align = rootElement.style.textAlign || "left";
        const lineHeight = rootElement.style.lineHeight || "normal";
        const blocktype = (rootElement.dataset.blocktype || "p").toLowerCase();

        this.walk(rootElement, {}, children);
        const searchableText = children
            .map((child) => child.text)
            .join("")
            .trim();
        return {
            id: id,
            text: searchableText,
            attrs: { align, lineHeight, blocktype },
            children: children,
        };
    }
}
