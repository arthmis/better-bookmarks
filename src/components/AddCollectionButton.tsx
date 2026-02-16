import { dispatch } from "../Store/Collections";

export default function AddCollectionButton() {
  return (
    <button
      type="button"
      onClick={() => {
        const now = new Date();
        dispatch({
          type: "INSERT_COLLECTION",
          payload: {
            name: "New Collection",
            collectionId: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
          },
        });
      }}
      class="btn btn-soft"
    >
      <span class="text-sm">+</span>
      Add Collection
    </button>
  );
}
