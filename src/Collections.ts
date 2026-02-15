import type {
  BackupData,
  ParsedBackupData,
} from "./components/BackupBookmarks";
import type { CollectionBookmark } from "./components/CollectionBookmarks";
import type { BackupCollection, Collection } from "./components/Collections";

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
