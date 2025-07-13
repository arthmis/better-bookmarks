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
      style={`
        background-color: ${isDisabled() ? "#ccc" : "#28a745"};
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: ${isDisabled() ? "not-allowed" : "pointer"};
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
      `}
      onMouseOver={(e) => {
        if (!isDisabled()) {
          e.target.style.backgroundColor = "#218838";
        }
      }}
      onMouseOut={(e) => {
        if (!isDisabled()) {
          e.target.style.backgroundColor = "#28a745";
        }
      }}
    >
      <span style="font-size: 16px;">📥</span>
      Import Tab
    </button>
  );
}
