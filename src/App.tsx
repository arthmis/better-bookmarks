// import { JSX } from "solid-js/jsx-runtime";
import { createSignal } from "solid-js";

export default function App() {
  let [count, setCount] = createSignal(0);
  console.log("Extension loaded");
  return (
    <div>
      <h1>Bookmarks</h1>
      <button
        onClick={() => {
          setCount(count() + 1);
        }}
      >
        +
      </button>
      <h2>{count()}</h2>
    </div>
  );
}
