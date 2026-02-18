import SearchWorker from "./worker.ts?worker";

type QueryMessage = {
  type: "QUERY_SEARCH";
  query: string;
};
let searchWorker: Worker;

type SearchWorkerMessage = QueryMessage;
browser.runtime.onInstalled.addListener((details) => {
  console.log(details);
  searchWorker = new SearchWorker();

  searchWorker.addEventListener("message", (event) => {
    console.log(`Received message from worker: ${event.data}`);
    console.log(event);

    if (event.data.message === "wasm INITIALIZED") {
      console.log("web worker is ready");
    }

    if (event.data.type === "SEARCH_RESULTS") {
      browser.runtime.sendMessage({
        type: "SEARCH_RESULTS",
        results: event.data.results,
      });
    }
  });

  searchWorker.onerror = (err) => {
    console.error("Worker Error:", err);
  };

  searchWorker.postMessage({
    msg: "from background script",
  });
});

// const searchWorker = new SearchWorker();
// searchWorker.postMessage({
//   msg: "from background script",
// });

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message.type === "export-backup" ||
    message.type === "auto-export-backup"
  ) {
    const { json, filename } = message.payload;
    const saveAs = message.type !== "auto-export-backup";

    try {
      const blob = new Blob([json], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      browser.downloads
        .download({
          url,
          filename: filename,
          saveAs,
          conflictAction: "overwrite",
        })
        .then((downloadItemId) => {
          browser.downloads.onChanged.addListener(function onChange(delta) {
            if (delta.state !== undefined && delta.id === downloadItemId) {
              if (delta.state === "complete") {
                URL.revokeObjectURL(url);
                browser.downloads.onChanged.removeListener(onChange);
                console.log("Backup exported successfully");
                sendResponse({ success: true, downloadItemId });
              }
            }
          });
        })
        .catch((error) => {
          URL.revokeObjectURL(url);
          sendResponse({ success: false, error: String(error) });
        });
      return true; // keeps the message channel open for async sendResponse
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
      return false;
    }
  }

  if (message.type === "QUERY_SEARCH") {
    // Forward the search request to the Worker
    searchWorker.postMessage({ type: "SEARCH", query: message.query });

    // Note: Since Worker communication is async, you'll likely want to
    // use a Promise or a separate listener to send the response back to the popup.
    return true;
  }
});
