export class BlockManager {
    constructor() {
        this.actions = {
            ADD: this._add,
            UPDATE: this._update,
            UNSHIFT: this._unshift,
            REMOVE: this._remove,
            REORDER: this._reorder,
            CLEAN_UP: this._clean_up,
            INSERT: this._insert,
            SET_UP: this._set_up,
            GET_DATA: this._toStorableData,
        };
    }
    manage = (action, payload) => {
        if (!action || typeof payload !== "object") {
            return;
        }
        return this.actions[action]?.(payload);
    };
    _isValidBlock = (id, block) => {
        if (!id) {
            return false;
        }
        if (typeof block !== "object" || block === null) {
            return false;
        }
        return true;
    };
    _add = (payload) => {
        const { id, block } = payload;
        if (!this._isValidBlock(id, block)) return;
        const exists = this.map.has(id);
        this.map.set(id, block);
        if (!exists) {
            this.order.push(id);
        }
    };
    _update = (payload) => {
        const { id, block } = payload;
        if (!this._isValidBlock(id, block)) return;
        if (!this.map.has(id)) {
            return;
        }
        this.map.set(id, block);
    };
    _unshift = (payload) => {
        const { id, block } = payload;
        if (!this._isValidBlock(id, block)) return;
        const exists = this.map.has(id);
        this.map.set(id, block);
        if (!exists) {
            this.order.unshift(id);
        }
    };
    _reorder = (payload) => {
        const { order } = payload;
        const newMap = new Map();
        const newOrder = [];
        const seen = new Set();
        for (const node of order) {
            const id = node.dataset?.blockid;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            const block = this.map.get(id) || this.normalizer(node, id);
            newMap.set(id, block);
            newOrder.push(id);
        }

        this.map = newMap;
        this.order = newOrder;
    };
    _remove = (payload) => {
        const { id } = payload;
        if (id) {
            this.order = this.order.filter((blockID) => blockID !== id);
            this.map.delete(id);
        }
    };
    _insert = (payload) => {
        const { prevId, id, block } = payload;
        const index = this.order.findIndex((i) => i === prevId);
        if (!this._isValidBlock(id, block) || !prevId || index === -1)
            return false;
        this.order.splice(index + 1, 0, id);
        this.map.set(id, block);
        return true;
    };
    _clean_up = () => {
        this.map.clear();
        this.order = [];
    };
    _set_up = (initial) => {
        this.map = new Map(Object.entries(initial.map || {}));
        this.order = Array.isArray(initial.order) ? [...initial.order] : [];
        this.normalizer = initial.normalizer;
    };
    _toStorableData = () => {
        return {
            map: Object.fromEntries(this.map || []),
            order: [...(this.order || [])],
        };
    };
}
