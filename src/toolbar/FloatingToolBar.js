export class FloatingToolBar {
  constructor(selectionStyler) {
    this.selectionStyler = selectionStyler;
    this.floatingToolBar = document.getElementById("floating-toolbar");
    this.viewportPadding = 12;
    this.floatingToolBar.addEventListener("click", (e) => {
      const cmd = e.target.closest(".floating-toolbar-btn")?.dataset.command;
      if (cmd) {
        e.preventDefault();
        this._onEvent(cmd);
        return;
      }
    });
    document
      .getElementById("floating-fontSize-select")
      .addEventListener("change", (e) => {
        // change values in px in option tags
        const value = e.target.value + "px";
        this._onEvent("fontSize", value);
      });
    document
      .getElementById("floating-fontFamily-select")
      .addEventListener("change", (e) => {
        const value = e.target.value;
        this._onEvent("fontFamily", value);
      });
    document
      .getElementById("floating-block-type")
      .addEventListener("change", (e) => {
        const value = e.target.value;
        this._onEvent("block-type", value);
      });
    document
      .getElementById("floating-list-type")
      .addEventListener("change", (e) => {
        const value = e.target.value;
        e.preventDefault();
        this._onEvent("block-type", value);
      });

    document
      .getElementById("fontColor-picker")
      .addEventListener("input", (e) => {
        const value = e.target.value;
        this._onEvent("color", value);
      });
    document
      .getElementById("backgroundColor-picker")
      .addEventListener("input", (e) => {
        const value = e.target.value;
        this._onEvent("backgroundColor", value);
      });
  }

  show = () => this.floatingToolBar.classList.remove("hidden");
  hide = () => this.floatingToolBar.classList.add("hidden");
  update(activeStyles, position) {
    this._toggleButtons(activeStyles);
    this._setPosition(position);
    this.show();
    this.activeStyles = activeStyles;
  }
  _setPosition(position) {
    requestAnimationFrame(() => {
      const el = this.floatingToolBar;

      const toolbarWidth = el.offsetWidth;
      const toolbarHeight = el.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const gap = 8;

      // Prefer below selection
      let top = position.top + position.height + gap;

      // Flip above if needed
      if (top + toolbarHeight > viewportHeight - this.viewportPadding) {
        top = position.top - toolbarHeight - gap;
      }

      // Center horizontally
      let left = position.centerX - toolbarWidth / 2;

      // Clamp داخل viewport
      const minLeft = this.viewportPadding;
      const maxLeft = viewportWidth - toolbarWidth - this.viewportPadding;
      left = Math.max(minLeft, Math.min(left, maxLeft));

      // Clamp vertical
      top = Math.max(this.viewportPadding, top);
      top = Math.min(
        top,
        viewportHeight - toolbarHeight - this.viewportPadding,
      );

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    });
  }
  _toggleButtons(marks) {
    if (!marks) return;
    const buttons = this.floatingToolBar.querySelectorAll(
      ".floating-toolbar-btn",
    );
    buttons.forEach((btn) => {
      const command = btn.dataset.command;
      const isActive = !!marks[command];
      btn.classList.toggle("active", isActive);
    });

    const fontSizeSelect = document.getElementById("floating-fontSize-select");
    if (marks.fontSize && fontSizeSelect) {
      const parsedSize = Math.round(parseFloat(marks.fontSize));
      if (!isNaN(parsedSize)) {
        const valStr = String(parsedSize);
        const optionExists = Array.from(fontSizeSelect.options).some(
          (opt) => opt.value === valStr,
        );
        if (optionExists) {
          fontSizeSelect.value = valStr;
        }
      }
    }

    const fontFamilySelect = document.getElementById(
      "floating-fontFamily-select",
    );
    if (marks.fontFamily && fontFamilySelect) {
      const fontFamClean = marks.fontFamily
        .replace(/['"]/g, "")
        .split(",")[0]
        .trim();
      const optionExists = Array.from(fontFamilySelect.options).some(
        (opt) => opt.value === fontFamClean,
      );
      if (optionExists) fontFamilySelect.value = fontFamClean;
    }

    const blockTypeSelect = document.getElementById("floating-block-type");
    if (marks.blockType && blockTypeSelect) {
      const typeClean = String(marks.blockType).toLowerCase();
      const optionExists = Array.from(blockTypeSelect.options).some(
        (opt) => opt.value === typeClean,
      );
      if (optionExists) blockTypeSelect.value = typeClean;
    }

    const colorInd = document.getElementById("floating-color-indicator");
    const fontPicker = document.getElementById("fontColor-picker");
    const hexColor = marks.color ? toHex(marks.color) : null;
    if (colorInd) colorInd.style.color = hexColor || "inherit";
    if (fontPicker && hexColor) fontPicker.value = hexColor;

    const bgInd = document.getElementById("floating-bg-indicator");
    const bgPicker = document.getElementById("backgroundColor-picker");
    const hexBg = (marks.backgroundColor && marks.backgroundColor !== "transparent") ? toHex(marks.backgroundColor) : null;
    if (bgInd) bgInd.style.backgroundColor = hexBg || "transparent";
    if (bgPicker && hexBg) bgPicker.value = hexBg;
  }

  _onEvent(style, value = null) {
    this.selectionStyler({ style, value });
  }
}

function toHex(colorStr) {
  if (!colorStr || colorStr === "transparent" || colorStr === "inherit") return null;
  if (colorStr.startsWith("#")) return colorStr;
  const match = colorStr.match(/\d+/g);
  if (match && match.length >= 3) {
    const [r, g, b] = match.map(Number);
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  return null;
}
