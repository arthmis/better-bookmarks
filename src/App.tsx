// import { JSX } from "solid-js/jsx-runtime";
import { createSignal } from "solid-js";
import Collections from "./components/Collections";

export default function App() {
  let [count, setCount] = createSignal(0);
  console.log("Extension loaded");
  return (
    <>
      <Collections />
    </>
  );
}
