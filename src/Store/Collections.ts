import { createStore } from "solid-js/store";
import type { ParsedBackupData } from "../components/BackupBookmarks";
import type { CollectionBookmarks } from "../components/CollectionBookmarks";
import type { Favorite } from "../components/Favorites";
import type { Collection } from "../components/StateStore";
import { handleEffect } from "./Effects";
import { type AppEvent, handleEvent } from "./Events";

export interface CollectionFetchState {
  status: "pending" | "success" | "error";
  data?: Collection[];
  error?: Error;
}

export interface AppState {
  collections: Collection[];
  selectedCollectionId: string | undefined;
  selectedFavoriteId: string | undefined;
  activeTab: ActiveTab;
  collectionBookmarks: CollectionBookmarks;
  fetchDataState: CollectionFetchState;
  currentExpandedCollections: string[];
  browserBookmarksOpen: boolean;
  backupData: ParsedBackupData | undefined;
  isImportBackupTab: boolean;
  importBackupDone: boolean;
  backupFileInputRef: HTMLInputElement | undefined;
  mostRecentlyUpdatedCollections: Favorite[];
  importBrowserBookmarks: ImportBrowserBookmarks;
  searchResults: {
    title: string;
    url: string;
  }[];
}

export type ActiveTab = "collections" | "favorites";

export function createStateStore(initialState?: AppState) {
  const storeState: AppState = {
    collections: [],
    selectedCollectionId: undefined,
    selectedFavoriteId: undefined,
    activeTab: "collections",
    collectionBookmarks: {
      title: "",
      bookmarks: [],
    },
    fetchDataState: { status: "pending", data: undefined, error: undefined },
    currentExpandedCollections: [],
    browserBookmarksOpen: false,
    backupData: undefined,
    isImportBackupTab: false,
    importBackupDone: false,
    backupFileInputRef: undefined,
    mostRecentlyUpdatedCollections: [],
    importBrowserBookmarks: {
      isImporting: false,
      collections: [],
      currentExpandedCollections: new Set<string>(),
      browserBookmarksOpen: false,
    },
    searchResults: [],
  };
  let state: AppState;

  if (initialState) {
    state = {
      ...storeState,
      ...initialState,
    };
  } else {
    state = storeState;
  }

  const [bookmarksStore, setBookmarksStore] = createStore<AppState>(state);

  return { bookmarksStore, setBookmarksStore };
}
const { bookmarksStore, setBookmarksStore } = createStateStore();

export interface ImportBrowserBookmarks {
  isImporting: boolean;
  collections: Collection[];
  currentExpandedCollections: Set<string>;
  browserBookmarksOpen: boolean;
}

export interface BackupState {
  merging: boolean;
}

export function dispatch(
  event: AppEvent,
  storeInstance?: ReturnType<typeof createStateStore>,
) {
  const effect = handleEvent(event, storeInstance);
  if (effect) {
    handleEffect(effect, storeInstance);
  }
}

// Helper function to normalize URLs for comparison

export { bookmarksStore, setBookmarksStore };
