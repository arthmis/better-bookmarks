import { createStore } from "solid-js/store";
import type {
  BackupData,
  ParsedBackupData,
} from "../components/BackupBookmarks";
import type {
  CollectionBookmark,
  CollectionBookmarks,
} from "../components/CollectionBookmarks";
import type { BackupCollection, Collection } from "../components/StateStore";
import { generateId } from "../utils";
import { Favorite } from "../components/Favorites";
import { Effect } from "./Effects";

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

export function createStateStore() {
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

  const [bookmarksStore, setBookmarksStore] = createStore<AppState>(storeState);

  return { bookmarksStore, setBookmarksStore };
}
const { bookmarksStore, setBookmarksStore } = createStateStore();

function handleEvent(
  event: Event,
  storeInstance?: ReturnType<typeof createStateStore>,
): Effect | undefined {
  return undefined;
}

function handleEffect(
  effect: Effect,
  storeInstance?: ReturnType<typeof createStateStore>,
): void {
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
  }
}

export function dispatch(
  event: Event,
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
