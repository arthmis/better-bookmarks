import { Collection } from "../components/StateStore";

export type SET_CURRENT_EXPANDED_COLLECTIONS = {
  type: "SET_CURRENT_EXPANDED_COLLECTIONS";
  payload: string[];
};

export type SET_SELECTED_COLLECTION = {
  type: "SET_SELECTED_COLLECTION";
  payload: string;
};

export type SET_COLLECTIONS = {
  type: "SET_COLLECTIONS";
  payload: Collection[];
};

export type Effect =
  | SET_CURRENT_EXPANDED_COLLECTIONS
  | SET_SELECTED_COLLECTION
  | SET_COLLECTIONS;
