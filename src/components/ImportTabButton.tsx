import { type ActiveTab, dispatch } from "../Store/Collections";

interface ImportTabButtonProps {
  selectedCollectionId?: string;
  selectedFavoriteId?: string;
  activeTab: ActiveTab;
}

export default function ImportTabButton(props: ImportTabButtonProps) {
  const isDisabled = () => {
    if (props.activeTab === "collections") {
      return !props.selectedCollectionId;
    } else {
      return !props.selectedFavoriteId;
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        dispatch({
          type: "GET_CURRENT_TABS",
        });
      }}
      disabled={isDisabled()}
      class="btn btn-primary"
    >
      <span class="text-sm">📥</span>
      Import Tab
    </button>
  );
}
