import { createSignal, Match, Show, Switch } from "solid-js";
import Collections, { Collection } from "./components/Collections";
import AddCollectionButton from "./components/AddCollectionButton";
import ImportTabButton from "./components/ImportTabButton";
import ErrorToast, { showErrorToast } from "./components/ErrorToast";
import CollectionBookmarksComponent, {
  CollectionBookmarks,
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
    const normalizedName = name.trim().toLowerCase();

    // Check for duplicates
    const isDuplicate = (collectionsToCheck: Collection[]): boolean => {
      return collectionsToCheck.some(
        (collection) => collection.name.trim().toLowerCase() === normalizedName,
      );
    };

    if (selectedCollectionId() === undefined) {
      // Check top-level collections for duplicates
      if (isDuplicate(collections())) {
        return; // Don't add duplicate
      }
    } else {
      // Check subcollections of selected collection for duplicates
      const selectedCollection = findCollectionById(
        collections(),
        selectedCollectionId()!,
      );
      if (
        selectedCollection &&
        isDuplicate(selectedCollection.subcollections)
      ) {
        return; // Don't add duplicate
      }
    }

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
    return;
  };

  const getSelectedTabs = async (): Promise<browser.tabs.Tab[]> => {
    // Check if we're in an extension context
    const tabs = await browser.tabs.query({
      currentWindow: true,
      highlighted: true,
    });
    return tabs;
  };

  const importCurrentTab = async () => {
    const selectedId = selectedCollectionId();
    if (!selectedId) {
      // TODO: Implement logic to create a new collection if none is selected
      showErrorToast("Please select a collection first");
      return;
    }

    let tabs: browser.tabs.Tab[] | undefined = undefined;
    try {
      tabs = await getSelectedTabs();
    } catch (error) {
      showErrorToast("Failed to save selected tab(s).");
      return;
    }

    if (!tabs) {
      return;
    }

    const bookmarks: CollectionBookmark[] = tabs.map((tab) => {
      // Create a better title by getting the page title
      let title = tab.title || "";
      let url = tab.url || "";
      let iconUrl = tab.favIconUrl || undefined;

      return {
        id: crypto.randomUUID(),
        title,
        url,
        iconUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    // Find and update the selected collection
    const updateCollections = (collections: Collection[]): Collection[] => {
      return collections.map((collection) => {
        if (collection.id === selectedId) {
          // const filteredBookmarks = bookmarks.filter((bookmark) => !collection.items.some((item) => item.id === bookmark.id));
          const newCollection = {
            ...collection,
            items: [...collection.items, ...bookmarks],
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
    } catch (error) {
      console.error("Failed to add bookmark to collection:", error);
      showErrorToast("Failed to add bookmark to collection. Please try again.");
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    const removeCollection = (collections: Collection[]): Collection[] =>
      collections
        .filter((collection) => collection.id !== collectionId)
        .map((collection) => ({
          ...collection,
          subcollections: removeCollection(collection.subcollections),
        }));

    try {
      const updatedCollections = removeCollection(collections());
      await updateAndStoreCollections(updatedCollections);

      // If the deleted collection was selected, clear the selection
      if (selectedCollectionId() === collectionId) {
        setSelectedCollectionId(undefined);
        setBookmarkItems({
          title: "",
          bookmarks: [],
        });

        // Remove the deleted collection from expanded collections but keep ancestors
        let idIndex = currentExpandedCollections().indexOf(collectionId);
        setCurrentExpandedCollections(
          currentExpandedCollections().toSpliced(idIndex),
        );
      }
    } catch (error) {
      showErrorToast("Failed to delete collection. Please try again.");
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

  return (
    // firefox web extension can only grow up to 800px wide by 600px high
    <div class="h-full flex w-full">
      <Switch fallback={<div>Getting bookmarks</div>}>
        <Match when={fetchDataState().status === "success"}>
          <div class="flex w-full h-full">
            <Collections
              collections={collections()}
              selectedCollectionId={selectedCollectionId()}
              onSelectCollection={handleSelectCollection}
              onDeleteCollection={handleDeleteCollection}
              path={[]}
              setCurrentExpandedCollections={setCurrentExpandedCollections}
              currentExpandedCollections={currentExpandedCollections()}
            />
            <div class="flex flex-col flex-1 p-5 w-full h-full">
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
