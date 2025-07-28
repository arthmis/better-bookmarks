import { createSignal, For, Show, createResource, Suspense } from "solid-js";
import { Collection } from "./Collections";
import { CollectionBookmark } from "./CollectionBookmarks";

interface BrowserBookmarksProps {
  // isOpen: boolean;
  onClose: () => void;
}

export default function BrowserBookmarks(props: BrowserBookmarksProps) {
  // Fetch browser bookmarks
  const fetchBrowserBookmarks = async (_source, _options) => {
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

      return convertedCollections;
    } catch (err) {
      // TODO: show an error toast
      console.error("Failed to fetch browser bookmarks:", err);
    }
  };

  const [collections, _object] = createResource(fetchBrowserBookmarks);
  const [currentExpandedCollections, setCurrentExpandedCollections] =
    createSignal<Set<String>>(new Set([]));

  // Convert browser bookmark tree to Collection format
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

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    const expanded = currentExpandedCollections();
    if (expanded.has(folderId)) {
      expanded.delete(folderId);
    } else {
      expanded.add(folderId);
    }
    setCurrentExpandedCollections(new Set(expanded));
  };

  // Calculate total bookmark count for a collection
  const getTotalBookmarkCount = (collection: Collection): number => {
    let count = collection.items.length;
    for (const sub of collection.subcollections) {
      count += getTotalBookmarkCount(sub);
    }
    return count;
  };

  interface CollectionItemProps {
    collection: Collection;
  }

  // Render collection item (similar to Collections component)
  const CollectionItem = (props: CollectionItemProps) => {
    const isExpanded = () =>
      currentExpandedCollections().has(props.collection.id);
    const hasChildren = () =>
      props.collection.subcollections.length > 0 ||
      props.collection.items.length > 0;
    const totalItems = () => getTotalBookmarkCount(props.collection);

    return (
      <div class="w-full">
        <div
          class="flex items-center py-2 px-4 cursor-pointer transition-colors duration-200 hover:bg-gray-600 hover:text-white"
          onClick={() => hasChildren() && toggleFolder(props.collection.id)}
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

  return (
    <dialog class="modal modal-open w-full">
      <div class="bg-gray-50 rounded-box flex flex-col min-h-9/10 max-h-9/10 w-9/10">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 class="text-xl font-semibold text-gray-800">Browser Bookmarks</h2>
          <button
            onClick={props.onClose}
            class="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            ✕
          </button>
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
                <For each={collections()}>
                  {(collection) => <CollectionItem collection={collection} />}
                </For>
              </div>
            </Suspense>
          </div>
        </div>

        {/* Footer */}
        <div class="p-4 border-t border-gray-300 flex justify-end">
          <button onClick={props.onClose} class="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
