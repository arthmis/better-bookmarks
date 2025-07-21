import { createSignal, Show } from "solid-js";

interface DeleteCollectionModalProps {
  isOpen: boolean;
  collectionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteCollectionModal(
  props: DeleteCollectionModalProps,
) {
  const [inputValue, setInputValue] = createSignal("");

  const isConfirmDisabled = () => inputValue() !== props.collectionName;

  const handleConfirm = () => {
    if (!isConfirmDisabled()) {
      props.onConfirm();
      setInputValue(""); // Reset input after confirm
    }
  };

  const handleCancel = () => {
    setInputValue(""); // Reset input on cancel
    props.onCancel();
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setInputValue(target.value);
  };

  return (
    <Show when={props.isOpen}>
      <div class="modal modal-open">
        <div class="modal-box relative" role="dialog">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={handleCancel}
          >
            ✕
          </button>

          <h3 class="font-bold text-lg mb-4">Delete Collection</h3>

          <p class="mb-4">
            Are you sure you want to delete the collection{" "}
            <strong>"{props.collectionName}"</strong>? This action cannot be
            undone.
          </p>

          <label class="mb-2 text-sm" for="collectionName">
            To confirm, type the collection name exactly as shown above:
          </label>
          <input
            type="text"
            id="collectionName"
            name="collectionName"
            class="input input-bordered w-full mb-4"
            value={inputValue()}
            onInput={handleInputChange}
          />

          <div class="modal-action">
            <button class="btn btn-ghost" onClick={handleCancel}>
              Cancel
            </button>
            <button
              class="btn btn-error"
              disabled={isConfirmDisabled()}
              onClick={handleConfirm}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
