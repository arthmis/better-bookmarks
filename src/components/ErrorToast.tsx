import { createSignal, Show } from "solid-js";

export interface ToastError {
  message: string;
}

const [toastError, setToastError] = createSignal<ToastError>();

let currentTimer: ReturnType<typeof setTimeout> | undefined = undefined;

export const showErrorToast = (message: string, duration: number = 10_000) => {
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = undefined;
  }

  setToastError({ message });

  currentTimer = setTimeout(() => {
    setToastError(undefined);
  }, duration);
};

const hideToast = () => {
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = undefined;
  }

  setToastError(undefined);
};

export default function ErrorToast() {
  return (
    <Show when={toastError()}>
      <div class="toast">
        <div role="alert" class="flex alert alert-error">
          <p class="text-white">{toastError()?.message}</p>
          <button
            class="btn btn-sm btn-ghost btn-error"
            onClick={() => hideToast()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="20px"
              width="20px"
              viewBox="0 -960 960 960"
              class="fill-white"
            >
              <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
            </svg>
          </button>
        </div>
      </div>
    </Show>
  );
}
