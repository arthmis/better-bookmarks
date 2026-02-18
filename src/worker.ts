new Worker(new URL("./search_worker.ts", import.meta.url), {
  type: "module",
});
