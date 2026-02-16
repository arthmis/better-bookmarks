import type { BackgroundScriptResponse } from "../background_script_types";
import type { BackupData } from "../components/BackupBookmarks";
import type { Favorite } from "../components/Favorites";
import type { Collection } from "../components/StateStore";
import {
  bookmarksStore,
  type createStateStore,
  setBookmarksStore,
} from "./Collections";
import { handleEvent } from "./Events";

export type SET_COLLECTIONS = {
  type: "SET_COLLECTIONS";
  payload: {
    collections: Collection[];
    favorites?: Favorite[];
    backupData?: BackupData;
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

async function handleEffect(
  effect: Effect,
  storeInstance?: ReturnType<typeof createStateStore>,
): Promise<void> {
  const store = storeInstance ?? { bookmarksStore, setBookmarksStore };
  switch (effect.type) {
    case "SET_COLLECTIONS": {
      const { collections, favorites, backupData } = effect.payload;
      try {
        await browser.storage.local.set({ collections });

        if (favorites) {
          await browser.storage.local
            .set({
              mostRecentlyUpdatedCollections: favorites,
            })
            .catch((err) => {
              console.error(`error storing favorites: ${err}`);
            });
        }
      } catch (error) {
        // todo send the error to state
        console.error("Failed to set collections:", error);
      }

      if (backupData) {
        try {
          await exportBackup(backupData);
        } catch (error) {
          console.error("Auto-backup failed:", error);
        }
      }
      break;
    }
    case "IMPORT_CURRENT_TABS": {
      const tabs = await browser.tabs.query({
        currentWindow: true,
        highlighted: true,
      });

      const setCollectionsEffect = handleEvent(
        {
          type: "IMPORT_TABS",
          payload: {
            tabs,
            collectionId: effect.payload.collectionId,
          },
        },
        store,
      );

      if (
        setCollectionsEffect &&
        setCollectionsEffect.type === "SET_COLLECTIONS"
      ) {
        const { collections, favorites, backupData } =
          setCollectionsEffect.payload;
        await browser.storage.local.set({
          collections: collections,
        });

        if (favorites) {
          await browser.storage.local
            .set({
              mostRecentlyUpdatedCollections: favorites,
            })
            .catch((err) => {
              console.error(`error storing favorites: ${err}`);
            });
        }

        if (backupData) {
          try {
            await exportBackup(backupData);
          } catch (error) {
            console.error("Auto-backup failed:", error);
          }
        }
      }
      break;
    }
    case "LOAD_APP_STATE": {
      try {
        const data = await browser.storage.local.get([
          "collections",
          "mostRecentlyUpdatedCollections",
        ]);
        handleEvent(
          {
            type: "INITIALIZE_APP_STATE",
            payload: {
              collections: data.collections || [],
              mostRecentlyUpdatedCollections:
                data.mostRecentlyUpdatedCollections || [],
              fetchState: {
                status: "success",
              },
            },
          },
          store,
        );
      } catch (error) {
        console.error(error);
        // setFetchDataState({
        //   status: "error",
        //   error: new Error("Failed to fetch collections"),
      }
      break;
    }
  }
}

export async function exportBackup(
  backupData: BackupData,
): Promise<BackgroundScriptResponse> {
  const { collections, mostRecentlyUpdatedCollections, exportDate, version } =
    backupData;
  const data = {
    collections: collections,
    mostRecentlyUpdatedCollections: mostRecentlyUpdatedCollections,
    exportDate,
    version,
  };

  try {
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
    return response;
  } catch (error) {
    console.error("Auto-backup failed:", error);
    return Promise.reject({ success: false, error });
  }
}

export type Effect = SET_COLLECTIONS | IMPORT_CURRENT_TABS | LOAD_APP_STATE;
export { handleEffect };
