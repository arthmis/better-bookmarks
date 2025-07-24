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
    <button onClick={handleAddCollection} class="btn btn-soft">
      <span class="text-sm">+</span>
      Add Collection
    </button>
  );
}
