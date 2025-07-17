import { createSignal, For, Show } from "solid-js";
import { CollectionBookmark } from "./CollectionBookmarks";

interface Collection {
  id: string;
  name: string;
  items: CollectionBookmark[];
  subcollections: Collection[];
}

interface CollectionItemProps {
  collection: Collection;
  level?: number;
  selectedCollectionId?: string;
  onSelectCollection?: (
    id: Collection,
    currentExpandedCollections: string[],
  ) => void;
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
  const level = () => props.level || 0;

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
          "bg-blue-600 text-white":
            props.selectedCollectionId === props.collection.id,
        }}
        // TODO: figure out how to use flex and padding to do this below
        style={{ "padding-left": `${level() * 20 + 16}px` }}
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
      </div>

      <Show when={isExpanded()}>
        <div class="bg-black/[0.02]">
          {/* Render subcollections */}
          <ul>
            <For each={props.collection.subcollections}>
              {(subcollection) => (
                <li>
                  <CollectionItem
                    collection={subcollection}
                    level={level() + 1}
                    selectedCollectionId={props.selectedCollectionId}
                    onSelectCollection={props.onSelectCollection}
                    expandedPath={[...props.expandedPath, subcollection.id]}
                    setCurrentExpandedCollections={
                      props.setCurrentExpandedCollections
                    }
                    currentExpandedCollections={
                      props.currentExpandedCollections
                    }
                  />
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
  collections: Collection[];
  onAddCollection?: (name: string) => void;
  path: string[];
  setCurrentExpandedCollections: (path: string[]) => void;
  currentExpandedCollections: string[];
}

export default function Collections(props: CollectionsProps) {
  return (
    <div class="w-[300px] h-screen bg-gray-100 border-r border-gray-300 overflow-y-auto font-sans">
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
    </div>
  );
}

export type { Collection };
