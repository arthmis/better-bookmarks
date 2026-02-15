import { createSignal, For, Show } from "solid-js";
import type { BackupCollection, Collection } from "./StateStore";
import type { CollectionBookmark } from "./CollectionBookmarks";

interface BackupData {
  collections: BackupCollection[];
  mostRecentlyUpdatedCollections?: Favorite[];
  exportDate?: string;
  version?: string;
}

interface ParsedBackupData {
  collections: Collection[];
  mostRecentlyUpdatedCollections?: Favorite[];
  exportDate?: string;
  version?: string;
}

interface BackupBookmarksProps {
  onClose: () => void;
  backupData: ParsedBackupData;
  onMergeBackup: (backupData: ParsedBackupData) => Promise<void>;
}

export type { ParsedBackupData, BackupData };

export default function BackupBookmarks(props: BackupBookmarksProps) {
  const [merging, setMerging] = createSignal(false);
  const [currentExpandedCollections, setCurrentExpandedCollections] =
    createSignal<Set<string>>(new Set([]));

  const toggleFolder = (folderId: string) => {
    const expanded = currentExpandedCollections();
    if (expanded.has(folderId)) {
      expanded.delete(folderId);
    } else {
      expanded.add(folderId);
    }
    setCurrentExpandedCollections(new Set(expanded));
  };

  const getTotalBookmarkCount = (collection: Collection): number => {
    let count = collection.items.length;
    for (const sub of collection.subcollections) {
      count += getTotalBookmarkCount(sub);
    }
    return count;
  };

  const getTotalImportableBookmarks = (): number => {
    const collections = props.backupData.collections;
    if (!collections) return 0;

    let total = 0;
    const countBookmarks = (collection: Collection) => {
      total += collection.items.length;
      collection.subcollections.forEach(countBookmarks);
    };

    collections.forEach(countBookmarks);
    return total;
  };

  interface CollectionItemProps {
    collection: Collection;
  }

  const CollectionItem = (itemProps: CollectionItemProps) => {
    const isExpanded = () =>
      currentExpandedCollections().has(itemProps.collection.id);
    const hasChildren = () =>
      itemProps.collection.subcollections.length > 0 ||
      itemProps.collection.items.length > 0;
    const totalItems = () => getTotalBookmarkCount(itemProps.collection);

    return (
      <div class="w-full">
        <button
          type="button"
          class="flex items-center py-2 px-4 w-full text-left cursor-pointer transition-colors duration-200 hover:bg-gray-600 hover:text-white border-none bg-transparent"
          onClick={() => hasChildren() && toggleFolder(itemProps.collection.id)}
        >
          <span class="w-5 text-xs text-gray-600 hover:text-white mr-2 flex items-center justify-center">
            <Show when={hasChildren()}>{isExpanded() ? "▼" : "▶"}</Show>
          </span>
          <span class="flex-1 font-medium text-gray-800 hover:text-white">
            {itemProps.collection.name}
          </span>
          <span class="text-xs ml-2 text-gray-600 hover:text-white">
            ({totalItems()})
          </span>
        </button>

        <Show when={isExpanded()}>
          <div class="bg-black/[0.02]">
            {/* Render bookmarks */}
            <For each={itemProps.collection.items}>
              {(bookmark: CollectionBookmark) => {
                const baseUrl = bookmark.url ? new URL(bookmark.url) : null;
                return (
                  <div class="flex items-center py-1 px-4 text-sm pl-8">
                    <span class="w-5 mr-2">📄</span>
                    <div class="flex-1 min-w-0">
                      <a
                        class="link link-info link-hover truncate block"
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {bookmark.title}
                      </a>
                      <div class="text-xs text-gray-500 truncate">
                        {baseUrl?.host}
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>

            {/* Render subcollections */}
            <div class="pl-8">
              <For each={itemProps.collection.subcollections}>
                {(subcollection) => (
                  <CollectionItem collection={subcollection} />
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    );
  };

  const handleMerge = async () => {
    setMerging(true);
    try {
      await props.onMergeBackup(props.backupData);
    } catch (error) {
      console.error("Failed to merge backup:", error);
    } finally {
      setMerging(false);
    }
  };

  return (
    <dialog class="modal modal-open w-full">
      <div class="bg-gray-50 rounded-box flex flex-col min-h-9/10 max-h-9/10 w-9/10">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 class="text-xl font-semibold text-gray-800">
            Import Backup File
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            class="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Info Section */}
        <div class="p-4 bg-blue-50 border-b border-gray-300">
          <p class="text-sm text-gray-700">
            Import bookmarks from a backup file. Conflicting bookmarks will be
            overwritten with the backup data. Collections with matching names
            will be merged together.
          </p>
          <p class="text-sm text-blue-600 mt-2">
            Found {getTotalImportableBookmarks()} bookmarks across{" "}
            {props.backupData.collections.length} collections.
          </p>
          <Show when={props.backupData.exportDate}>
            <p class="text-xs text-gray-500 mt-1">
              Backup created:{" "}
              {props.backupData.exportDate
                ? new Date(props.backupData.exportDate).toLocaleString()
                : ""}
            </p>
          </Show>
          <Show when={props.backupData.version}>
            <p class="text-xs text-gray-500 mt-1">
              Backup version: {props.backupData.version}
            </p>
          </Show>
        </div>

        {/* Content */}
        <div class="h-full overflow-auto w-full flex-auto">
          <div class="h-full">
            <div class="py-2 h-full">
              <For each={props.backupData.collections}>
                {(collection) => <CollectionItem collection={collection} />}
              </For>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div class="p-4 border-t border-gray-300 flex justify-between">
          <button type="button" onClick={props.onClose} class="btn btn-primary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMerge}
            class="btn btn-primary"
            disabled={props.backupData.collections.length === 0 || merging()}
          >
            <Show when={merging()} fallback="Merge & Import">
              <span class="loading loading-spinner loading-sm mr-2"></span>
              Merging...
            </Show>
          </button>
        </div>
      </div>
    </dialog>
  );
}
