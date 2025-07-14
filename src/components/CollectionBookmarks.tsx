import { For } from "solid-js";

export interface CollectionBookmark {
  id: string;
  title: string;
  url: string;
}

interface CollectionBookmarksProps {
  items: CollectionBookmark[];
}

export default function CollectionBookmarks(props: CollectionBookmarksProps) {
  return (
    <>
      <h1>Collection Bookmarks</h1>
      <ul>
        <For each={props.items} fallback={<div>No bookmarks found.</div>}>
          {(bookmark) => (
            <li>
              <a href={bookmark.url}>{bookmark.title}</a>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
