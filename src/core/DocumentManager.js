import { IndexedDBService } from "./IndexedDBService.js";
export class DocumentManager {
    constructor(setup) {
        this.storage = new IndexedDBService();
        this.pageId = null;
        this.title = null;
        this.createdAt = null;
        this.blockManager = setup.blockManager;
        this.selectionManager = setup.selectionManager;
        this.styleManager = setup.styleManager;
        this.meta = {
            caret: null,
        };
        this.selection = null;
        this._dirty = false;
        this._saveDelay = 2000;
        this.autoSave = true;
        this._debouncedSave = debounce((manualSave = false) => {
            if (this.autoSave || manualSave) return this._saveNow();
        }, this._saveDelay);
        this.controls = {
            MANAGE_TITLE: (p) => this.setTitle(p.title),
            SET_UP: (p) => this._setup(p.id),
            STATE_CHANGED: () => this.stateChanged(),
            AUTO_SAVE: (p) => this.setAutoSave(p),
            SAVE_DELAY: (p) => this.setSaveDelay(p),
            SAVE_REQUEST: (p) => this._debouncedSave(true),
            SAVE_NOW: () => this.forceSave(),
            NOT_SAVED: () => this._dirty,
        };
    }
    stateChanged = () => {
        this._dirty = true;
        this._debouncedSave();
    };
    setSaveDelay(value) {
        if (typeof value === "number") {
            this._saveDelay = value;
            this._debouncedSave = debounce((manualSave = false) => {
                if (this.autoSave || manualSave) return this._saveNow();
            }, this._saveDelay);
        }
    }
    setAutoSave(value) {
        if (typeof value === "boolean") {
            this.autoSave = value;
        }
    }
    forceSave = async () => {
        await this._saveNow(true);
        this._dirty = false;
    };

    _saveNow = async (force = false) => {
        if (!this._dirty && !force) {
            return true;
        }
        this._dirty = false;
        try {
            await this.storage.put("pages", this._toStorableState());
            return true;
        } catch {
            this._dirty = true;
            return false;
        }
    };
    _setup = async (id) => {
        if (!id) {
            return;
        }
        const data = await this.storage.get("pages", id);
        const hasData = Boolean(data && typeof data === "object");
        const contents =
            hasData && data.contents ? data.contents : { map: {}, order: [] };

        this.pageId = id;
        if (hasData) {
            this.title = data.title || "Untitled";
            this.meta = data.meta || { caret: null };
            this.createdAt = data.meta?.createdAt || Date.now();
            this.selection = null;
        } else {
            this.title = "";
            this.meta = { caret: null };
            this.createdAt = Date.now();
            await this._saveNow(true);
        }

        return {
            title: this.title === "Untitled" ? "" : this.title,
            contents: contents,
            meta: { caret: this.meta.caret, style: this.meta.style },
        };
    };
    documentController = (control, payload) => {
        if (!this.controls[control]) {
            return;
        }
        return this.controls[control](payload);
    };
    setTitle = (title) => {
        this.title = title.trim().slice(0, 100);
    };

    _toStorableState = () => {
        if (!this.createdAt) this.createdAt = Date.now();
        return {
            id: this.pageId,
            pageId: this.pageId,
            title: this.title,
            meta: {
                caret: this.selectionManager({ getCaret: true }),
                style: this.styleManager({ getStyle: true }),
                createdAt: this.createdAt,
                updatedAt: Date.now(),
            },
            contents: this.blockManager("GET_DATA", null),
        };
    };
}
function debounce(fn, delay) {
    let timerId = null;
    return function (...args) {
        const context = this;
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
            fn.apply(context, args);
            timerId = null;
        }, delay);
    };
}
