import { describe, expect, it } from "vitest";
import { createStateStore, handleEvent } from "./Collections";
import { Collection } from "../components/StateStore";
import { insert } from "solid-js/web";

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
});
