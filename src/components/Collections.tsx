import { createSignal, For, Show } from "solid-js";

interface Collection {
  id: string;
  name: string;
  items: string[];
  subcollections: Collection[];
}

interface CollectionItemProps {
  collection: Collection;
  level?: number;
}

function CollectionItem(props: CollectionItemProps) {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const level = () => props.level || 0;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded());
  };

  const hasChildren = () =>
    props.collection.subcollections.length > 0 || props.collection.items.length > 0;

  const totalItemCount = () => {
    let count = props.collection.items.length;
    props.collection.subcollections.forEach(sub => {
      count += sub.items.length;
      // Recursively count items in subcollections
      const countSubItems = (collection: Collection): number => {
        let subCount = collection.items.length;
        collection.subcollections.forEach(subCol => {
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
        onClick={toggleExpanded}
      >
        <span class="collection-toggle">
          <Show when={hasChildren()}>
            {isExpanded() ? "▼" : "▶"}
          </Show>
        </span>
        <span class="collection-name">{props.collection.name}</span>
        <span class="collection-count">({totalItemCount()})</span>
      </div>

      <Show when={isExpanded()}>
        <div class="collection-content">
          {/* Render subcollections */}
          <For each={props.collection.subcollections}>
            {(subcollection) => (
              <CollectionItem
                collection={subcollection}
                level={level() + 1}
              />
            )}
          </For>

          {/* Render items */}
          <For each={props.collection.items}>
            {(item) => (
              <div
                class="collection-item-leaf"
                style={{ "padding-left": `${(level() + 1) * 20 + 20}px` }}
              >
                <span class="item-bullet">•</span>
                <span class="item-name">{item}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export default function Collections() {
  // Sample data - replace with your actual data source
  const [collections] = createSignal<Collection[]>([
    {
      id: "1",
      name: "Work",
      items: ["Meeting Notes", "Project Plans"],
      subcollections: [
        {
          id: "1-1",
          name: "Development",
          items: ["Code Reviews", "Bug Reports", "Feature Specs"],
          subcollections: [
            {
              id: "1-1-1",
              name: "Frontend",
              items: ["React Components", "CSS Styles"],
              subcollections: []
            }
          ]
        },
        {
          id: "1-2",
          name: "Marketing",
          items: ["Campaign Ideas", "Analytics"],
          subcollections: []
        }
      ]
    },
    {
      id: "2",
      name: "Personal",
      items: ["Shopping List", "Recipes", "Travel Plans"],
      subcollections: [
        {
          id: "2-1",
          name: "Hobbies",
          items: ["Photography Tips", "Gardening Notes"],
          subcollections: []
        }
      ]
    },
    {
      id: "3",
      name: "Learning",
      items: ["JavaScript Tutorials", "Design Patterns"],
      subcollections: []
    }
  ]);

  return (
    <div class="collections-panel">
      <div class="collections-header">
        <h3>Collections</h3>
      </div>
      <div class="collections-list">
        <For each={collections()}>
          {(collection) => (
            <CollectionItem collection={collection} />
          )}
        </For>
      </div>

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
