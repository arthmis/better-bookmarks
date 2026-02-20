import { createSignal, Match, onMount, Show, Switch } from "solid-js";
import AddCollectionButton from "./components/AddCollectionButton";
import BackupBookmarks, {
  type RestoredBackupData,
} from "./components/BackupBookmarks";
import BrowserBookmarks from "./components/BrowserBookmarks";
import CollectionBookmarksComponent from "./components/CollectionBookmarks";
import ErrorToast, { showErrorToast } from "./components/ErrorToast";
import Favorites from "./components/Favorites";
import { ImportBackupSuccessView } from "./components/ImportBackup/ImportBackupSuccessView";
import { ImportBackupView } from "./components/ImportBackup/ImportBackupView";
import ImportTabButton from "./components/ImportTabButton";
import Collections from "./components/Collections";
import { bookmarksStore, dispatch } from "./Store/Collections";
import { FromWorkerMessage, searchWorker } from "./worker/worker_messages";
import { SearchResults } from "./components/SearchResults";

export default function App() {
  let backupFileInputRef: HTMLInputElement | undefined;

  // Detect if opened in a tab for backup import
  onMount(() => {
    // 1. Fetch from extension storage
    // handle being launched in a tab
    const params = new URLSearchParams(window.location.search);
    if (params.get("importBackup") === "true") {
      dispatch({
        type: "SET_IS_IMPORT_BACKUP_TAB",
        payload: true,
      });
      document.body.classList.add("in-tab");
    }
  });

  dispatch({ type: "LOAD_APP_STATE" });

  const [searchQuery, setSearchQuery] = createSignal("");

  const handleBackupFileSelect = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: RestoredBackupData = JSON.parse(text);

      // Validate the backup data
      if (!data.collections || !Array.isArray(data.collections)) {
        throw new Error("Invalid backup file format");
      }

      dispatch({
        type: "SET_BACKUP_DATA",
        payload: {
          backupData: data,
        },
      });
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
      <Show
        when={
          bookmarksStore.isImportBackupTab &&
          !bookmarksStore.backupData &&
          !bookmarksStore.importBackupDone
        }
      >
        <ImportBackupView openBackupFilePicker={openBackupFilePicker} />
      </Show>

      {/* Success state after merge in dedicated import tab */}
      <Show
        when={
          bookmarksStore.isImportBackupTab && bookmarksStore.importBackupDone
        }
      >
        <ImportBackupSuccessView openBackupFilePicker={openBackupFilePicker} />
      </Show>

      <Show when={!bookmarksStore.isImportBackupTab}>
        <Switch fallback={<div>Getting bookmarks</div>}>
          <Match when={bookmarksStore.fetchDataState.status === "success"}>
            <div class="flex w-full h-full">
              <div class="tabs tabs-lift flex w-[300px]">
                {/* Sidebar Content */}
                {/* Tab Navigation for Sidebar */}
                <input
                  type="radio"
                  class="tab"
                  aria-label="Collections"
                  checked={bookmarksStore.activeTab === "collections"}
                  onClick={() =>
                    dispatch({
                      type: "SET_ACTIVE_TAB",
                      payload: { activeTab: "collections" },
                    })
                  }
                />
                <Show when={bookmarksStore.activeTab === "collections"}>
                  <div class="tab-content bg-base-100 border-base-300">
                    <Collections
                      collections={bookmarksStore.collections}
                      selectedCollectionId={bookmarksStore.selectedCollectionId}
                      path={[]}
                      currentExpandedCollections={
                        bookmarksStore.currentExpandedCollections
                      }
                    />
                  </div>
                </Show>

                <input
                  type="radio"
                  class="tab"
                  aria-label="Favorites"
                  checked={bookmarksStore.activeTab === "favorites"}
                  onClick={() =>
                    dispatch({
                      type: "SET_ACTIVE_TAB",
                      payload: { activeTab: "favorites" },
                    })
                  }
                />
                <Show when={bookmarksStore.activeTab === "favorites"}>
                  <div class="tab-content bg-base-100 border-base-300">
                    <Favorites
                      favorites={bookmarksStore.mostRecentlyUpdatedCollections}
                      selectedFavoriteId={bookmarksStore.selectedFavoriteId}
                    />
                  </div>
                </Show>
              </div>

              {/* Right panel that shows bookmarks and buttons */}
              <div class="flex flex-col flex-1 p-5 w-full h-full">
                <div class="flex flex-col">
                  <div class="flex flex-row mb-5 justify-evenly items-center">
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
                          onClick={() => {
                            dispatch({
                              type: "LOAD_BROWSER_BOOKMARKS",
                            });
                          }}
                          class="btn"
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
                          class="btn"
                        >
                          <span class="text-sm">📂</span>
                          Import Backup File
                        </button>
                      </div>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        console.log("submitting", searchQuery());
                        searchWorker.postMessage({
                          type: "QUERY_SEARCH",
                          query: searchQuery(),
                        });
                      }}
                    >
                      <label class="input">
                        <svg
                          class="h-[1em] opacity-50"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <title>search icon</title>
                          <g
                            stroke-linejoin="round"
                            stroke-linecap="round"
                            stroke-width="2.5"
                            fill="none"
                            stroke="currentColor"
                          >
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.3-4.3"></path>
                          </g>
                        </svg>
                        <input
                          type="search"
                          placeholder="Search..."
                          class="w-full"
                          onInput={(e) =>
                            setSearchQuery((e.target as HTMLInputElement).value)
                          }
                        />
                      </label>
                    </form>
                    <ImportTabButton
                      selectedCollectionId={bookmarksStore.selectedCollectionId}
                      selectedFavoriteId={bookmarksStore.selectedFavoriteId}
                      activeTab={bookmarksStore.activeTab}
                    />
                  </div>
                </div>

                {!bookmarksStore.searchResults ? (
                  <CollectionBookmarksComponent
                    collection={bookmarksStore.collectionBookmarks}
                  />
                ) : (
                  <SearchResults results={bookmarksStore.searchResults} />
                )}
              </div>
            </div>
          </Match>
          <Match when={bookmarksStore.fetchDataState.status === "error"}>
            <h1>Error fetching bookmarks</h1>
          </Match>
          <Match when={bookmarksStore.fetchDataState.status === "pending"}>
            <h1>Loading bookmarks...</h1>
          </Match>
        </Switch>
      </Show>
      <ErrorToast />
      <Show when={bookmarksStore.importBrowserBookmarks.browserBookmarksOpen}>
        <BrowserBookmarks />
      </Show>
      <Show when={bookmarksStore.backupData} keyed>
        {(data) => <BackupBookmarks backupData={data} />}
      </Show>
    </div>
  );
}
