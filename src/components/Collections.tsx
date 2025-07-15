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
    <div class="collection-item">
      <div
        class="collection-header"
        style={{ "padding-left": `${level() * 20}px` }}
        classList={{
          selected: props.selectedCollectionId === props.collection.id,
        }}
        onClick={(e) => {
          e.stopPropagation();
          props.onSelectCollection?.(props.collection, props.expandedPath);
        }}
      >
        <span class="collection-toggle">
          <Show when={hasChildren()}>{isExpanded() ? "▼" : "▶"}</Show>
        </span>
        <span class="collection-name">{props.collection.name}</span>
        <span class="collection-count">({totalItemCount()})</span>
      </div>

      <Show when={isExpanded()}>
        <div class="collection-content">
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
    <div class="collections-panel">
      <div class="collections-header">
        <h3>Collections</h3>
      </div>
      <ul class="collections-list">
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

      <style>{`
        .collections-panel {
          width: 300px;
          height: 100vh;
          background-color: #f5f5f5;
          border-right: 1px solid #ddd;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .collections-header {
          padding: 16px;
          border-bottom: 1px solid #ddd;
          background-color: #fff;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .collections-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .collections-list {
          padding: 8px 0;
        }

        .collection-item {
          user-select: none;
        }

        .collection-header {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .collection-header:hover {
          background-color: #e9e9e9;
        }

        .collection-header.selected {
          background-color: #007acc;
          color: white;
        }

        .collection-header.selected .collection-count {
          color: rgba(255, 255, 255, 0.8);
        }

        .collection-header.selected .collection-toggle {
          color: rgba(255, 255, 255, 0.8);
        }

        .collection-toggle {
          width: 20px;
          font-size: 12px;
          color: #666;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .collection-name {
          flex: 1;
          font-weight: 500;
          color: #333;
        }

        .collection-header.selected .collection-name {
          color: white;
        }

        .collection-count {
          font-size: 12px;
          color: #666;
          margin-left: 8px;
        }

        .collection-content {
          background-color: rgba(0, 0, 0, 0.02);
        }

        .collection-item-leaf {
          display: flex;
          align-items: center;
          padding: 4px 16px;
          font-size: 14px;
          color: #555;
        }

        .collection-item-leaf:hover {
          background-color: #e9e9e9;
          cursor: pointer;
        }

        .item-bullet {
          width: 20px;
          margin-right: 8px;
          color: #999;
          font-size: 12px;
        }

        .item-name {
          flex: 1;
        }
      `}</style>
    </div>
  );
}

export type { Collection };
