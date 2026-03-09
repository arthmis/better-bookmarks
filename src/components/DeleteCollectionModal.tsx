import { Show } from "solid-js";
import { createSignal } from "solid-js";

interface DeleteCollectionModalProps {
  isOpen: boolean;
  collectionName: string;
  onDelete: () => void;
  onCancel: () => void;
}

export default function DeleteCollectionModal(props: DeleteCollectionModalProps) {
  const handleCancel = () => {
    props.onCancel();
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    props.onDelete();
  };

  return (
    <Show when={props.isOpen}>
      <div class="modal modal-open">
        <div class="modal-box relative" role="dialog">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={handleCancel}
          >
            ✕
          </button>

          <h3 class="font-bold text-lg mb-4">Delete Collection</h3>

          <p class="mb-4">
            Are you sure you want to delete the collection <strong>"{props.collectionName}"</strong>?
            This action cannot be undone.
          </p>

          <form onSubmit={handleSubmit}>
            <div class="modal-action justify-between">
              <button type="button" class="btn" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" class="btn bg-red-600 text-white border-none">
                Delete
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}
