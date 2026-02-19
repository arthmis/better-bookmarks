import { For, Show, Suspense } from "solid-js";
import {
  bookmarksStore,
  dispatch,
  setBookmarksStore,
} from "../Store/Collections";
import type { Collection } from "./Collections";

export default function BrowserBookmarks() {
  // Calculate total bookmarks available for import
  const getTotalImportableBookmarks = () => {
    const browserCollections =
      bookmarksStore.importBrowserBookmarks.collections;
    if (!browserCollections) return 0;

    let total = 0;
    const countBookmarks = (collection: Collection) => {
      total += collection.items.length;
      collection.subcollections.forEach(countBookmarks);
    };

    browserCollections.forEach(countBookmarks);
    return total;
  };

  // Handle importing browser bookmarks
  const handleImportBookmarks = () => {
    dispatch({
      type: "IMPORT_BROWSER_BOOKMARKS",
    });
  };

  return (
    <dialog class="modal modal-open w-full">
      <div class="bg-gray-50 rounded-box flex flex-col min-h-9/10 max-h-9/10 w-9/10">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 class="text-xl font-semibold text-gray-800">Browser Bookmarks</h2>
          <button
            type="button"
            onClick={() => {
              setBookmarksStore("importBrowserBookmarks", {
                ...bookmarksStore.importBrowserBookmarks,
                browserBookmarksOpen: false,
              });
            }}
            class="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Info Section */}
        <div class="p-4 bg-blue-50 border-b border-gray-300">
          <p class="text-sm text-gray-700">
            Import your browser bookmarks into this app. Duplicate URLs will be
            skipped automatically. Collections with matching names will be
            merged together.
          </p>
          <Show
            when={bookmarksStore.importBrowserBookmarks.collections.length > 0}
            fallback={
              <p class="text-sm text-blue-600 mt-2">No bookmarks found.</p>
            }
          >
            <p class="text-sm text-blue-600 mt-2">
              Found {getTotalImportableBookmarks()} bookmarks across{" "}
              {bookmarksStore.importBrowserBookmarks.collections.length}{" "}
              collections.
            </p>
          </Show>
        </div>

        {/* Content */}
        <div class="h-full overflow-auto w-full flex-auto">
          <div class="h-full">
            <Suspense
              fallback={
                <div class="flex items-center justify-center h-full">
                  <div class="text-gray-600">Loading...</div>
                </div>
              }
            >
              <div class="py-2 h-full">
                <For each={bookmarksStore.importBrowserBookmarks.collections}>
                  {(collection) => <CollectionItem collection={collection} />}
                </For>
              </div>
            </Suspense>
          </div>
        </div>

        {/* Footer */}
        <div class="p-4 border-t border-gray-300 flex justify-between">
          <button
            type="button"
            onClick={() => {
              setBookmarksStore("importBrowserBookmarks", {
                ...bookmarksStore.importBrowserBookmarks,
                browserBookmarksOpen: false,
              });
            }}
            class="btn btn-primary"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImportBookmarks}
            class="btn btn-primary"
            disabled={
              bookmarksStore.importBrowserBookmarks.collections.length === 0 ||
              bookmarksStore.importBrowserBookmarks.isImporting
            }
          >
            <Show
              when={bookmarksStore.importBrowserBookmarks.isImporting}
              fallback="Import Bookmarks"
            >
              <span class="loading loading-spinner loading-sm mr-2"></span>
              Importing...
            </Show>
          </button>
        </div>
      </div>
    </dialog>
  );
}

interface CollectionItemProps {
  collection: Collection;
}

const getTotalBookmarkCount = (collection: Collection): number => {
  let count = collection.items.length;
  for (const sub of collection.subcollections) {
    count += getTotalBookmarkCount(sub);
  }
  return count;
};

const CollectionItem = (props: CollectionItemProps) => {
  const isExpanded = () =>
    bookmarksStore.importBrowserBookmarks.currentExpandedCollections.has(
      props.collection.id,
    );
  const hasChildren = () =>
    props.collection.subcollections.length > 0 ||
    props.collection.items.length > 0;
  const totalItems = () => getTotalBookmarkCount(props.collection);

  return (
    <div class="w-full">
      <div
        class="flex items-center py-2 px-4 cursor-pointer transition-colors duration-200 hover:bg-gray-600 hover:text-white"
        onClick={() => {
          hasChildren() &&
            dispatch({
              type: "TOGGLE_BROWSER_FOLDER",
              payload: {
                folderId: props.collection.id,
              },
            });
        }}
      >
        <span class="w-5 text-xs text-gray-600 hover:text-white mr-2 flex items-center justify-center">
          <Show when={hasChildren()}>{isExpanded() ? "▼" : "▶"}</Show>
        </span>
        <span class="flex-1 font-medium text-gray-800 hover:text-white">
          {props.collection.name}
        </span>
        <span class="text-xs ml-2 text-gray-600 hover:text-white">
          ({totalItems()})
        </span>
      </div>

      <Show when={isExpanded()}>
        <div class="bg-black/[0.02]">
          {/* Render bookmarks */}
          <For each={props.collection.items}>
            {(bookmark) => {
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
            <For each={props.collection.subcollections}>
              {(subcollection) => <CollectionItem collection={subcollection} />}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};
