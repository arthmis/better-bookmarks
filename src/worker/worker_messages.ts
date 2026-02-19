import { dispatch } from "../Store/Collections";

type QueryMessage = {
  type: "QUERY_SEARCH";
  query: string;
};

type BuildIndex = {
  type: "BUILD_INDEX";
  data: Uint8Array;
};

type AddBookmarks = {
  type: "ADD_BOOKMARKS";
  data: Uint8Array;
};

type RemoveBookmarks = {
  type: "REMOVE_BOOKMARKS";
  id: string;
};

export type FromAppMessage =
  | QueryMessage
  | BuildIndex
  | AddBookmarks
  | RemoveBookmarks;

type WorkerReady = {
  type: "WORKER_READY";
};
type SearchResults = {
  type: "SEARCH_RESULTS";
  results: Uint8Array;
};

export type FromWorkerMessage = WorkerReady | SearchResults;

const searchWorker = new Worker(
  new URL("../search.worker.ts", import.meta.url),
  {
    type: "module",
  },
);

searchWorker.addEventListener(
  "message",
  (event: MessageEvent<FromWorkerMessage>) => {
    console.log(event);

    if (event.data.type === "WORKER_READY") {
      dispatch({
        type: "LOAD_SEARCH_INDEX",
      });
    }

    if (event.data.type === "SEARCH_RESULTS") {
      const decoder = new TextDecoder();
      if (event.data.results.length === 0) {
        dispatch({
          type: "SEARCH_RESULTS",
          payload: {
            results: [],
          },
        });
        return;
      }
      const stringResults = decoder.decode(event.data.results);
      const results = stringResults.split("\n").map((line) => {
        const [title, url] = line.split("\0");
        return { title, url };
      });
      dispatch({
        type: "SEARCH_RESULTS",
        payload: {
          results,
        },
      });
    }
  },
);

searchWorker.onerror = (err) => {
  console.error("Worker Error:", err);
};

export { searchWorker };
