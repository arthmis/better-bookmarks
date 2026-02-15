import type {
  BackupData,
  ParsedBackupData,
} from "./components/BackupBookmarks";
import type { CollectionBookmark } from "./components/CollectionBookmarks";
import type { BackupCollection, Collection } from "./components/Collections";
import { generateId } from "./utils";

type CollectionStore = {
  collections: Collection[];
};

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
