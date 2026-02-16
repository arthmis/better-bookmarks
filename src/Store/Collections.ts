import { createStore } from "solid-js/store";
import type {
  ParsedBackupData,
  RestoredBackupData,
} from "../components/BackupBookmarks";
import type {
  CollectionBookmark,
  CollectionBookmarks,
} from "../components/CollectionBookmarks";
import type { Favorite } from "../components/Favorites";
import type { BackupCollection, Collection } from "../components/StateStore";
import { type Effect, handleEffect } from "./Effects";
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

export function dispatch(
  event: AppEvent,
  storeInstance?: ReturnType<typeof createStateStore>,
) {
  const effect = handleEvent(event, storeInstance);
  if (effect) {
    handleEffect(effect, storeInstance);
  }
}

export function mapBackupDatesToJavascriptDate(
  backupData: RestoredBackupData,
): ParsedBackupData {
  const mapCollections = (backupCollection: BackupCollection): Collection => {
    const collectionBookmarks: CollectionBookmark[] =
      backupCollection.items.map((bookmark) => {
        const createdAt = new Date(Date.parse(bookmark.createdAt));
        const updatedAt = new Date(Date.parse(bookmark.updatedAt));
        return { ...bookmark, createdAt, updatedAt };
      });

    const subcollections = backupCollection.subcollections.map(mapCollections);
    const createdAt = new Date(Date.parse(backupCollection.createdAt));
    const updatedAt = new Date(Date.parse(backupCollection.updatedAt));
    return {
      ...backupCollection,
      items: collectionBookmarks,
      subcollections,
      createdAt,
      updatedAt,
    };
  };
  const parsedCollections = backupData.collections.map(mapCollections);

  return {
    ...backupData,
    collections: parsedCollections,
  };
}

// Helper function to normalize URLs for comparison

export { bookmarksStore, setBookmarksStore };
