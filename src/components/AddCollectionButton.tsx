import { Collection } from "./Collections";

interface AddCollectionButtonProps {
  onAddCollection: (name: string) => void;
}

export default function AddCollectionButton(props: AddCollectionButtonProps) {
  const handleAddCollection = () => {
    const name = prompt("Enter collection name:");
    if (name && name.trim()) {
      props.onAddCollection(name.trim());
    }
  };

  return (
    <button
      onClick={handleAddCollection}
      style="
        background-color: #007acc;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
      "
      onMouseOver={(e) => (e.target.style.backgroundColor = "#005a9e")}
      onMouseOut={(e) => (e.target.style.backgroundColor = "#007acc")}
    >
      <span style="font-size: 16px;">+</span>
      Add Collection
    </button>
  );
}
