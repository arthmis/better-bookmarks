interface ImportBackupViewProps {
  openBackupFilePicker: () => void;
}

export function ImportBackupView(props: ImportBackupViewProps) {
  return (
    <div class="flex flex-col items-center justify-center w-full h-full gap-4">
      <h2 class="text-xl font-semibold text-gray-700">Import Backup File</h2>
      <p class="text-sm text-gray-500">
        Select a backup JSON file to import your bookmarks.
      </p>
      <button
        type="button"
        onClick={props.openBackupFilePicker}
        class="btn btn-primary"
      >
        <span class="text-sm">📂</span>
        Choose Backup File
      </button>
    </div>
  );
}
