import { SearchEngine } from "../fuzzy_match/pkg/fuzzy_match";
import type {
  FromBackgroundScriptMessage,
  FromWorkerMessage,
} from "./worker/worker_messages";

const searchEngine = new SearchEngine();

self.addEventListener(
  "message",
  (event: MessageEvent<FromBackgroundScriptMessage>) => {
    switch (event.data.type) {
      case "QUERY_SEARCH": {
        const results = searchEngine.search(event.data.query);
        self.postMessage({
          type: "SEARCH_RESULTS",
          results,
        });
        break;
      }
      case "BUILD_INDEX": {
        const data = event.data.data;
        searchEngine.load_dataset(data);
      }
    }
  },
);

const workerReady: FromWorkerMessage = {
  type: "WORKER_READY",
};
self.postMessage(workerReady);

console.log("worker script ready and wasm initialized");
