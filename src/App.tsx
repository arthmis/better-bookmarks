import { createSignal, createEffect } from "solid-js";
import Collections, { Collection } from "./components/Collections";
import AddCollectionButton from "./components/AddCollectionButton";
import ImportTabButton from "./components/ImportTabButton";

export default function App() {
  const [selectedCollectionId, setSelectedCollectionId] = createSignal<
    string | undefined
  >();
  const [collections, setCollections] = createSignal<Collection[]>([
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
              subcollections: [],
            },
          ],
        },
        {
          id: "1-2",
          name: "Marketing",
          items: ["Campaign Ideas", "Analytics"],
          subcollections: [],
        },
      ],
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
          subcollections: [],
        },
      ],
    },
    {
      id: "3",
      name: "Learning",
      items: ["JavaScript Tutorials", "Design Patterns"],
      subcollections: [],
    },
  ]);

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const findCollectionById = (
    collections: Collection[],
    id: string,
  ): Collection | null => {
    for (const collection of collections) {
      if (collection.id === id) {
        return collection;
      }
      const found = findCollectionById(collection.subcollections, id);
      if (found) {
        return found;
      }
    }
    return null;
  };

  const addNewCollection = (name: string) => {
    const newCollection: Collection = {
      id: generateId(),
      name: name,
      items: [],
      subcollections: [],
    };
    setCollections([...collections(), newCollection]);
  };

  const getCurrentTabUrl = async (): Promise<string | null> => {
    try {
      // Check if we're in an extension context
      if (typeof browser !== "undefined" && browser.tabs) {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        return tab.url || null;
      }
      // Fallback for development
      return window.location.href;
    } catch (error) {
      console.error("Failed to get current tab URL:", error);
      return null;
    }
  };

  const importCurrentTab = async () => {
    const selectedId = selectedCollectionId();
    if (!selectedId) {
      // TODO: Implement logic to create a new collection if none is selected
      alert("Please select a collection first");
      return;
    }

    const url = await getCurrentTabUrl();
    if (!url) {
      // TODO: decide what to do if there isn't a url
      alert("Failed to get current tab URL");
      return;
    }

    // Create a better title by getting the page title
    let title = url;
    try {
      if (typeof browser !== "undefined" && browser.tabs) {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        title = tab.title || url;
      } else {
        title = document.title || url;
      }
    } catch (error) {
      // TODO: decide to what to do here
      console.error("Failed to get tab title:", error);
    }

    // Find and update the selected collection
    const updateCollections = (collections: Collection[]): Collection[] => {
      return collections.map((collection) => {
        if (collection.id === selectedId) {
          return {
            ...collection,
            items: [...collection.items, `${title} - ${url}`],
          };
        }
        return {
          ...collection,
          subcollections: updateCollections(collection.subcollections),
        };
      });
    };

    setCollections(updateCollections(collections()));
  };

  const handleSelectCollection = (id: string) => {
    // Toggle selection - if same collection is clicked, deselect it
    if (selectedCollectionId() === id) {
      setSelectedCollectionId(undefined);
    } else {
      setSelectedCollectionId(id);
    }
  };

  // TODO: Address this unused variable
  const isImportDisabled = () => !selectedCollectionId();

  return (
    <div style="display: flex; height: 100vh;">
      <Collections
        collections={collections()}
        selectedCollectionId={selectedCollectionId()}
        onSelectCollection={handleSelectCollection}
      />
      <div style="flex: 1; padding: 20px;">
        <div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
          <h1 style="margin: 0; flex: 1;">Bookmarks</h1>

          <AddCollectionButton onAddCollection={addNewCollection} />

          <ImportTabButton
            selectedCollectionId={selectedCollectionId()}
            onImportTab={importCurrentTab}
          />
        </div>

        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-weight: 500;">
            Selected Collection:
            <span style="color: #007acc;">
              {selectedCollectionId()
                ? (() => {
                    const collection = findCollectionById(
                      collections(),
                      selectedCollectionId()!,
                    );
                    return collection ? collection.name : "Unknown";
                  })()
                : "None"}
            </span>
          </p>
          <p style="margin: 0; font-size: 14px; color: #666;">
            {selectedCollectionId()
              ? 'Click "Import Tab" to add the current page to this collection.'
              : "Select a collection from the sidebar to enable importing."}
          </p>
        </div>
      </div>
    </div>
  );
}
