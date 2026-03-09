import { createEffect, createSignal, Show } from "solid-js";

interface EditCollectionModalProps {
  isOpen: boolean;
  collectionName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

export default function EditCollectionModal(props: EditCollectionModalProps) {
  const [inputValue, setInputValue] = createSignal(props.collectionName);

  createEffect(() => {
    if (props.isOpen) {
      setInputValue(props.collectionName);
    }
  });

  const isSaveDisabled = () => inputValue().trim() === "";

  const handleSave = () => {
    const trimmed = inputValue().trim();
    if (trimmed) {
      props.onSave(trimmed);
    }
  };

  const handleCancel = () => {
    setInputValue(props.collectionName);
    props.onCancel();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !isSaveDisabled()) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="modal modal-open">
        <div class="modal-box relative" role="dialog">
          <button
            type="button"
            // improvement: probably shouldn't use absolute
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={handleCancel}
          >
            ✕
          </button>

          <h3 class="font-bold text-lg mb-4">Rename Collection</h3>

          <label class="mb-2 text-sm block" for="editCollectionName">
            Collection name
          </label>
          <input
            type="text"
            id="editCollectionName"
            name="editCollectionName"
            class="input input-bordered w-full mb-4"
            value={inputValue()}
            onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            autofocus
          />

          <div class="modal-action justify-between">
            <button type="button" class="btn" onClick={handleCancel}>
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              disabled={isSaveDisabled()}
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
