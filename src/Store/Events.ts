import { unwrap } from "solid-js/store";
import type {
  ParsedBackupData,
  RestoredBackupData,
} from "../components/BackupBookmarks";
import type { CollectionBookmark } from "../components/CollectionBookmarks";
import type { Favorite } from "../components/Favorites";
import type { BackupCollection, Collection } from "../components/Collections";
import { generateId } from "../utils";
import type { ActiveTab, createStateStore, SearchResult } from "./Collections";
import {
  bookmarksStore,
  type CollectionFetchState,
  setBookmarksStore,
} from "./Collections";
import type { Effect } from "./Effects";

export type INSERT_COLLECTION = {
  type: "INSERT_COLLECTION";
  payload: {
    name: string;
    collectionId: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GET_CURRENT_TABS = {
  type: "GET_CURRENT_TABS";
};

export type IMPORT_TABS = {
  type: "IMPORT_TABS";
  payload: {
    tabs: browser.tabs.Tab[];
    collectionId: string;
  };
};

export type SELECT_COLLECTION = {
  type: "SELECT_COLLECTION";
  payload: {
    collectionId: string;
    currentExpandedCollections: string[];
  };
};

export type DELETE_BOOKMARK = {
  type: "DELETE_BOOKMARK";
  payload: {
    bookmarkId: string;
  };
};

export type LOAD_APP_STATE = {
  type: "LOAD_APP_STATE";
};

export type INITIALIZE_APP_STATE = {
  type: "INITIALIZE_APP_STATE";
  payload: {
    collections: Collection[];
    mostRecentlyUpdatedCollections: Favorite[];
    fetchState: CollectionFetchState;
  };
};

export type SET_ACTIVE_TAB = {
  type: "SET_ACTIVE_TAB";
  payload: {
    activeTab: ActiveTab;
  };
};

export type SELECT_FAVORITE = {
  type: "SELECT_FAVORITE";
  payload: {
    favoriteId: string;
  };
};

export type DELETE_COLLECTION = {
  type: "DELETE_COLLECTION";
  payload: {
    collectionId: string;
  };
};

export type RESTORE_BACKUP = {
  type: "RESTORE_BACKUP";
  payload: {
    backupData: ParsedBackupData;
  };
};

export type SET_BACKUP_DATA = {
  type: "SET_BACKUP_DATA";
  payload: {
    backupData: RestoredBackupData | undefined;
  };
};

export type SET_IS_IMPORT_BACKUP_TAB = {
  type: "SET_IS_IMPORT_BACKUP_TAB";
  payload: true;
};

export type SET_IMPORT_BACKUP_DONE = {
  type: "SET_IMPORT_BACKUP_DONE";
  payload: boolean;
};

export type TOGGLE_BROWSER_FOLDER = {
  type: "TOGGLE_BROWSER_FOLDER";
  payload: {
    folderId: string;
  };
};

export type LOAD_BROWSER_BOOKMARKS = {
  type: "LOAD_BROWSER_BOOKMARKS";
};

export type INITIALIZE_BROWSER_BOOKMARKS = {
  type: "INITIALIZE_BROWSER_BOOKMARKS";
  payload: {
    browserCollections: Collection[];
  };
};

export type IMPORT_BROWSER_BOOKMARKS = {
  type: "IMPORT_BROWSER_BOOKMARKS";
};

export type SEARCH = {
  type: "SEARCH";
  payload: {
    query: string;
  };
};

export type SEARCH_RESULTS = {
  type: "SEARCH_RESULTS";
  payload: {
    results: SearchResult[];
  };
};

export type LOAD_SEARCH_INDEX = {
  type: "LOAD_SEARCH_INDEX";
};

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
        const rawCollections = unwrap(store.collections);
        return {
          type: "SET_COLLECTIONS",
          payload: {
            collections: rawCollections,
            backupData: {
              collections: rawCollections,
              exportDate: new Date().toISOString(),
              version: "1.2.0",
            },
          },
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
        const rawCollections = unwrap(store.collections);
        return {
          type: "SET_COLLECTIONS",
          payload: {
            collections: rawCollections,
            backupData: {
              collections: rawCollections,
              exportDate: new Date().toISOString(),
              version: "1.2.0",
            },
          },
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
      setStore("searchResults", undefined);

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
        const rawCollections = unwrap(store.collections);
        return {
          type: "SET_COLLECTIONS",
          payload: {
            collections: rawCollections,
            favorites: unwrap(store.mostRecentlyUpdatedCollections),
            backupData: {
              collections: rawCollections,
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
      setStore("searchResults", undefined);

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

          const rawCollections = unwrap(store.collections);
          return {
            type: "SET_COLLECTIONS",
            payload: {
              collections: rawCollections,
              backupData: {
                collections: rawCollections,
                exportDate: new Date().toISOString(),
                version: "1.2.0",
              },
            },
          };
        }
      } catch (error) {
        console.error(error);
        // showErrorToast("Failed to delete collection. Please try again.");
      }
      break;
    }
    case "RESTORE_BACKUP": {
      const { backupData } = event.payload;
      const mergedCollections = mergeCollections(
        bookmarksStore.collections,
        backupData.collections,
      );
      setStore("collections", mergedCollections);

      setStore("selectedCollectionId", undefined);
      setStore("selectedFavoriteId", undefined);
      setStore("collectionBookmarks", { title: "", bookmarks: [] });
      setStore("mostRecentlyUpdatedCollections", []);

      console.log("Successfully merged backup data");
      setStore("backupData", undefined);

      if (store.isImportBackupTab) {
        setStore("importBackupDone", true);
      }
      const rawCollections = unwrap(store.collections);
      return {
        type: "SET_COLLECTIONS",
        payload: {
          collections: rawCollections,
          favorites: [],
          backupData: {
            collections: rawCollections,
            exportDate: new Date().toISOString(),
            version: "1.2.0",
          },
        },
      };
    }
    case "SET_BACKUP_DATA": {
      const { backupData } = event.payload;
      if (backupData) {
        const parsedBackupData = mapBackupDatesToJavascriptDate(backupData);
        setStore("backupData", parsedBackupData);
      }
      break;
    }
    case "SET_IS_IMPORT_BACKUP_TAB": {
      setStore("isImportBackupTab", event.payload);
      break;
    }
    case "SET_IMPORT_BACKUP_DONE": {
      setStore("importBackupDone", event.payload);
      break;
    }
    case "LOAD_BROWSER_BOOKMARKS": {
      setStore("importBrowserBookmarks", {
        ...store.importBrowserBookmarks,
        browserBookmarksOpen: true,
        isImporting: true,
      });

      return {
        type: "LOAD_BROWSER_BOOKMARKS",
      };
    }
    case "TOGGLE_BROWSER_FOLDER": {
      const { folderId } = event.payload;

      const expanded = store.importBrowserBookmarks.currentExpandedCollections;
      if (expanded.has(folderId)) {
        expanded.delete(folderId);
      } else {
        expanded.add(folderId);
      }

      setStore("importBrowserBookmarks", {
        ...store.importBrowserBookmarks,
        currentExpandedCollections: new Set(expanded),
      });
      break;
    }
    case "INITIALIZE_BROWSER_BOOKMARKS": {
      const { browserCollections } = event.payload;

      setStore("importBrowserBookmarks", {
        ...store.importBrowserBookmarks,
        isImporting: false,
        collections: browserCollections,
      });
      break;
    }
    case "IMPORT_BROWSER_BOOKMARKS": {
      const mergedCollections = mergeCollections(
        bookmarksStore.collections,
        bookmarksStore.importBrowserBookmarks.collections,
      );

      setStore("collections", mergedCollections);
      setStore("importBrowserBookmarks", {
        isImporting: false,
        collections: [],
        currentExpandedCollections: new Set<string>(),
        browserBookmarksOpen: false,
      });

      return {
        type: "SET_COLLECTIONS",
        payload: {
          collections: mergedCollections,
          backupData: {
            collections: store.collections,
            exportDate: new Date().toISOString(),
            version: "1.2.0",
          },
        },
      };
    }
    case "SEARCH": {
      const { query } = event.payload;
      setStore("selectedCollectionId", undefined);
      setStore("selectedFavoriteId", undefined);
      return {
        type: "SEARCH",
        payload: {
          query,
        },
      };
    }
    case "SEARCH_RESULTS": {
      const { results } = event.payload;
      console.log(results);
      setStore("searchResults", results);
      break;
    }

    case "LOAD_SEARCH_INDEX": {
      return {
        type: "LOAD_SEARCH_INDEX",
        payload: {
          collections: store.collections,
        },
      };
    }
  }
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

export type AppEvent =
  | INSERT_COLLECTION
  | SELECT_COLLECTION
  | DELETE_BOOKMARK
  | GET_CURRENT_TABS
  | IMPORT_TABS
  | LOAD_APP_STATE
  | INITIALIZE_APP_STATE
  | SET_ACTIVE_TAB
  | SELECT_FAVORITE
  | DELETE_COLLECTION
  | RESTORE_BACKUP
  | SET_BACKUP_DATA
  | SET_IS_IMPORT_BACKUP_TAB
  | SET_IMPORT_BACKUP_DONE
  | TOGGLE_BROWSER_FOLDER
  | LOAD_BROWSER_BOOKMARKS
  | INITIALIZE_BROWSER_BOOKMARKS
  | IMPORT_BROWSER_BOOKMARKS
  | SEARCH
  | SEARCH_RESULTS
  | LOAD_SEARCH_INDEX;
