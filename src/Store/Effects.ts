import type { BackgroundScriptResponse } from "../background_script_types";
import type { BackupData } from "../components/BackupBookmarks";
import type { CollectionBookmark } from "../components/CollectionBookmarks";
import type { Favorite } from "../components/Favorites";
import type { Collection } from "../components/Collections";
import { searchWorker } from "../worker/worker_messages";
import {
  bookmarksStore,
  type createStateStore,
  setBookmarksStore,
} from "./Collections";
import { handleEvent } from "./Events";
import { IndexedBookmark, replaceAll } from "../search_index_db";

export type SET_COLLECTIONS = {
  type: "SET_COLLECTIONS";
  payload: {
    collections: Collection[];
    favorites?: Favorite[];
    backupData?: BackupData;
  };
};

export type IMPORT_CURRENT_TABS = {
  type: "IMPORT_CURRENT_TABS";
  payload: {
    collectionId: string;
  };
};

export type LOAD_APP_STATE = {
  type: "LOAD_APP_STATE";
};

export type LOAD_BROWSER_BOOKMARKS = {
  type: "LOAD_BROWSER_BOOKMARKS";
};

export type SEARCH = {
  type: "SEARCH";
  payload: {
    query: string;
  };
};

export type LOAD_SEARCH_INDEX = {
  type: "LOAD_SEARCH_INDEX";
  payload: {
    collections: Collection[];
  };
};

async function handleEffect(
  effect: Effect,
  storeInstance?: ReturnType<typeof createStateStore>,
): Promise<void> {
  const store = storeInstance ?? { bookmarksStore, setBookmarksStore };
  switch (effect.type) {
    case "SET_COLLECTIONS": {
      const { collections, favorites, backupData } = effect.payload;
      try {
        await browser.storage.local.set({ collections });

        if (favorites) {
          await browser.storage.local
            .set({
              mostRecentlyUpdatedCollections: favorites,
            })
            .catch((err) => {
              console.error(`error storing favorites: ${err}`);
            });
        }
      } catch (error) {
        // todo send the error to state
        console.error("Failed to set collections:", error);
      }

      if (backupData) {
        try {
          await exportBackup(backupData);
        } catch (error) {
          console.error("Auto-backup failed:", error);
        }
      }
      break;
    }
    case "IMPORT_CURRENT_TABS": {
      const tabs = await browser.tabs.query({
        currentWindow: true,
        highlighted: true,
      });

      const setCollectionsEffect = handleEvent(
        {
          type: "IMPORT_TABS",
          payload: {
            tabs,
            collectionId: effect.payload.collectionId,
          },
        },
        store,
      );

      if (
        setCollectionsEffect &&
        setCollectionsEffect.type === "SET_COLLECTIONS"
      ) {
        const { collections, favorites, backupData } =
          setCollectionsEffect.payload;
        await browser.storage.local.set({
          collections: collections,
        });

        if (favorites) {
          await browser.storage.local
            .set({
              mostRecentlyUpdatedCollections: favorites,
            })
            .catch((err) => {
              console.error(`error storing favorites: ${err}`);
            });
        }

        if (backupData) {
          try {
            await exportBackup(backupData);
          } catch (error) {
            console.error("Auto-backup failed:", error);
          }
        }
      }
      break;
    }
    case "LOAD_APP_STATE": {
      try {
        const data = await browser.storage.local.get([
          "collections",
          "mostRecentlyUpdatedCollections",
        ]);
        handleEvent(
          {
            type: "INITIALIZE_APP_STATE",
            payload: {
              collections: data.collections || [],
              mostRecentlyUpdatedCollections:
                data.mostRecentlyUpdatedCollections || [],
              fetchState: {
                status: "success",
              },
            },
          },
          store,
        );
      } catch (error) {
        console.error(error);
        // setFetchDataState({
        //   status: "error",
        //   error: new Error("Failed to fetch collections"),
      }
      break;
    }
    case "LOAD_BROWSER_BOOKMARKS": {
      try {
        const bookmarkTree = await browser.bookmarks.getTree();
        const rootNode = bookmarkTree[0];

        if (!rootNode || !rootNode.children) {
          // TODO: maybe show an error toast
          return;
        }

        const convertedCollections: Collection[] = [];

        // Convert each top-level folder to a collection
        for (const child of rootNode.children) {
          const collection = convertToCollection(child);
          if (collection) {
            convertedCollections.push(collection);
          }
        }

        handleEvent({
          type: "INITIALIZE_BROWSER_BOOKMARKS",
          payload: { browserCollections: convertedCollections },
        });
      } catch (err) {
        // TODO: show an error toast
        console.error("Failed to fetch browser bookmarks:", err);
      }
      break;
    }
    case "SEARCH": {
      const { query } = effect.payload;
      searchWorker.postMessage({ type: "SEARCH", query });
      break;
    }
    case "LOAD_SEARCH_INDEX": {
      // todo load from indexeddb first and then only read all collections
      const data = await browser.storage.local.get(["collections"]);
      const allBookmarks = flattenCollections(data.collections || []);

      await replaceAll(allBookmarks);

      const buffer = encodeForWorker(allBookmarks);
      // 3. Transfer ownership to worker (Zero-copy)
      searchWorker.postMessage({ type: "BUILD_INDEX", data: buffer }, [
        buffer.buffer,
      ]);
      break;
    }
  }
}

function flattenCollections(collections: Collection[]): IndexedBookmark[] {
  const result: IndexedBookmark[] = [];

  function walk(cols: Collection[]) {
    for (const collection of cols) {
      for (const item of collection.items) {
        result.push({
          id: item.id,
          title: item.title,
          url: item.url,
        });
      }
      walk(collection.subcollections);
    }
  }

  walk(collections);
  return result;
}

function encodeForWorker(bookmarks: IndexedBookmark[]): Uint8Array {
  const flattened = bookmarks
    .map((bookmark) => `${bookmark.id}\0${bookmark.title}\0${bookmark.url}`)
    .join("\n");
  return new TextEncoder().encode(flattened);
}

const convertToCollection = (
  node: browser.bookmarks.BookmarkTreeNode,
): Collection | undefined => {
  if (node.type === "separator") {
    return undefined;
  }

  const items: CollectionBookmark[] = [];
  const subcollections: Collection[] = [];

  if (node.children) {
    for (const child of node.children) {
      if (child.type === "separator") {
        continue;
      }

      // It's a bookmark if it has a URL
      if (child.url) {
        items.push({
          id: child.id,
          title: child.title,
          url: child.url,
          iconUrl: undefined, // Browser bookmarks don't typically include favicons in the API
          createdAt: child.dateAdded ? new Date(child.dateAdded) : new Date(),
          updatedAt: child.dateGroupModified
            ? new Date(child.dateGroupModified)
            : new Date(),
        });
      } else {
        // It's a folder
        const subCollection = convertToCollection(child);
        if (subCollection) {
          subcollections.push(subCollection);
        }
      }
    }
  }

  return {
    id: node.id,
    name: node.title,
    items,
    subcollections,
    createdAt: node.dateAdded ? new Date(node.dateAdded) : new Date(),
    updatedAt: node.dateGroupModified
      ? new Date(node.dateGroupModified)
      : new Date(),
  };
};

export async function exportBackup(
  backupData: BackupData,
): Promise<BackgroundScriptResponse> {
  const { collections, mostRecentlyUpdatedCollections, exportDate, version } =
    backupData;
  const data = {
    collections: collections,
    mostRecentlyUpdatedCollections: mostRecentlyUpdatedCollections,
    exportDate,
    version,
  };

  try {
    const json = JSON.stringify(data, null, 2);
    const filename = `better-bookmarks-backup-${new Date().toISOString().split("T")[0]}.json`;

    const response: BackgroundScriptResponse =
      await browser.runtime.sendMessage({
        type: "auto-export-backup",
        payload: { json, filename },
      });

    if (!response.success) {
      console.error("Auto-backup failed:", response.error);
    }
    return response;
  } catch (error) {
    console.error("Auto-backup failed:", error);
    return Promise.reject({ success: false, error });
  }
}

export type Effect =
  | SET_COLLECTIONS
  | IMPORT_CURRENT_TABS
  | LOAD_APP_STATE
  | LOAD_BROWSER_BOOKMARKS
  | SEARCH
  | LOAD_SEARCH_INDEX;
export { handleEffect };
