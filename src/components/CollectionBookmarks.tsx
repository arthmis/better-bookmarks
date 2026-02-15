import { createMemo, For, Show } from "solid-js";

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
  const sortedBookmarks = createMemo(() => {
    return props.collection.bookmarks.toSorted((bookmarkA, bookmarkB) => {
      if (bookmarkA.createdAt >= bookmarkB.createdAt) {
        return -1;
      } else {
        return 1;
      }
    });
  });
  return (
    <>
      <h1 class="p-4 pb-2 tracking-wide">{props.collection.title}</h1>
      <div class="h-full w-full overflow-y-auto">
        <ul class="list bg-base-100">
          <For
            each={sortedBookmarks()}
            fallback={
              <div class="p-4">
                Select a collection, some tabs and add add the tabs to the
                collection!
              </div>
            }
          >
            {(bookmark) => {
              const baseUrl = new URL(bookmark.url);
              return (
                <li class="list-row">
                  <div class="flex items-center">
                    <Show
                      when={bookmark.iconUrl}
                      fallback={
                        <img
                          class="size-6 rounded-box"
                          src="/assets/bookmark-icon.svg"
                          alt=""
                        />
                      }
                    >
                      <img
                        class="size-10 rounded-box"
                        src={bookmark.iconUrl}
                        alt=""
                      />
                    </Show>
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
                    type="button"
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
