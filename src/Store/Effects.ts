import type { Collection } from "../components/StateStore";

export type SET_COLLECTIONS = {
  type: "SET_COLLECTIONS";
  payload: Collection[];
};

export type Effect = SET_COLLECTIONS;
