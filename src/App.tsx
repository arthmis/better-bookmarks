import { createSignal, Match, Show, Switch } from "solid-js";
import Collections, { Collection } from "./components/Collections";
import AddCollectionButton from "./components/AddCollectionButton";
import ImportTabButton from "./components/ImportTabButton";
import ErrorToast, { showErrorToast } from "./components/ErrorToast";
import CollectionBookmarksComponent, {
  CollectionBookmarks,
  CollectionBookmark,
} from "./components/CollectionBookmarks";
import BrowserBookmarks from "./components/BrowserBookmarks";
import Favorites from "./components/Favorites";

interface CollectionFetchState {
  status: "pending" | "success" | "error";
  data?: Collection[];
  error?: Error;
}

interface Favorite {
  id: string;
  name: string;
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
  const [browserBookmarksOpen, setBrowserBookmarksOpen] = createSignal(false);
  const [mostRecentlyUpdatedCollections, setMostRecentlyUpdatedCollections] =
    createSignal<Favorite[]>([]);
  const [activeTab, setActiveTab] = createSignal<"collections" | "favorites">(
    "favorites",
  );
  const [selectedFavoriteId, setSelectedFavoriteId] = createSignal<
    string | undefined
  >();

  browser.storage.local
    .get(["collections", "mostRecentlyUpdatedCollections"])
    .then((data) => {
      setCollections(data.collections || []);
      setMostRecentlyUpdatedCollections(
        data.mostRecentlyUpdatedCollections || [],
      );
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

  // Helper function to normalize URLs for comparison
  const normalizeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash and convert to lowercase for comparison
      return urlObj.href.replace(/\/$/, "").toLowerCase();
    } catch {
      // If URL parsing fails, return original URL for comparison
      return url.toLowerCase();
    }
  };

  // Function to merge browser bookmarks with existing collections
  const mergeBrowserBookmarks = (
    existingCollections: Collection[],
    browserCollections: Collection[],
  ): Collection[] => {
    // Get all existing URLs from all collections to avoid duplicates
    const getAllExistingUrls = (collections: Collection[]): Set<string> => {
      const urls = new Set<string>();
      const addUrlsFromCollection = (collection: Collection) => {
        collection.items.forEach((item) => {
          if (item.url) {
            urls.add(normalizeUrl(item.url));
          }
        });
        collection.subcollections.forEach(addUrlsFromCollection);
      };
      collections.forEach(addUrlsFromCollection);
      return urls;
    };

    const existingUrls = getAllExistingUrls(existingCollections);

    // Filter out duplicate bookmarks from browser collections
    const filterDuplicateBookmarks = (collection: Collection): Collection => {
      const filteredItems = collection.items.filter((item) => {
        if (!item.url) {
          return true;
        }
        return !existingUrls.has(normalizeUrl(item.url));
      });

      const filteredSubcollections = collection.subcollections.map(
        filterDuplicateBookmarks,
      );

      return {
        ...collection,
        items: filteredItems,
        subcollections: filteredSubcollections,
      };
    };

    // Filter browser collections and merge with existing ones
    const filteredBrowserCollections = browserCollections.map(
      filterDuplicateBookmarks,
    );

    // Merge collections by name or add new ones
    const mergedCollections = [...existingCollections];

    filteredBrowserCollections.forEach((browserCollection) => {
      // Check if a collection with the same name already exists
      const existingIndex = mergedCollections.findIndex(
        (existing) =>
          existing.name.toLowerCase() === browserCollection.name.toLowerCase(),
      );

      if (existingIndex >= 0) {
        // Merge into existing collection
        const existing = mergedCollections[existingIndex];
        mergedCollections[existingIndex] = {
          ...existing,
          items: [...existing.items, ...browserCollection.items],
          subcollections: mergeBrowserBookmarks(
            existing.subcollections,
            browserCollection.subcollections,
          ),
          updatedAt: new Date(),
        };
      } else {
        // Add as new collection if it has any content
        if (
          browserCollection.items.length > 0 ||
          browserCollection.subcollections.length > 0
        ) {
          mergedCollections.push({
            ...browserCollection,
            id: generateId(), // Generate new ID for imported collection
          });
        }
      }
    });

    return mergedCollections;
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

  const updateMostRecentlyUpdatedCollections = (collection: Favorite) => {
    const current = mostRecentlyUpdatedCollections();
    const filtered = current.filter(({ id }) => id !== collection.id);
    const updated = [collection, ...filtered].slice(0, 15);

    setMostRecentlyUpdatedCollections(updated);

    // Persist to storage
    browser.storage.local
      .set({
        mostRecentlyUpdatedCollections: updated,
      })
      .catch((err) => {
        console.log(`error storing favorites: ${err}`);
      });
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

    // Get the selected collection to check for duplicate URLs
    const selectedCollection = findCollectionById(collections(), selectedId);
    if (!selectedCollection) {
      showErrorToast("Selected collection not found");
      return;
    }

    // Helper function to normalize URLs for comparison
    const normalizeUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        // Remove trailing slash and convert to lowercase for comparison
        // TODO: see if there is a better way to normalize URLs than regex
        return urlObj.href.replace(/\/$/, "").toLowerCase();
      } catch {
        // If URL parsing fails, return original URL for comparison
        return url.toLowerCase();
      }
    };

    // Get existing URLs in the selected collection
    const existingUrls = new Set(
      selectedCollection.items.map((item) => normalizeUrl(item.url)),
    );

    const bookmarks: CollectionBookmark[] = tabs
      .filter((tab) => {
        const tabUrl = tab.url || "";
        if (!tabUrl) return false;

        // Check if this URL already exists in the collection
        const normalizedTabUrl = normalizeUrl(tabUrl);
        return !existingUrls.has(normalizedTabUrl);
      })
      .map((tab) => {
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

    // If no bookmarks to add (all were duplicates), don't update storage
    if (bookmarks.length === 0) {
      return;
    }

    // Find and update the selected collection
    const updateCollections = (collections: Collection[]): Collection[] => {
      return collections.map((collection) => {
        if (collection.id === selectedId) {
          const newCollection = {
            ...collection,
            items: [...collection.items, ...bookmarks],
          };
          // if these items are in view update the list of bookmarks
          setBookmarkItems({
            title: newCollection.name,
            bookmarks: newCollection.items,
          });

          // Update most recently updated collections
          updateMostRecentlyUpdatedCollections({
            id: selectedId,
            name: collection.name,
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

  // TODO: see if this function is redundant with the above function, importCurrentTab
  const importTabToFavorite = async () => {
    const selectedId = selectedFavoriteId();
    if (!selectedId) {
      showErrorToast("Please select a favorite collection first");
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

    // Get the selected collection to check for duplicate URLs
    const selectedCollection = findCollectionById(collections(), selectedId);
    if (!selectedCollection) {
      showErrorToast("Selected collection not found");
      return;
    }

    // Helper function to normalize URLs for comparison
    const normalizeUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        // Remove trailing slash and convert to lowercase for comparison
        return urlObj.href.replace(/\/$/, "").toLowerCase();
      } catch {
        // If URL parsing fails, return original URL for comparison
        return url.toLowerCase();
      }
    };

    // Get existing URLs in the selected collection
    const existingUrls = new Set(
      selectedCollection.items.map((item) => normalizeUrl(item.url)),
    );

    const bookmarks: CollectionBookmark[] = tabs
      .filter((tab) => {
        const tabUrl = tab.url || "";
        if (!tabUrl) return false;

        // Check if this URL already exists in the collection
        const normalizedTabUrl = normalizeUrl(tabUrl);
        return !existingUrls.has(normalizedTabUrl);
      })
      .map((tab) => {
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

    // If no bookmarks to add (all were duplicates), don't update storage
    if (bookmarks.length === 0) {
      return;
    }

    // Find and update the selected collection
    const updateCollections = (collections: Collection[]): Collection[] => {
      return collections.map((collection) => {
        if (collection.id === selectedId) {
          const newCollection = {
            ...collection,
            items: [...collection.items, ...bookmarks],
          };
          // if these items are in view update the list of bookmarks
          setBookmarkItems({
            title: newCollection.name,
            bookmarks: newCollection.items,
          });

          // Update most recently updated collections
          updateMostRecentlyUpdatedCollections({
            id: selectedId,
            name: collection.name,
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

  const handleSelectFavorite = (favoriteId: string) => {
    setSelectedFavoriteId(favoriteId);
    // Clear collection selection when selecting favorite
    setSelectedCollectionId(undefined);

    // Find and display the favorite collection's bookmarks
    const selectedCollection = findCollectionById(collections(), favoriteId);
    if (selectedCollection) {
      setBookmarkItems({
        title: selectedCollection.name,
        bookmarks: selectedCollection.items,
      });
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
      // Clear favorite selection when selecting collection
      setSelectedFavoriteId(undefined);
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
            <div class="tabs tabs-lift flex w-[300px]">
              {/* Sidebar Content */}
              {/* Tab Navigation for Sidebar */}
              <input
                type="radio"
                class="tab"
                aria-label="Collections"
                checked={activeTab() === "collections"}
                onClick={() => setActiveTab("collections")}
              />
              <div class="tab-content bg-base-100 border-base-300">
                <Collections
                  collections={collections()}
                  selectedCollectionId={selectedCollectionId()}
                  onSelectCollection={handleSelectCollection}
                  onDeleteCollection={handleDeleteCollection}
                  path={[]}
                  setCurrentExpandedCollections={setCurrentExpandedCollections}
                  currentExpandedCollections={currentExpandedCollections()}
                />
              </div>

              <input
                type="radio"
                class="tab"
                aria-label="Favorites"
                checked={activeTab() === "favorites"}
                onClick={() => setActiveTab("favorites")}
              />
              <div class="tab-content bg-base-100 border-base-300">
                <Favorites
                  favorites={mostRecentlyUpdatedCollections()}
                  selectedFavoriteId={selectedFavoriteId()}
                  onSelectFavorite={handleSelectFavorite}
                />
              </div>
            </div>

            {/* Right panel that shows bookmarks and buttons */}
            <div class="flex flex-col flex-1 p-5 w-full h-full">
              <div class="flex flex-row mb-5 justify-evenly items-center">
                <AddCollectionButton onAddCollection={addNewCollection} />
                <ImportTabButton
                  selectedCollectionId={selectedCollectionId()}
                  selectedFavoriteId={selectedFavoriteId()}
                  onImportTab={importCurrentTab}
                  onImportTabToFavorite={importTabToFavorite}
                  activeTab={activeTab()}
                />
                <div class="dropdown dropdown-bottom dropdown-end">
                  <button tabIndex={0} class="btn btn-ghost m-1">
                    <img
                      src="/assets/horizontal-dots.svg"
                      alt="Extra Options"
                    />
                  </button>
                  <div
                    tabIndex={0}
                    class="dropdown-content card card-sm bg-base-100 z-1 w-64 shadow-md"
                  >
                    <button
                      onClick={() => setBrowserBookmarksOpen(true)}
                      class="btn btn-secondary"
                    >
                      <span class="text-sm">🔖</span>
                      Import Browser Bookmarks
                    </button>
                  </div>
                </div>
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
      <Show when={browserBookmarksOpen()}>
        <BrowserBookmarks
          onClose={() => setBrowserBookmarksOpen(false)}
          collections={collections()}
          onImportCollections={async (browserCollections: Collection[]) => {
            try {
              const mergedCollections = mergeBrowserBookmarks(
                collections(),
                browserCollections,
              );
              await updateAndStoreCollections(mergedCollections);

              // Count how many bookmarks were actually imported
              const totalBookmarks = browserCollections.reduce(
                (count, collection) => {
                  const countInCollection = (col: Collection): number => {
                    return (
                      col.items.length +
                      col.subcollections.reduce(
                        (subCount, sub) => subCount + countInCollection(sub),
                        0,
                      )
                    );
                  };
                  return count + countInCollection(collection);
                },
                0,
              );

              // Show success message
              // TODO: show success toast
              console.log(
                `Successfully imported ${totalBookmarks} bookmarks from browser`,
              );
              setBrowserBookmarksOpen(false);
            } catch (error) {
              console.error("Failed to import browser bookmarks:", error);
              showErrorToast(
                "Failed to import browser bookmarks. Please try again.",
              );
            }
          }}
        />
      </Show>
    </div>
  );
}
