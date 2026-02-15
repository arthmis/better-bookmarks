browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "export-backup") {
    const { json, filename } = message.payload;

    try {
      const blob = new Blob([json], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      browser.downloads
        .download({
          url,
          filename: filename,
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
});
