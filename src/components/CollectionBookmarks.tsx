import { For } from "solid-js";

export interface CollectionBookmarks {
  title: string;
  bookmarks: CollectionBookmark[];
}

export interface CollectionBookmark {
  id: string;
  title: string;
  url: string;
  iconUrl: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

interface CollectionBookmarksProps {
  collection: CollectionBookmarks;
  handleDeleteBookmark: (id: string) => void;
}

export default function CollectionBookmarksComponent(
  props: CollectionBookmarksProps,
) {
  return (
    <>
      <h1 class="p-4 pb-2 tracking-wide">{props.collection.title}</h1>
      <div class="h-full w-full overflow-y-auto">
        <ul class="list bg-base-100">
          <For
            each={props.collection.bookmarks}
            fallback={<div>No bookmarks found.</div>}
          >
            {(bookmark) => {
              const baseUrl = new URL(bookmark.url);
              return (
                <li class="list-row">
                  <div>
                    <img
                      class="size-10 rounded-box"
                      src={bookmark.iconUrl}
                      alt={bookmark.title}
                    />
                  </div>
                  <div class="flex flex-col">
                    <a class="link link-info link-hover" href={bookmark.url}>
                      {bookmark.title}
                    </a>
                    <div class="flex justify-between">
                      <a
                        href={baseUrl.origin}
                        class="link link-neutral link-hover opacity-65 text-xs pt-1"
                      >
                        {baseUrl.host}
                      </a>
                      <span class="text-xs pt-1 opacity-65">
                        {bookmark.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    aria-label="Delete Bookmark"
                    onClick={() => props.handleDeleteBookmark(bookmark.id)}
                    class="btn btn-square btn-ghost"
                  >
                    <img src="/assets/trash.svg" alt="" />
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
      </div>
    </>
  );
}
