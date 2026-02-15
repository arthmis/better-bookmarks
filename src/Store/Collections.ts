import { createStore } from "solid-js/store";
import type {
  BackupData,
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

export interface CollectionFetchState {
  status: "pending" | "success" | "error";
  data?: Collection[];
  error?: Error;
}

export interface AppState {
  collections: Collection[];
  selectedCollectionId: string | undefined;
  selectedFavoriteId: string | undefined;
  activeTab: "collections" | "favorites";
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
          payload: [...store.collections, newCollection],
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
          payload: updatedCollection,
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
  }
  return undefined;
}

async function handleEffect(
  effect: Effect,
  storeInstance?: ReturnType<typeof createStateStore>,
): Promise<void> {
  const store = storeInstance ?? bookmarksStore;
  switch (effect.type) {
    case "SET_CURRENT_EXPANDED_COLLECTIONS":
      setBookmarksStore({
        ...store,
        currentExpandedCollections: effect.payload,
      });
      break;
    case "SET_SELECTED_COLLECTION":
      setBookmarksStore({
        ...store,
        selectedCollectionId: effect.payload,
      });
      break;
    case "SET_COLLECTIONS": {
      const { payload: collections } = effect;
      try {
        await browser.storage.local.set({ collections });
      } catch (error) {
        // todo send the error to state
        console.error("Failed to set collections:", error);
      }
      break;
    }
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
  backupData: BackupData,
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
