import { createSignal, Match, Switch } from "solid-js";
import Collections, { Collection } from "./components/Collections";
import AddCollectionButton from "./components/AddCollectionButton";
import ImportTabButton from "./components/ImportTabButton";
import CollectionBookmarks, {
  CollectionBookmark,
} from "./components/CollectionBookmarks";

interface CollectionFetchState {
  status: "pending" | "success" | "error";
  data?: Collection[];
  error?: Error;
}

export default function App() {
  const [selectedCollectionId, setSelectedCollectionId] = createSignal<
    string | undefined
  >();
  const [bookmarkItems, setBookmarkItems] = createSignal<CollectionBookmark[]>(
    [],
  );

  const [dataFetchData, setDataFetchData] = createSignal<CollectionFetchState>({
    status: "pending",
    error: undefined,
  });
  const [collections, setCollections] = createSignal<Collection[]>([]);

  browser.storage.local
    .get("collections")
    .then((data) => {
      setCollections(data.collections || []);
      setDataFetchData({ status: "success" });
    })
    .catch(() => {
      setDataFetchData({
        status: "error",
        error: new Error("Failed to fetch collections"),
      });
    });

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

  const addNewCollection = async (name: string) => {
    const newCollection: Collection = {
      id: generateId(),
      name: name,
      items: [],
      subcollections: [],
    };

    if (selectedCollectionId() === undefined) {
      try {
        setCollections([...collections(), newCollection]);
        await browser.storage.local.set({ collections: collections() });
        console.log("stored new collection");
      } catch (error) {
        // TODO handle error with a toast
        console.error("Failed to add or update collection:", error);
      } finally {
        return;
      }
    }

    const updateCollections = (collections: Collection[]): Collection[] => {
      return collections.map((collection) => {
        if (collection.id === selectedCollectionId()) {
          return {
            ...collection,
            subcollections: [...collection.subcollections, newCollection],
          };
        }
        return {
          ...collection,
          subcollections: updateCollections(collection.subcollections),
        };
      });
    };

    try {
      setCollections(updateCollections(collections()));
      await browser.storage.local.set({ collections: collections() });
      console.log("stored new collection");
    } catch (error) {
      // TODO handle error with a toast
      console.error("Failed to add or update collection:", error);
    }
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
          const newCollection = {
            ...collection,
            items: [
              ...collection.items,
              { id: crypto.randomUUID(), title, url },
            ],
          };
          // if these items are in view update the list of bookmarks
          setBookmarkItems(newCollection.items);

          return newCollection;
        }
        return {
          ...collection,
          subcollections: updateCollections(collection.subcollections),
        };
      });
    };

    setCollections(updateCollections(collections()));
    browser.storage.local.set({ collections: collections() });
  };

  const handleSelectCollection = (id: string) => {
    // Toggle selection - if same collection is clicked, deselect it
    if (selectedCollectionId() === id) {
      setSelectedCollectionId(undefined);
      setBookmarkItems([]);
    } else {
      setSelectedCollectionId(id);
      const selectedCollection = findCollectionById(
        collections(),
        selectedCollectionId()!,
      );
      if (selectedCollection) {
        setBookmarkItems(selectedCollection.items);
      } else {
        setBookmarkItems([]);
      }
    }
  };

  // TODO: Address this unused variable
  const isImportDisabled = () => !selectedCollectionId();

  return (
    <Switch fallback={<div>Getting bookmarks</div>}>
      <Match when={dataFetchData().status === "success"}>
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
            <CollectionBookmarks items={bookmarkItems()} />

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
      </Match>
      <Match when={dataFetchData().status === "error"}>
        <h1>Error fetching bookmarks</h1>
      </Match>
      <Match when={dataFetchData().status === "pending"}>
        <h1>Loading bookmarks...</h1>
      </Match>
    </Switch>
  );
}
