import { For, Show, createSignal } from "solid-js";
import { CollectionBookmark } from "./CollectionBookmarks";
import DeleteCollectionModal from "./DeleteCollectionModal";

interface Collection {
  id: string;
  name: string;
  items: CollectionBookmark[];
  subcollections: Collection[];
  createdAt: Date;
  updatedAt: Date;
}

interface CollectionItemProps {
  collection: Collection;
  selectedCollectionId?: string;
  onSelectCollection?: (
    id: Collection,
    currentExpandedCollections: string[],
  ) => void;
  onDeleteCollection?: (id: string, name: string) => void;
  expandedPath: string[];
  setCurrentExpandedCollections: (path: string[]) => void;
  currentExpandedCollections: string[];
}

function CollectionItem(props: CollectionItemProps) {
  // TODO: figure out a better way to do this because as it is if I click on a child collection it will close other
  // collections including its parent, doesn't work with nested collections
  const isExpanded = () =>
    props.currentExpandedCollections.includes(props.collection.id) ||
    props.selectedCollectionId === props.collection.id;

  const hasChildren = () =>
    props.collection.subcollections.length > 0 ||
    props.collection.items.length > 0;

  const totalItemCount = () => {
    let count = props.collection.items.length;
    props.collection.subcollections.forEach((sub) => {
      count += sub.items.length;
      // Recursively count items in subcollections
      const countSubItems = (collection: Collection): number => {
        let subCount = collection.items.length;
        collection.subcollections.forEach((subCol) => {
          subCount += countSubItems(subCol);
        });
        return subCount;
      };
      count += countSubItems(sub);
    });
    return count;
  };

  return (
    <div class="w-full">
      <div
        class="flex group items-center py-2 px-4 cursor-pointer transition-colors duration-200 hover:bg-gray-600 hover:text-white
        "
        classList={{
          "bg-secondary text-white":
            props.selectedCollectionId === props.collection.id,
        }}
        onClick={(e) => {
          e.stopPropagation();
          props.onSelectCollection?.(props.collection, props.expandedPath);
        }}
      >
        <span
          class="w-5 text-xs text-gray-600 group-hover:text-white mr-2 flex items-center justify-center"
          classList={{
            "text-white": props.selectedCollectionId === props.collection.id,
          }}
        >
          <Show when={hasChildren()}>{isExpanded() ? "▼" : "▶"}</Show>
        </span>
        <span
          class="flex-1 font-medium group-hover:text-white"
          classList={{
            "text-white": props.selectedCollectionId === props.collection.id,
            "text-gray-800": props.selectedCollectionId !== props.collection.id,
          }}
        >
          {props.collection.name}
        </span>
        <span
          class="text-xs ml-2 group-hover:text-white"
          classList={{
            "text-white/80": props.selectedCollectionId === props.collection.id,
            "text-gray-600": props.selectedCollectionId !== props.collection.id,
          }}
        >
          ({totalItemCount()})
        </span>
        <Show when={props.selectedCollectionId === props.collection.id}>
          <button
            aria-label="Delete Collection"
            onClick={(e) => {
              e.stopPropagation();
              props.onDeleteCollection?.(
                props.collection.id,
                props.collection.name,
              );
            }}
            class="btn btn-square btn-ghost btn-xs ml-2"
          >
            <img src="/assets/trash.svg" alt="" class="w-3 h-3" />
          </button>
        </Show>
      </div>

      <Show when={isExpanded()}>
        <div class="bg-black/[0.02]">
          {/* Render subcollections */}
          <ul>
            <For each={props.collection.subcollections}>
              {(subcollection) => (
                <li>
                  <div class="pl-5">
                    <CollectionItem
                      collection={subcollection}
                      selectedCollectionId={props.selectedCollectionId}
                      onSelectCollection={props.onSelectCollection}
                      onDeleteCollection={props.onDeleteCollection}
                      expandedPath={[...props.expandedPath, subcollection.id]}
                      setCurrentExpandedCollections={
                        props.setCurrentExpandedCollections
                      }
                      currentExpandedCollections={
                        props.currentExpandedCollections
                      }
                    />
                  </div>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
    </div>
  );
}

interface CollectionsProps {
  selectedCollectionId?: string;
  onSelectCollection?: (
    id: Collection,
    currentExpandedCollections: string[],
  ) => void;
  onDeleteCollection?: (id: string) => void;
  collections: Collection[];
  onAddCollection?: (name: string) => void;
  path: string[];
  setCurrentExpandedCollections: (path: string[]) => void;
  currentExpandedCollections: string[];
}

export default function Collections(props: CollectionsProps) {
  const [deleteModalOpen, setDeleteModalOpen] = createSignal(false);
  const [collectionToDelete, setCollectionToDelete] = createSignal<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteClick = (collectionId: string, collectionName: string) => {
    setCollectionToDelete({ id: collectionId, name: collectionName });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    const toDelete = collectionToDelete();
    if (toDelete) {
      props.onDeleteCollection?.(toDelete.id);
      setDeleteModalOpen(false);
      setCollectionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setCollectionToDelete(null);
  };
  return (
    <div class="w-full h-full bg-gray-100 border-gray-300 overflow-auto font-sans rounded-lg">
      <div class="p-4 border-b border-gray-300 bg-white sticky top-0 z-10">
        <h3 class="m-0 text-lg font-semibold text-gray-800">Collections</h3>
      </div>
      <ul class="py-2">
        <For each={props.collections}>
          {(collection) => (
            <li>
              <CollectionItem
                collection={collection}
                selectedCollectionId={props.selectedCollectionId}
                onSelectCollection={props.onSelectCollection}
                onDeleteCollection={handleDeleteClick}
                expandedPath={[...props.path, collection.id]}
                setCurrentExpandedCollections={
                  props.setCurrentExpandedCollections
                }
                currentExpandedCollections={props.currentExpandedCollections}
              />
            </li>
          )}
        </For>
      </ul>

      <DeleteCollectionModal
        isOpen={deleteModalOpen()}
        collectionName={collectionToDelete()?.name || ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export type { Collection };
