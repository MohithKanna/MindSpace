export class IndexedDBService {
    constructor(dbName = "EditorDB", version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }
    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains("pages")) {
                    db.createObjectStore("pages", { keyPath: "id" });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onerror = () => reject("IndexedDB failed to open");
        });
    }
    async __transaction(storeName, mode, callback) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const request = callback(store);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        return this.__transaction(storeName, "readwrite", (store) =>
            store.put(data),
        );
    }

    async get(storeName, id) {
        return this.__transaction(storeName, "readonly", (store) =>
            store.get(id),
        );
    }

    async getAll(storeName) {
        return this.__transaction(storeName, "readonly", (store) =>
            store.getAll(),
        );
    }

    async delete(storeName, id) {
        return this.__transaction(storeName, "readwrite", (store) =>
            store.delete(id),
        );
    }
}
