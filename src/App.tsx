import { createSignal, Match, onMount, Show, Switch } from "solid-js";
import type { BackgroundScriptResponse } from "./background_script_types";
import {
  CollectionFetchState,
  findCollectionById,
  mapBackupDatesToJavascriptDate,
  mergeCollections,
  normalizeUrl,
} from "./Store/Collections";
import AddCollectionButton from "./components/AddCollectionButton";
import BackupBookmarks, {
  type BackupData,
  type ParsedBackupData,
} from "./components/BackupBookmarks";
import BrowserBookmarks from "./components/BrowserBookmarks";
import CollectionBookmarksComponent, {
  type CollectionBookmark,
  type CollectionBookmarks,
} from "./components/CollectionBookmarks";
import Collections, { type Collection } from "./components/StateStore";
import ErrorToast, { showErrorToast } from "./components/ErrorToast";
import Favorites, { Favorite } from "./components/Favorites";
import ImportTabButton from "./components/ImportTabButton";
import { generateId } from "./utils";
import { ImportBackupView } from "./components/ImportBackup/ImportBackupView";
import { ImportBackupSuccessView } from "./components/ImportBackup/ImportBackupSuccessView";

export default function App() {
  const [selectedCollectionId, setSelectedCollectionId] = createSignal<
    string | undefined
  >();
  const [selectedFavoriteId, setSelectedFavoriteId] = createSignal<
    string | undefined
  >();
  const [activeTab, setActiveTab] = createSignal<"collections" | "favorites">(
    "collections",
  );

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
  const [backupData, setBackupData] = createSignal<ParsedBackupData | null>(
    null,
  );
  const [isImportBackupTab, setIsImportBackupTab] = createSignal(false);
  const [importBackupDone, setImportBackupDone] = createSignal(false);
  let backupFileInputRef: HTMLInputElement | undefined;
  const [mostRecentlyUpdatedCollections, setMostRecentlyUpdatedCollections] =
    createSignal<Favorite[]>([]);

  // Detect if opened in a tab for backup import
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("importBackup") === "true") {
      setIsImportBackupTab(true);
      document.body.classList.add("in-tab");
      // Wait for the DOM to settle, then auto-click the file input
      setTimeout(() => {
        backupFileInputRef?.click();
      }, 500);
    }
  });

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

  // Function to merge browser bookmarks with existing collections

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
        selectedCollectionId(),
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
        console.error(error);
        showErrorToast("Failed to add or update collection. Please try again.");
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
        console.error(`error storing favorites: ${err}`);
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
    const selectedId =
      activeTab() === "collections"
        ? selectedCollectionId()
        : selectedFavoriteId();
    if (!selectedId) {
      // TODO: Implement logic to create a new collection if none is selected
      showErrorToast("Please select a collection first");
      return;
    }

    let tabs: browser.tabs.Tab[] | undefined;
    try {
      tabs = await getSelectedTabs();
    } catch (error) {
      console.error(error);
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
        const title = tab.title || "";
        const url = tab.url || "";
        const iconUrl = tab.favIconUrl || undefined;

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
      await autoExportBackup();
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
        const idIndex = currentExpandedCollections().indexOf(collectionId);
        setCurrentExpandedCollections(
          currentExpandedCollections().toSpliced(idIndex),
        );
      }
    } catch (error) {
      console.error(error);
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
      const idIndex = currentExpandedCollections.indexOf(collection.id);
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
      console.log(collectionBookmarks());
    }
  };

  const exportBackup = async () => {
    try {
      const data = {
        collections: collections(),
        mostRecentlyUpdatedCollections: mostRecentlyUpdatedCollections(),
        exportDate: new Date().toISOString(),
        version: "1.2.0",
      };

      const json = JSON.stringify(data, null, 2);
      const filename = `better-bookmarks-backup-${new Date().toISOString().split("T")[0]}.json`;

      const response: BackgroundScriptResponse =
        await browser.runtime.sendMessage({
          type: "export-backup",
          payload: { json, filename },
        });

      if (!response.success) {
        console.error(response.error);
        showErrorToast("Failed to export backup. Please try again.");
      }
    } catch (error) {
      console.error("Failed to export backup:", error);
      showErrorToast("Failed to export backup. Please try again.");
    }
  };

  const autoExportBackup = async () => {
    try {
      const data = {
        collections: collections(),
        mostRecentlyUpdatedCollections: mostRecentlyUpdatedCollections(),
        exportDate: new Date().toISOString(),
        version: "1.2.0",
      };

      const json = JSON.stringify(data, null, 2);
      const filename = `better-bookmarks-backup-${new Date().toISOString().split("T")[0]}.json`;

      const response: BackgroundScriptResponse =
        await browser.runtime.sendMessage({
          type: "auto-export-backup",
          payload: { json, filename },
        });

      if (!response.success) {
        console.error("Auto-backup failed:", response.error);
      }
    } catch (error) {
      console.error("Auto-backup failed:", error);
    }
  };

  const handleBackupFileSelect = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: BackupData = JSON.parse(text);

      // Validate the backup data
      if (!data.collections || !Array.isArray(data.collections)) {
        throw new Error("Invalid backup file format");
      }
      const parsedBackupData = mapBackupDatesToJavascriptDate(data);

      setBackupData(parsedBackupData);
    } catch (error) {
      console.error("Failed to read backup file:", error);
      showErrorToast(
        "Failed to read backup file. Please check the file and try again.",
      );
    } finally {
      // Reset the file input so the same file can be selected again
      if (backupFileInputRef) {
        backupFileInputRef.value = "";
      }
    }
  };

  const openBackupFilePicker = () => {
    backupFileInputRef?.click();
  };

  const mergeBackupData = async (data: ParsedBackupData) => {
    try {
      const mergedCollections = mergeCollections(
        collections(),
        data.collections,
      );
      await updateAndStoreCollections(mergedCollections);

      if (data.mostRecentlyUpdatedCollections) {
        const currentFavorites = mostRecentlyUpdatedCollections();
        const mergedFavorites = [...currentFavorites];

        for (const fav of data.mostRecentlyUpdatedCollections) {
          if (!mergedFavorites.some((f) => f.id === fav.id)) {
            mergedFavorites.push(fav);
          }
        }

        setMostRecentlyUpdatedCollections(mergedFavorites);
        await browser.storage.local.set({
          mostRecentlyUpdatedCollections: mergedFavorites,
        });
      }

      // Clear selections
      setSelectedCollectionId(undefined);
      setSelectedFavoriteId(undefined);
      setBookmarkItems({ title: "", bookmarks: [] });

      console.log("Successfully merged backup data");
      await autoExportBackup();
      setBackupData(null);

      // If we're in the dedicated import backup tab, show success state
      if (isImportBackupTab()) {
        setImportBackupDone(true);
      }
    } catch (error) {
      console.error("Failed to merge backup:", error);
      showErrorToast("Failed to merge backup. Please try again.");
    }
  };

  return (
    // firefox web extension can only grow up to 800px wide by 600px high
    <div class="h-full flex w-full">
      <input
        type="file"
        accept="application/json,.json"
        ref={backupFileInputRef}
        class="hidden"
        onChange={handleBackupFileSelect}
      />

      {/* When opened in a dedicated tab for backup import and no file selected yet / merge done */}
      <Show when={isImportBackupTab() && !backupData() && !importBackupDone()}>
        <ImportBackupView openBackupFilePicker={openBackupFilePicker} />
      </Show>

      {/* Success state after merge in dedicated import tab */}
      <Show when={isImportBackupTab() && importBackupDone()}>
        <ImportBackupSuccessView
          setImportBackupDone={setImportBackupDone}
          openBackupFilePicker={openBackupFilePicker}
        />
      </Show>

      <Show when={!isImportBackupTab()}>
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
                <Show when={activeTab() === "collections"}>
                  <div class="tab-content bg-base-100 border-base-300">
                    <Collections
                      collections={collections()}
                      selectedCollectionId={selectedCollectionId()}
                      onSelectCollection={handleSelectCollection}
                      onDeleteCollection={handleDeleteCollection}
                      path={[]}
                      setCurrentExpandedCollections={
                        setCurrentExpandedCollections
                      }
                      currentExpandedCollections={currentExpandedCollections()}
                    />
                  </div>
                </Show>

                <input
                  type="radio"
                  class="tab"
                  aria-label="Favorites"
                  checked={activeTab() === "favorites"}
                  onClick={() => setActiveTab("favorites")}
                />
                <Show when={activeTab() === "favorites"}>
                  <div class="tab-content bg-base-100 border-base-300">
                    <Favorites
                      favorites={mostRecentlyUpdatedCollections()}
                      selectedFavoriteId={selectedFavoriteId()}
                      onSelectFavorite={handleSelectFavorite}
                    />
                  </div>
                </Show>
              </div>

              {/* Right panel that shows bookmarks and buttons */}
              <div class="flex flex-col flex-1 p-5 w-full h-full">
                <div class="flex flex-row mb-5 justify-evenly items-center">
                  <AddCollectionButton onAddCollection={addNewCollection} />
                  <ImportTabButton
                    selectedCollectionId={selectedCollectionId()}
                    selectedFavoriteId={selectedFavoriteId()}
                    onImportTab={importCurrentTab}
                    onImportTabToFavorite={importCurrentTab}
                    activeTab={activeTab()}
                  />
                  <div class="dropdown dropdown-bottom dropdown-end">
                    <button type="button" class="btn btn-ghost m-1">
                      <img
                        src="/assets/horizontal-dots.svg"
                        alt="Extra Options"
                      />
                    </button>
                    <div class="dropdown-content card card-sm bg-base-100 z-1 w-64 shadow-md flex flex-col gap-2 p-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await exportBackup();
                        }}
                        class="btn btn-primary"
                      >
                        <span class="text-sm">💾</span>
                        Export Backup
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrowserBookmarksOpen(true)}
                        class="btn btn-secondary"
                      >
                        <span class="text-sm">🔖</span>
                        Import Browser Bookmarks
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Open the extension in a new tab with importBackup flag
                          // because the popup closes when a file dialog opens
                          const extensionUrl = browser.runtime.getURL(
                            "index.html?importBackup=true",
                          );
                          browser.tabs.create({ url: extensionUrl });
                        }}
                        class="btn btn-secondary"
                      >
                        <span class="text-sm">📂</span>
                        Import Backup File
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
      </Show>
      <ErrorToast />
      <Show when={browserBookmarksOpen()}>
        <BrowserBookmarks
          onClose={() => setBrowserBookmarksOpen(false)}
          collections={collections()}
          onImportCollections={async (browserCollections: Collection[]) => {
            try {
              const mergedCollections = mergeCollections(
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
      <Show when={backupData()} keyed>
        {(data) => (
          <BackupBookmarks
            onClose={() => setBackupData(null)}
            backupData={data}
            onMergeBackup={mergeBackupData}
          />
        )}
      </Show>
    </div>
  );
}
