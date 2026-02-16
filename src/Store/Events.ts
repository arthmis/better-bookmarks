import { Favorite } from "../components/Favorites";
import { Collection } from "../components/StateStore";
import { CollectionFetchState } from "./Collections";
import type { ActiveTab } from "./Collections";

export type INSERT_COLLECTION = {
  type: "INSERT_COLLECTION";
  payload: {
    name: string;
    collectionId: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GET_CURRENT_TABS = {
  type: "GET_CURRENT_TABS";
};

export type IMPORT_TABS = {
  type: "IMPORT_TABS";
  payload: {
    tabs: browser.tabs.Tab[];
    collectionId: string;
  };
};

export type SELECT_COLLECTION = {
  type: "SELECT_COLLECTION";
  payload: {
    collectionId: string;
    currentExpandedCollections: string[];
  };
};

export type DELETE_BOOKMARK = {
  type: "DELETE_BOOKMARK";
  payload: {
    bookmarkId: string;
  };
};

export type LOAD_APP_STATE = {
  type: "LOAD_APP_STATE";
};

export type INITIALIZE_APP_STATE = {
  type: "INITIALIZE_APP_STATE";
  payload: {
    collections: Collection[];
    mostRecentlyUpdatedCollections: Favorite[];
    fetchState: CollectionFetchState;
  };
};

export type SET_ACTIVE_TAB = {
  type: "SET_ACTIVE_TAB";
  payload: {
    activeTab: ActiveTab;
  };
};

export type SELECT_FAVORITE = {
  type: "SELECT_FAVORITE";
  payload: {
    favoriteId: string;
  };
};

export type DELETE_COLLECTION = {
  type: "DELETE_COLLECTION";
  payload: {
    collectionId: string;
  };
};

export type AppEvent =
  | INSERT_COLLECTION
  | SELECT_COLLECTION
  | DELETE_BOOKMARK
  | GET_CURRENT_TABS
  | IMPORT_TABS
  | LOAD_APP_STATE
  | INITIALIZE_APP_STATE
  | SET_ACTIVE_TAB
  | SELECT_FAVORITE
  | DELETE_COLLECTION;
