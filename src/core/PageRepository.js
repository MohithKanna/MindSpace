import { IndexedDBService } from "./IndexedDBService.js";

export class PageRepository {
    constructor(storage = new IndexedDBService()) {
        this.storage = storage;
    }

    listPages = async () => {
        const pages = await this.storage.getAll("pages");
        return (pages || [])
            .map((p) => ({
                id: p.id,
                title: p.title && p.title.trim() ? p.title : "Untitled",
                createdAt: p.meta?.createdAt ?? null,
                updatedAt: p.meta?.updatedAt ?? null,
            }))
            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    };

    createPage = async () => {
        const randomId =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID().slice(0, 12)
                : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
        const id = `p-${randomId}`;
        const now = Date.now();
        const page = {
            id,
            pageId: id,
            title: "",
            meta: { caret: null, style: null, createdAt: now, updatedAt: now },
            contents: { map: {}, order: [] },
        };
        await this.storage.put("pages", page);
        return id;
    };

    deletePage = async (id) => {
        if (!id) return false;
        await this.storage.delete("pages", id);
        return true;
    };

    renamePage = async (id, title) => {
        if (!id) return false;
        const page = await this.storage.get("pages", id);
        if (!page) return false;
        page.title = title;
        page.meta = { ...(page.meta || {}), updatedAt: Date.now() };
        await this.storage.put("pages", page);
        return true;
    };

    getPage = async (id) => {
        if (!id) return null;
        return this.storage.get("pages", id);
    };
}
