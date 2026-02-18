// self.importScripts("../fuzzy_match/pkg/fuzzy_match.js");
// import { add } from "../fuzzy_match/pkg/fuzzy_match";
// import { add } from "../fuzzy_match/pkg/fuzzy_match_bg.wasm";
import { add } from "../fuzzy_match/pkg/fuzzy_match";

self.addEventListener("message", (event) => {
  console.log("received message");
  console.log(event);
});

self.postMessage({
  message: "wasm INITIALIZED",
});

console.log("worker script ready and wasm initialized");
// console.log(add(BigInt(1), BigInt(1)));
