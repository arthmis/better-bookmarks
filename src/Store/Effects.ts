import { Favorite } from "../components/Favorites";
import type { Collection } from "../components/StateStore";

export type SET_COLLECTIONS = {
  type: "SET_COLLECTIONS";
  payload: {
    collections: Collection[];
    favorites?: Favorite[];
  };
};

export type IMPORT_CURRENT_TABS = {
  type: "IMPORT_CURRENT_TABS";
  payload: {
    collectionId: string;
  };
};

export type LOAD_APP_STATE = {
  type: "LOAD_APP_STATE";
};

export type Effect = SET_COLLECTIONS | IMPORT_CURRENT_TABS | LOAD_APP_STATE;
