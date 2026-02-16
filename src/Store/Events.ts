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

export type AppEvent =
  | INSERT_COLLECTION
  | SELECT_COLLECTION
  | DELETE_BOOKMARK
  | GET_CURRENT_TABS
  | IMPORT_TABS;
