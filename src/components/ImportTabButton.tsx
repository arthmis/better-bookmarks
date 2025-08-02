import { Collection } from "./Collections";

interface ImportTabButtonProps {
  selectedCollectionId?: string;
  selectedFavoriteId?: string;
  onImportTab: () => Promise<void>;
  onImportTabToFavorite: () => Promise<void>;
  activeTab: "collections" | "favorites";
}

export default function ImportTabButton(props: ImportTabButtonProps) {
  const isDisabled = () => {
    if (props.activeTab === "collections") {
      return !props.selectedCollectionId;
    } else {
      return !props.selectedFavoriteId;
    }
  };

  const handleImportTab = async () => {
    if (!isDisabled()) {
      if (props.activeTab === "collections") {
        await props.onImportTab();
      } else {
        await props.onImportTabToFavorite();
      }
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
