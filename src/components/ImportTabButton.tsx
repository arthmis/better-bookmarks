import { Collection } from "./Collections";

interface ImportTabButtonProps {
  selectedCollectionId?: string;
  onImportTab: () => Promise<void>;
}

export default function ImportTabButton(props: ImportTabButtonProps) {
  const isDisabled = () => !props.selectedCollectionId;

  const handleImportTab = async () => {
    if (!isDisabled()) {
      await props.onImportTab();
    }
  };

  return (
    <button
      onClick={handleImportTab}
      disabled={isDisabled()}
      class="btn btn-primary"
    >
      <span class="text-sm">📥</span>
      Import Tab
    </button>
  );
}
