export type INSERT_COLLECTION = {
  type: "INSERT_COLLECTION";
  payload: {
    name: string;
    collectionId: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type AppEvent = INSERT_COLLECTION;
