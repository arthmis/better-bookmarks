import type { Collection } from "../components/StateStore";

export type SET_COLLECTIONS = {
  type: "SET_COLLECTIONS";
  payload: Collection[];
};

export type IMPORT_CURRENT_TABS = {
  type: "IMPORT_CURRENT_TABS";
  payload: {
    collectionId: string;
  };
};

export type Effect = SET_COLLECTIONS | IMPORT_CURRENT_TABS;
