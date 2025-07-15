import { For } from "solid-js";

export interface CollectionBookmarks {
  title: string;
  bookmarks: CollectionBookmark[];
}

export interface CollectionBookmark {
  id: string;
  title: string;
  url: string;
}

interface CollectionBookmarksProps {
  collection: CollectionBookmarks;
}

export default function CollectionBookmarksComponent(
  props: CollectionBookmarksProps,
) {
  return (
    <>
      <h1>{props.collection.title}</h1>
      <ul class="list bg-base-100">
        <For
          each={props.collection.bookmarks}
          fallback={<div>No bookmarks found.</div>}
        >
          {(bookmark) => (
            <li class="list-row">
              <a class="link link-info" href={bookmark.url}>
                {bookmark.title}
              </a>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
