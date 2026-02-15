import { describe, expect, it } from "vitest";
import { AppState, createStateStore, handleEvent } from "./Collections";
import { Collection } from "../components/StateStore";
import { CollectionBookmark } from "../components/CollectionBookmarks";

describe("Store", () => {
  it("should add new collection with effect", async () => {
    const store = createStateStore();
    const now = new Date();
    const newCollection = {
      name: "New Collection",
      collectionId: "new-collection-id",
      createdAt: now,
      updatedAt: now,
    };

    const effect = handleEvent(
      {
        type: "INSERT_COLLECTION",
        payload: newCollection,
      },
      store,
    );

    const insertedCollection: Collection = {
      id: newCollection.collectionId,
      name: newCollection.name,
      items: [],
      subcollections: [],
      createdAt: now,
      updatedAt: now,
    };

    expect(effect?.type).toEqual("SET_COLLECTIONS");
    expect(store.bookmarksStore.collections).toEqual([insertedCollection]);
    expect(store.bookmarksStore.collections.length).toBe(1);
    expect(store.bookmarksStore.collections).toEqual([insertedCollection]);
  });

  it("should select collection without effect", async () => {
    const now = new Date();
    const items: CollectionBookmark[] = [
      {
        id: "existing-bookmark-id",
        title: "Existing Bookmark",
        url: "https://example.com",
        iconUrl: "https://example.com/icon.png",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const collections = [
      {
        id: "existing-collection-id",
        name: "Existing Collection",
        items: items,
        subcollections: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "another-collection-id",
        name: "Another Collection",
        items: [],
        subcollections: [],
        createdAt: now,
        updatedAt: now,
      },
    ];
    const initialState = createInitialState({
      collections,
    });

    const store = createStateStore(initialState);

    const selectEffect = handleEvent(
      {
        type: "SELECT_COLLECTION",
        payload: {
          collectionId: collections[0].id,
          currentExpandedCollections: [collections[0].id],
        },
      },
      store,
    );

    expect(selectEffect?.type).toBeUndefined();
    expect(store.bookmarksStore.selectedCollectionId).toEqual(
      collections[0].id,
    );
    expect(store.bookmarksStore.collectionBookmarks).toEqual({
      title: collections[0].name,
      bookmarks: collections[0].items,
    });
    expect(store.bookmarksStore.currentExpandedCollections).toEqual([
      collections[0].id,
    ]);
  });

  it("should deselect collection", async () => {
    const now = new Date();
    const items: CollectionBookmark[] = [
      {
        id: "existing-bookmark-id",
        title: "Existing Bookmark",
        url: "https://example.com",
        iconUrl: "https://example.com/icon.png",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const collections = [
      {
        id: "existing-collection-id",
        name: "Existing Collection",
        items: items,
        subcollections: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "another-collection-id",
        name: "Another Collection",
        items: [],
        subcollections: [],
        createdAt: now,
        updatedAt: now,
      },
    ];
    const initialState = createInitialState({
      collections,
      selectedCollectionId: collections[0].id,
    });

    const store = createStateStore(initialState);

    const selectEffect = handleEvent(
      {
        type: "SELECT_COLLECTION",
        payload: {
          collectionId: collections[0].id,
          currentExpandedCollections: [collections[0].id],
        },
      },
      store,
    );

    expect(selectEffect?.type).toBeUndefined();
    expect(store.bookmarksStore.selectedCollectionId).toBeUndefined;
    expect(store.bookmarksStore.collectionBookmarks).toEqual({
      title: "",
      bookmarks: [],
    });
    expect(store.bookmarksStore.currentExpandedCollections).toEqual([]);
  });

  it("should select another collection", async () => {
    const now = new Date();
    const items: CollectionBookmark[] = [
      {
        id: "existing-bookmark-id",
        title: "Existing Bookmark",
        url: "https://example.com",
        iconUrl: "https://example.com/icon.png",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const collections = [
      {
        id: "existing-collection-id",
        name: "Existing Collection",
        items: items,
        subcollections: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "another-collection-id",
        name: "Another Collection",
        items: [],
        subcollections: [],
        createdAt: now,
        updatedAt: now,
      },
    ];
    const initialState = createInitialState({
      collections,
      selectedCollectionId: collections[0].id,
    });

    const store = createStateStore(initialState);

    const selectEffect = handleEvent(
      {
        type: "SELECT_COLLECTION",
        payload: {
          collectionId: collections[1].id,
          currentExpandedCollections: [collections[1].id],
        },
      },
      store,
    );

    expect(selectEffect?.type).toBeUndefined();
    expect(store.bookmarksStore.selectedCollectionId).toEqual(
      collections[1].id,
    );
    expect(store.bookmarksStore.collectionBookmarks).toEqual({
      title: "Another Collection",
      bookmarks: [],
    });
    expect(store.bookmarksStore.currentExpandedCollections).toEqual([
      collections[1].id,
    ]);
  });

  it("should select a nested collection", async () => {
    const now = new Date();
    const items: CollectionBookmark[] = [
      {
        id: "1",
        title: "Bookmark 1",
        url: "https://example.com",
        createdAt: now,
        updatedAt: now,
        iconUrl: "https://example.com/icon.png",
      },
    ];

    const subcollections: Collection[] = [
      {
        id: "3",
        name: "Subcollection 1",
        createdAt: now,
        updatedAt: now,
        items: [],
        subcollections: [
          {
            id: "4",
            name: "Subcollection 2",
            createdAt: now,
            updatedAt: now,
            items: [],
            subcollections: [],
          },
        ],
      },
    ];

    const collections: Collection[] = [
      {
        id: "1",
        name: "Collection 1",
        createdAt: now,
        updatedAt: now,
        items: items,
        subcollections,
      },
      {
        id: "2",
        name: "Another Collection",
        createdAt: now,
        updatedAt: now,
        items: [],
        subcollections: [],
      },
    ];

    const initialState = createInitialState({
      collections,
      selectedCollectionId: collections[0].id,
    });

    const store = createStateStore(initialState);

    const selectEffect = handleEvent(
      {
        type: "SELECT_COLLECTION",
        payload: {
          collectionId: "4",
          currentExpandedCollections: ["1", "3", "4"],
        },
      },
      store,
    );

    expect(selectEffect?.type).toBeUndefined();
    expect(store.bookmarksStore.selectedCollectionId).toEqual("4");
    expect(store.bookmarksStore.collectionBookmarks).toEqual({
      title: "Subcollection 2",
      bookmarks: [],
    });
    expect(store.bookmarksStore.currentExpandedCollections).toEqual([
      "1",
      "3",
      "4",
    ]);
  });

  it("should handle DELETE_BOOKMARK", async () => {
    const now = new Date();
    const collections: Collection[] = [
      {
        id: "1",
        name: "Collection 1",
        createdAt: now,
        updatedAt: now,
        items: [
          {
            id: "2",
            title: "Bookmark 2",
            url: "https://example.com/bookmark2",
            createdAt: now,
            updatedAt: now,
            iconUrl: "https://example.com/icon2.png",
          },
          {
            id: "3",
            title: "Bookmark 3",
            url: "https://example.com/bookmark3",
            createdAt: now,
            updatedAt: now,
            iconUrl: "https://example.com/icon3.png",
          },
        ],
        subcollections: [],
      },
    ];
    const initialState = createInitialState({
      collections,
      selectedCollectionId: "1",
    });

    const store = createStateStore(initialState);

    const deleteBookmarkEffect = handleEvent(
      {
        type: "DELETE_BOOKMARK",
        payload: {
          bookmarkId: "2",
        },
      },
      store,
    );

    expect(deleteBookmarkEffect?.type).toEqual("SET_COLLECTIONS");
    expect(store.bookmarksStore.collections[0]).toEqual({
      id: "1",
      name: "Collection 1",
      createdAt: now,
      updatedAt: now,
      items: [
        {
          id: "3",
          title: "Bookmark 3",
          url: "https://example.com/bookmark3",
          createdAt: now,
          updatedAt: now,
          iconUrl: "https://example.com/icon3.png",
        },
      ],
      subcollections: [],
    });
    expect(store.bookmarksStore.collections.length).toEqual(1);
  });

  it("should handle nested DELETE_BOOKMARK", async () => {
    const now = new Date();
    const collections: Collection[] = [
      {
        id: "1",
        name: "Collection 1",
        createdAt: now,
        updatedAt: now,
        items: [
          {
            id: "2",
            title: "Bookmark 2",
            url: "https://example.com/bookmark2",
            createdAt: now,
            updatedAt: now,
            iconUrl: "https://example.com/icon2.png",
          },
          {
            id: "3",
            title: "Bookmark 3",
            url: "https://example.com/bookmark3",
            createdAt: now,
            updatedAt: now,
            iconUrl: "https://example.com/icon3.png",
          },
        ],
        subcollections: [
          {
            id: "4",
            name: "Subcollection 1",
            createdAt: now,
            updatedAt: now,
            items: [
              {
                id: "5",
                title: "Bookmark 5",
                url: "https://example.com/bookmark5",
                createdAt: now,
                updatedAt: now,
                iconUrl: "https://example.com/icon5.png",
              },
            ],
            subcollections: [
              {
                id: "6",
                name: "Subsubcollection 1",
                createdAt: now,
                updatedAt: now,
                items: [
                  {
                    id: "7",
                    title: "Bookmark 7",
                    url: "https://example.com/bookmark7",
                    createdAt: now,
                    updatedAt: now,
                    iconUrl: "https://example.com/icon7.png",
                  },
                ],
                subcollections: [],
              },
            ],
          },
        ],
      },
    ];
    const initialState = createInitialState({
      collections,
      selectedCollectionId: "6",
    });

    const store = createStateStore(initialState);

    const deleteBookmarkEffect = handleEvent(
      {
        type: "DELETE_BOOKMARK",
        payload: {
          bookmarkId: "7",
        },
      },
      store,
    );

    expect(deleteBookmarkEffect?.type).toEqual("SET_COLLECTIONS");
    expect(
      store.bookmarksStore.collections[0].subcollections[0].subcollections[0],
    ).toEqual({
      id: "6",
      name: "Subsubcollection 1",
      createdAt: now,
      updatedAt: now,
      items: [],
      subcollections: [],
    });
    expect(store.bookmarksStore.collections[0]).toEqual({
      id: "1",
      name: "Collection 1",
      createdAt: now,
      updatedAt: now,
      items: [
        {
          id: "2",
          title: "Bookmark 2",
          url: "https://example.com/bookmark2",
          createdAt: now,
          updatedAt: now,
          iconUrl: "https://example.com/icon2.png",
        },
        {
          id: "3",
          title: "Bookmark 3",
          url: "https://example.com/bookmark3",
          createdAt: now,
          updatedAt: now,
          iconUrl: "https://example.com/icon3.png",
        },
      ],
      subcollections: [
        {
          id: "4",
          name: "Subcollection 1",
          createdAt: now,
          updatedAt: now,
          items: [
            {
              id: "5",
              title: "Bookmark 5",
              url: "https://example.com/bookmark5",
              createdAt: now,
              updatedAt: now,
              iconUrl: "https://example.com/icon5.png",
            },
          ],
          subcollections: [
            {
              id: "6",
              name: "Subsubcollection 1",
              createdAt: now,
              updatedAt: now,
              items: [],
              subcollections: [],
            },
          ],
        },
      ],
    });
  });
});

function createInitialState(overrides: Partial<AppState>): AppState {
  const defaultState: AppState = {
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

  return {
    ...defaultState,
    ...overrides,
  };
}

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
