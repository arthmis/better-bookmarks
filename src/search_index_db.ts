// src/Store/SearchIndexDb.ts

export interface IndexedBookmark {
  id: string; // same id as CollectionBookmark.id
  title: string;
  url: string;
  iconUrl?: string;
}

const DB_NAME = "better-bookmarks-search";
const DB_VERSION = 1;
const STORE_NAME = "bookmarks";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const indexDb = openDb();

/** Replace the entire cache (used at startup to rebuild from collections). */
export async function replaceAll(bookmarks: IndexedBookmark[]): Promise<void> {
  const db = await indexDb;
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.clear(); // wipe first
  for (const b of bookmarks) {
    store.put(b);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Add or update bookmarks (used when tabs are imported). */
export async function putMany(bookmarks: IndexedBookmark[]): Promise<void> {
  const db = await indexDb;
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const b of bookmarks) {
    store.put(b);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Remove a single bookmark by id. */
export async function remove(id: string): Promise<void> {
  const db = await indexDb;
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get every bookmark in the cache. */
export async function getAll(): Promise<IndexedBookmark[]> {
  const db = await indexDb;
  const tx = db.transaction(STORE_NAME, "readonly");
  const request = tx.objectStore(STORE_NAME).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
