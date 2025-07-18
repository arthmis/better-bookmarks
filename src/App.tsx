import { createSignal, Match, Show, Switch } from "solid-js";
import Collections, { Collection } from "./components/Collections";
import AddCollectionButton from "./components/AddCollectionButton";
import ImportTabButton from "./components/ImportTabButton";
import ErrorToast, { showErrorToast } from "./components/ErrorToast";
import CollectionBookmarksComponent, {
  CollectionBookmarks,
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
  const [collectionBookmarks, setBookmarkItems] =
    createSignal<CollectionBookmarks>({
      title: "",
      bookmarks: [],
    });

  const [fetchDataState, setFetchDataState] =
    createSignal<CollectionFetchState>({
      status: "pending",
      error: undefined,
    });
  const [collections, setCollections] = createSignal<Collection[]>([]);
  const [currentExpandedCollections, setCurrentExpandedCollections] =
    createSignal<string[]>([]);

  browser.storage.local
    .get("collections")
    .then((data) => {
      setCollections(data.collections || []);
      setFetchDataState({ status: "success" });
    })
    .catch(() => {
      setFetchDataState({
        status: "error",
        error: new Error("Failed to fetch collections"),
      });
    });

  const generateId = () => {
    return crypto.randomUUID();
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (selectedCollectionId() === undefined) {
      try {
        await updateAndStoreCollections([...collections(), newCollection]);
      } catch (error) {
        console.error("Failed to add or update collection:", error);
        showErrorToast("Failed to add or update collection. Please try again.");
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
      await updateAndStoreCollections(updateCollections(collections()));
      console.log("stored new collection");
    } catch (error) {
      console.error("Failed to add or update collection:", error);
      showErrorToast("Failed to add or update collection. Please try again.");
    }
  };

  const updateAndStoreCollections = async (
    collections: Collection[],
  ): Promise<void> => {
    setCollections(collections);
    await browser.storage.local.set({ collections });
    console.log("stored updated collections");
    return;
  };

  const getCurrentTab = async (): Promise<browser.tabs.Tab | undefined> => {
    try {
      // Check if we're in an extension context
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      return tab || undefined;
    } catch (error) {
      console.error("Failed to get current tab URL:", error);
      return undefined;
    }
  };

  const importCurrentTab = async () => {
    const selectedId = selectedCollectionId();
    if (!selectedId) {
      // TODO: Implement logic to create a new collection if none is selected
      showErrorToast("Please select a collection first");
      return;
    }

    let tab = undefined;
    try {
      tab = await getCurrentTab();
    } catch (error) {
      console.error("Failed to get current tab URL:", error);
      return;
    }
    if (!tab?.url) {
      showErrorToast("Failed to get current tab URL");
      return;
    }

    // Create a better title by getting the page title
    let title = tab.title || tab.url;
    let url = tab.url;
    let iconUrl = tab.favIconUrl || undefined;

    // Find and update the selected collection
    const updateCollections = (collections: Collection[]): Collection[] => {
      return collections.map((collection) => {
        if (collection.id === selectedId) {
          const newCollection = {
            ...collection,
            items: [
              ...collection.items,
              {
                id: crypto.randomUUID(),
                title,
                url,
                iconUrl,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          };
          // if these items are in view update the list of bookmarks
          setBookmarkItems({
            title: newCollection.name,
            bookmarks: newCollection.items,
          });

          return newCollection;
        }
        return {
          ...collection,
          subcollections: updateCollections(collection.subcollections),
        };
      });
    };

    try {
      await updateAndStoreCollections(updateCollections(collections()));
      console.log("stored new collection");
    } catch (error) {
      console.error("Failed to add bookmark to collection:", error);
      showErrorToast("Failed to add bookmark to collection. Please try again.");
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    const updateCollections = (collections: Collection[]): Collection[] =>
      collections.map((collection) => {
        if (collection.id === selectedCollectionId()) {
          const updatedItems = collection.items.filter(
            (item) => item.id !== bookmarkId,
          );
          const newCollection = {
            ...collection,
            items: updatedItems,
          };
          // if these items are in view update the list of bookmarks
          setBookmarkItems({
            title: newCollection.name,
            bookmarks: newCollection.items,
          });
          return newCollection;
        }
        return {
          ...collection,
          subcollections: updateCollections(collection.subcollections),
        };
      });

    try {
      await updateAndStoreCollections(updateCollections(collections()));
      console.log("deleted bookmark");
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
      showErrorToast("Failed to delete bookmark. Please try again.");
    }
  };

  const handleSelectCollection = (
    collection: Collection,
    currentExpandedCollections: string[],
  ) => {
    // Toggle selection - if same collection is clicked, deselect it
    if (selectedCollectionId() === collection.id) {
      setSelectedCollectionId(undefined);
      setBookmarkItems({
        title: "",
        bookmarks: [],
      });
      let idIndex = currentExpandedCollections.indexOf(collection.id);
      setCurrentExpandedCollections(
        currentExpandedCollections.toSpliced(idIndex),
      );
    } else {
      setSelectedCollectionId(collection.id);
      const selectedCollection = findCollectionById(
        collections(),
        selectedCollectionId()!,
      );
      if (selectedCollection) {
        setBookmarkItems({
          title: selectedCollection.name,
          bookmarks: selectedCollection.items,
        });
        setCurrentExpandedCollections(currentExpandedCollections);
      } else {
        setBookmarkItems({
          title: "",
          bookmarks: [],
        });
      }
    }
  };

  // TODO: Address this unused variable
  const isImportDisabled = () => !selectedCollectionId();

  return (
    // firefox web extension can only grow up to 800px wide by 600px high
    <div class="h-svw flex w-3xl">
      <Switch fallback={<div>Getting bookmarks</div>}>
        <Match when={fetchDataState().status === "success"}>
          <div class="flex w-full">
            <Collections
              collections={collections()}
              selectedCollectionId={selectedCollectionId()}
              onSelectCollection={handleSelectCollection}
              path={[]}
              setCurrentExpandedCollections={setCurrentExpandedCollections}
              currentExpandedCollections={currentExpandedCollections()}
            />
            <div class="flex flex-col flex-1 p-5 w-fit">
              <div class="flex flex-row mb-5 justify-evenly items-center">
                <AddCollectionButton onAddCollection={addNewCollection} />
                <ImportTabButton
                  selectedCollectionId={selectedCollectionId()}
                  onImportTab={importCurrentTab}
                />
              </div>
              <CollectionBookmarksComponent
                collection={collectionBookmarks()}
                handleDeleteBookmark={handleDeleteBookmark}
              />
            </div>
          </div>
        </Match>
        <Match when={fetchDataState().status === "error"}>
          <h1>Error fetching bookmarks</h1>
        </Match>
        <Match when={fetchDataState().status === "pending"}>
          <h1>Loading bookmarks...</h1>
        </Match>
      </Switch>
      <ErrorToast />
    </div>
  );
}
