export class InputHandler {
    handle = (payload) => {
        if (payload.delay) return this.documentManager("STATE_CHANGED", null);
        if (payload.targetId) return this._input(payload);
        if (payload.setup) return this._set_up(payload);
        if (payload.clean) return this._clean_up();
    };
    _input(payload) {
        const { targetId, target } = payload;
        if (targetId === "editor") {
            const node = this.selectionManager({ getBlock: true });
            if (!node) return;
            const id =
                node.dataset?.blockid || node.getAttribute("data-blockid");
            if (!id) return;
            const block = this.normalizer(node, id);
            this.blockManager("ADD", { id, block });
            return this.documentManager("STATE_CHANGED", null);
        }
        if (targetId === "editor-title")
            this.documentManager("MANAGE_TITLE", { title: target.textContent });
    }
    _set_up(handler) {
        this.selectionManager = handler.selectionManager;
        this.documentManager = handler.documentManager;
        this.blockManager = handler.blockManager;
        this.normalizer = handler.normalizer;
    }
    _clean_up() {
        this.selectionManager = null;
        this.documentManager = null;
        this.blockManager = null;
        this.normalizer = null;
    }
}
