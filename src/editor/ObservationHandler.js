export class ObservationHandler {
    _assign_props(node) {
        const id = generateId();
        node.setAttribute("data-blockid", id);
        node.classList.add("block");
        return id;
    }

    handle = (payload) => {
        if (payload.mutation) return this._handleObservation(payload);
        if (payload.setup) return this._set_up(payload);
        if (payload.cleanup) return this._clean_up();
    };
    _handleObservation(observations) {
        observations.created.forEach((node) => {
            const id = this._assign_props(node);
            const block = this.normalizer(node, id);

            if (this.domManager("IS_LAST_EL", { node }))
                return this.blockManager("ADD", { id, block });

            if (this.domManager("IS_FIRST_EL", { node }))
                return this.blockManager("UNSHIFT", { id, block });

            const prevId = this.domManager("GET_PREV_ID", { node });
            if (prevId && this.blockManager("INSERT", { prevId, id, block }))
                return;

            const order = this.domManager("GET_CHILD_LIST");
            this.blockManager("REORDER", { order });
        });
        observations.deleted.forEach((id) => {
            this.blockManager("REMOVE", { id });
        });
        this.documentManager("STATE_CHANGED", null);
    }
    _set_up(handler) {
        this.domManager = handler.domManager;
        this.blockManager = handler.blockManager;
        this.normalizer = handler.normalizer;
        this.documentManager = handler.documentManager;
    }
    _clean_up() {
        this.domManager = null;
        this.blockManager = null;
        this.normalizer = null;
        this.documentManager = null;
    }
}
let block = 0;
function generateId() {
    return `b${++block}-${crypto.randomUUID().slice(0, 8)}`;
}
