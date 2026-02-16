import { dispatch } from "../../Store/Collections";

interface ImportBackupSuccessViewProps {
  openBackupFilePicker: () => void;
}

export function ImportBackupSuccessView(props: ImportBackupSuccessViewProps) {
  return (
    <div class="flex flex-col items-center justify-center w-full h-full gap-4">
      <span class="text-4xl">✅</span>
      <h2 class="text-xl font-semibold text-gray-700">
        Backup Imported Successfully!
      </h2>
      <p class="text-sm text-gray-500">
        Your bookmarks have been merged. You can close this tab.
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          onClick={() => {
            // Close this tab
            browser.tabs.getCurrent().then((tab) => {
              if (tab?.id) browser.tabs.remove(tab.id);
            });
          }}
          class="btn btn-primary"
        >
          Close Tab
        </button>
        <button
          type="button"
          onClick={() => {
            // props.setImportBackupDone(false);
            dispatch({
              type: "SET_IMPORT_BACKUP_DONE",
              payload: false,
            });
            props.openBackupFilePicker();
          }}
          class="btn btn-secondary"
        >
          Import Another File
        </button>
      </div>
    </div>
  );
}
