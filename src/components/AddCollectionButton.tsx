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
    <button onClick={handleAddCollection} class="btn btn-secondary">
      <span style="font-size: 16px;">+</span>
      Add Collection
    </button>
  );
}
