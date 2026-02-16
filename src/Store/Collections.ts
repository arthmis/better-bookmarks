import { createStore } from "solid-js/store";
import type {
  BackupData,
  RestoredBackupData,
  ParsedBackupData,
} from "../components/BackupBookmarks";
import type {
  CollectionBookmark,
  CollectionBookmarks,
} from "../components/CollectionBookmarks";
import type { Favorite } from "../components/Favorites";
import type { BackupCollection, Collection } from "../components/StateStore";
import { generateId } from "../utils";
import type { Effect } from "./Effects";
import type { AppEvent } from "./Events";
import { BackgroundScriptResponse } from "../background_script_types";

export interface CollectionFetchState {
  status: "pending" | "success" | "error";
  data?: Collection[];
  error?: Error;
}

export interface AppState {
  collections: Collection[];
  selectedCollectionId: string | undefined;
  selectedFavoriteId: string | undefined;
  activeTab: ActiveTab;
  collectionBookmarks: CollectionBookmarks;
  fetchDataState: CollectionFetchState;
  currentExpandedCollections: string[];
  browserBookmarksOpen: boolean;
  backupData: ParsedBackupData | undefined;
  isImportBackupTab: boolean;
  importBackupDone: boolean;
  backupFileInputRef: HTMLInputElement | undefined;
  mostRecentlyUpdatedCollections: Favorite[];
}

export type ActiveTab = "collections" | "favorites";

export function createStateStore(initialState?: AppState) {
  const storeState: AppState = {
    collections: [],
    selectedCollectionId: undefined,
    selectedFavoriteId: undefined,
    activeTab: "collections",
    collectionBookmarks: {
      title: "",
      bookmarks: [],
    },
    fetchDataState: { status: "pending", data: undefined, error: undefined },
    currentExpandedCollections: [],
    browserBookmarksOpen: false,
    backupData: undefined,
    isImportBackupTab: false,
    importBackupDone: false,
    backupFileInputRef: undefined,
    mostRecentlyUpdatedCollections: [],
  };
  let state: AppState;

  if (initialState) {
    state = {
      ...storeState,
      ...initialState,
    };
  } else {
    state = storeState;
  }

  const [bookmarksStore, setBookmarksStore] = createStore<AppState>(state);

  return { bookmarksStore, setBookmarksStore };
}
const { bookmarksStore, setBookmarksStore } = createStateStore();

export function handleEvent(
  event: AppEvent,
  storeInstance?: ReturnType<typeof createStateStore>,
): Effect | undefined {
  const { bookmarksStore: store, setBookmarksStore: setStore } =
    storeInstance ?? { bookmarksStore, setBookmarksStore };

  switch (event.type) {
    case "INSERT_COLLECTION": {
      const { name, collectionId, createdAt, updatedAt } = event.payload;
      const normalizedName = name.trim().toLowerCase();

      // Check for duplicates
      const isDuplicate = (collectionsToCheck: Collection[]): boolean => {
        return collectionsToCheck.some(
          (collection) =>
            collection.name.trim().toLowerCase() === normalizedName,
        );
      };

      if (store.selectedCollectionId === undefined) {
        // Check top-level collections for duplicates
        if (isDuplicate(store.collections)) {
          return; // Don't add duplicate
        }
      } else {
        // Check subcollections of selected collection for duplicates
        const selectedCollection = findCollectionById(
          store.collections,
          store.selectedCollectionId,
        );
        if (
          selectedCollection &&
          isDuplicate(selectedCollection.subcollections)
        ) {
          return; // Don't add duplicate
        }
      }

      const newCollection: Collection = {
        id: collectionId,
        name: name,
        items: [],
        subcollections: [],
        createdAt,
        updatedAt,
      };

      if (store.selectedCollectionId === undefined) {
        setStore("collections", [...store.collections, newCollection]);
        return {
          type: "SET_COLLECTIONS",
          payload: { collections: [...store.collections, newCollection] },
        };
      }

      const insertCollection = (
        collections: Collection[],
        newCollection: Collection,
      ): Collection[] => {
        return collections.map((collection) => {
          if (collection.id === store.selectedCollectionId) {
            return {
              ...collection,
              subcollections: [...collection.subcollections, newCollection],
            };
          }
          return {
            ...collection,
            subcollections: insertCollection(
              collection.subcollections,
              newCollection,
            ),
          };
        });
      };

      try {
        const updatedCollection = insertCollection(
          store.collections,
          newCollection,
        );
        setStore("collections", updatedCollection);
        return {
          type: "SET_COLLECTIONS",
          payload: { collections: updatedCollection },
        };
      } catch (error) {
        console.error("Failed to add or update collection:", error);
        // showErrorToast("Failed to add or update collection. Please try again.");
      }
      break;
    }
    case "SELECT_COLLECTION": {
      const {
        payload: { collectionId, currentExpandedCollections },
      } = event;

      if (store.selectedCollectionId === collectionId) {
        setStore("selectedCollectionId", undefined);
        setStore("collectionBookmarks", { title: "", bookmarks: [] });

        const idIndex = currentExpandedCollections.indexOf(collectionId);
        setStore(
          "currentExpandedCollections",
          currentExpandedCollections.toSpliced(idIndex),
        );
      } else {
        setStore("selectedCollectionId", collectionId);
        setStore("selectedFavoriteId", undefined);

        const selectedCollection = findCollectionById(
          store.collections,
          store.selectedCollectionId!,
        );
        if (selectedCollection) {
          setStore("collectionBookmarks", {
            title: selectedCollection.name,
            bookmarks: selectedCollection.items,
          });
          setStore("currentExpandedCollections", currentExpandedCollections);
        } else {
          setStore("collectionBookmarks", { title: "", bookmarks: [] });
        }
      }
      break;
    }
    case "DELETE_BOOKMARK": {
      const { bookmarkId } = event.payload;

      const deleteBookmarkFromCollection = (
        collections: Collection[],
        bookmarkId: string,
        selectedCollectionId?: string,
      ): Collection[] =>
        collections.map((collection) => {
          if (collection.id === selectedCollectionId) {
            const updatedItems = collection.items.filter(
              (item) => item.id !== bookmarkId,
            );
            const newCollection = {
              ...collection,
              items: updatedItems,
            };

            // if these items are in view update the list of bookmarks
            setStore("collectionBookmarks", {
              title: newCollection.name,
              bookmarks: newCollection.items,
            });
            return newCollection;
          }
          return {
            ...collection,
            subcollections: deleteBookmarkFromCollection(
              collection.subcollections,
              bookmarkId,
              store.selectedCollectionId,
            ),
          };
        });

      try {
        const updatedCollection = deleteBookmarkFromCollection(
          store.collections,
          bookmarkId,
          store.selectedCollectionId,
        );
        setStore("collections", updatedCollection);
        return {
          type: "SET_COLLECTIONS",
          payload: { collections: updatedCollection },
        };
      } catch (error) {
        console.error("Failed to delete bookmark:", error);
        // showErrorToast("Failed to delete bookmark. Please try again.");
      }
      break;
    }
    case "GET_CURRENT_TABS":
      if (store.selectedCollectionId) {
        return {
          type: "IMPORT_CURRENT_TABS",
          payload: {
            collectionId: store.selectedCollectionId,
          },
        };
      } else if (store.selectedFavoriteId) {
        return {
          type: "IMPORT_CURRENT_TABS",
          payload: {
            collectionId: store.selectedFavoriteId,
          },
        };
      }
      break;
    case "IMPORT_TABS": {
      const { tabs, collectionId } = event.payload;
      if (!tabs) {
        return undefined;
      }

      // Get the selected collection to check for duplicate URLs
      const selectedCollection = findCollectionById(
        store.collections,
        collectionId,
      );
      if (!selectedCollection) {
        // showErrorToast("Selected collection not found");
        return;
      }

      // Get existing URLs in the selected collection
      const existingUrls = new Set(
        selectedCollection.items.map((item) => normalizeUrl(item.url)),
      );

      const importedBookmarks: CollectionBookmark[] = tabs
        .filter((tab) => {
          const tabUrl = tab.url || "";
          if (!tabUrl) {
            return false;
          }

          const normalizedTabUrl = normalizeUrl(tabUrl);
          return !existingUrls.has(normalizedTabUrl);
        })
        .map((tab) => {
          // Create a better title by getting the page title
          const title = tab.title || "";
          const url = tab.url || "";
          const iconUrl = tab.favIconUrl || undefined;

          return {
            id: crypto.randomUUID(),
            title,
            url,
            iconUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

      // If no bookmarks to add (all were duplicates), don't update storage
      if (importedBookmarks.length === 0) {
        return;
      }

      // Find and update the selected collection
      const updateCollections = (collections: Collection[]): Collection[] => {
        return collections.map((collection) => {
          if (collection.id === collectionId) {
            const newCollection = {
              ...collection,
              items: [...collection.items, ...importedBookmarks],
            };
            // if these items are in view update the list of bookmarks
            setStore("collectionBookmarks", {
              title: newCollection.name,
              bookmarks: newCollection.items,
            });

            const updatedFavorites = updateMostRecentlyUpdatedCollections(
              {
                id: collectionId,
                name: collection.name,
              },
              store.mostRecentlyUpdatedCollections,
            );
            setStore("mostRecentlyUpdatedCollections", updatedFavorites);

            return newCollection;
          }
          return {
            ...collection,
            subcollections: updateCollections(collection.subcollections),
          };
        });
      };

      try {
        const updatedCollection = updateCollections(store.collections);
        setStore("collections", updatedCollection);
        return {
          type: "SET_COLLECTIONS",
          payload: {
            collections: updatedCollection,
            favorites: store.mostRecentlyUpdatedCollections,
            backupData: {
              collections: store.collections,
              mostRecentlyUpdatedCollections:
                store.mostRecentlyUpdatedCollections,
              exportDate: new Date().toISOString(),
              version: "1.2.0",
            },
          },
        };
      } catch (error) {
        console.error("Failed to add bookmark to collection:", error);
        // showErrorToast(
        //   "Failed to add bookmark to collection. Please try again.",
        // );
      }

      break;
    }
    case "LOAD_APP_STATE": {
      return {
        type: "LOAD_APP_STATE",
      };
    }
    case "INITIALIZE_APP_STATE": {
      const { collections, mostRecentlyUpdatedCollections, fetchState } =
        event.payload;
      setStore("collections", collections);
      setStore(
        "mostRecentlyUpdatedCollections",
        mostRecentlyUpdatedCollections,
      );
      setStore("fetchDataState", fetchState);
      break;
    }
    case "SET_ACTIVE_TAB": {
      const { activeTab } = event.payload;
      setStore("activeTab", activeTab);

      break;
    }
    case "SELECT_FAVORITE": {
      const { favoriteId } = event.payload;
      setStore("selectedFavoriteId", favoriteId);
      setStore("selectedCollectionId", undefined);

      // Find and display the favorite collection's bookmarks
      const selectedCollection = findCollectionById(
        store.collections,
        favoriteId,
      );
      if (selectedCollection) {
        setStore("collectionBookmarks", {
          title: selectedCollection.name,
          bookmarks: selectedCollection.items,
        });
      }

      break;
    }
    case "DELETE_COLLECTION": {
      const { collectionId } = event.payload;

      const removeCollection = (collections: Collection[]): Collection[] =>
        collections
          .filter((collection) => collection.id !== collectionId)
          .map((collection) => ({
            ...collection,
            subcollections: removeCollection(collection.subcollections),
          }));

      try {
        const updatedCollections = removeCollection(store.collections);
        setStore("collections", updatedCollections);

        // If the deleted collection was selected, clear the selection
        if (store.selectedCollectionId === collectionId) {
          setStore("selectedCollectionId", undefined);
          setStore("collectionBookmarks", {
            title: "",
            bookmarks: [],
          });

          // Remove the deleted collection from expanded collections but keep ancestors
          const idIndex =
            store.currentExpandedCollections.indexOf(collectionId);
          setStore(
            "currentExpandedCollections",
            store.currentExpandedCollections.toSpliced(idIndex),
          );

          return {
            type: "SET_COLLECTIONS",
            payload: {
              collections: updatedCollections,
            },
          };
        }
      } catch (error) {
        console.error(error);
        // showErrorToast("Failed to delete collection. Please try again.");
      }
      break;
    }
  }
}

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
  }
}

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

export function dispatch(
  event: AppEvent,
  storeInstance?: ReturnType<typeof createStateStore>,
) {
  const effect = handleEvent(event, storeInstance);
  if (effect) {
    handleEffect(effect, storeInstance);
  }
}

export function mapBackupDatesToJavascriptDate(
  backupData: RestoredBackupData,
): ParsedBackupData {
  const mapCollections = (backupCollection: BackupCollection): Collection => {
    const collectionBookmarks: CollectionBookmark[] =
      backupCollection.items.map((bookmark) => {
        const createdAt = new Date(Date.parse(bookmark.createdAt));
        const updatedAt = new Date(Date.parse(bookmark.updatedAt));
        return { ...bookmark, createdAt, updatedAt };
      });

    const subcollections = backupCollection.subcollections.map(mapCollections);
    const createdAt = new Date(Date.parse(backupCollection.createdAt));
    const updatedAt = new Date(Date.parse(backupCollection.updatedAt));
    return {
      ...backupCollection,
      items: collectionBookmarks,
      subcollections,
      createdAt,
      updatedAt,
    };
  };
  const parsedCollections = backupData.collections.map(mapCollections);

  return {
    ...backupData,
    collections: parsedCollections,
  };
}

export const findCollectionById = (
  collections: Collection[],
  id: string,
): Collection | undefined => {
  for (const collection of collections) {
    if (collection.id === id) {
      return collection;
    }
    const found = findCollectionById(collection.subcollections, id);
    if (found) {
      return found;
    }
  }
  return undefined;
};

export const mergeCollections = (
  existingCollections: Collection[],
  browserCollections: Collection[],
): Collection[] => {
  // Get all existing URLs from all collections to avoid duplicates
  const getAllExistingUrls = (collections: Collection[]): Set<string> => {
    const urls = new Set<string>();
    const addUrlsFromCollection = (collection: Collection) => {
      collection.items.forEach((item) => {
        if (item.url) {
          urls.add(normalizeUrl(item.url));
        }
      });
      collection.subcollections.forEach(addUrlsFromCollection);
    };
    collections.forEach(addUrlsFromCollection);
    return urls;
  };

  const existingUrls = getAllExistingUrls(existingCollections);

  // Filter out duplicate bookmarks from browser collections
  const filterDuplicateBookmarks = (collection: Collection): Collection => {
    const filteredItems = collection.items.filter((item) => {
      if (!item.url) {
        return true;
      }
      return !existingUrls.has(normalizeUrl(item.url));
    });

    const filteredSubcollections = collection.subcollections.map(
      filterDuplicateBookmarks,
    );

    return {
      ...collection,
      items: filteredItems,
      subcollections: filteredSubcollections,
    };
  };

  // Filter browser collections and merge with existing ones
  const filteredBrowserCollections = browserCollections.map(
    filterDuplicateBookmarks,
  );

  // Merge collections by name or add new ones
  const mergedCollections = [...existingCollections];

  filteredBrowserCollections.forEach((browserCollection) => {
    // Check if a collection with the same name already exists
    const existingIndex = mergedCollections.findIndex(
      (existing) =>
        existing.name.toLowerCase() === browserCollection.name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      // Merge into existing collection
      const existing = mergedCollections[existingIndex];
      mergedCollections[existingIndex] = {
        ...existing,
        items: [...existing.items, ...browserCollection.items],
        subcollections: mergeCollections(
          existing.subcollections,
          browserCollection.subcollections,
        ),
        updatedAt: new Date(),
      };
    } else {
      // Add as new collection if it has any content
      if (
        browserCollection.items.length > 0 ||
        browserCollection.subcollections.length > 0
      ) {
        mergedCollections.push({
          ...browserCollection,
          id: generateId(), // Generate new ID for imported collection
        });
      }
    }
  });

  return mergedCollections;
};

// Helper function to normalize URLs for comparison
export const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash and convert to lowercase for comparison
    // TODO: see if there is a better way to normalize URLs than regex
    return urlObj.href.replace(/\/$/, "").toLowerCase();
  } catch {
    // If URL parsing fails, return original URL for comparison
    return url.toLowerCase();
  }
};

const updateMostRecentlyUpdatedCollections = (
  collection: Favorite,
  favorites: Favorite[],
): Favorite[] => {
  const filtered = favorites.filter(({ id }) => id !== collection.id);
  const updated = [collection, ...filtered].slice(0, 15);
  return updated;
};

export { bookmarksStore };
