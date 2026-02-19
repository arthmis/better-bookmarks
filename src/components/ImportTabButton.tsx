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
      class="btn btn-square"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="24px"
        viewBox="0 -960 960 960"
        width="24px"
      >
        <title>bookmark</title>
        <path d="M200-120v-640q0-33 23.5-56.5T280-840h240v80H280v518l200-86 200 86v-278h80v400L480-240 200-120Zm80-640h240-240Zm400 160v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
      </svg>
    </button>
  );
}
