import { For, Show } from "solid-js";
import type { SearchResult } from "../Store/Collections";

interface SearchResultsProps {
  results: SearchResult[];
}
export function SearchResults(props: SearchResultsProps) {
  return (
    <div class="h-full w-full overflow-y-auto">
      <ul class="list bg-base-100">
        <For
          each={props.results}
          fallback={
            <div class="p-4">
              Select a collection, some tabs and add add the tabs to the
              collection!
            </div>
          }
        >
          {(result) => {
            return (
              <li class="list-row hover:bg-gray-100">
                <div class="flex items-center">
                  <Show
                    when={result.iconUrl}
                    fallback={
                      <img
                        class="size-6 rounded-box"
                        src="/assets/bookmark-icon.svg"
                        alt=""
                      />
                    }
                  >
                    <img
                      class="size-6 rounded-box"
                      src={result.iconUrl}
                      alt=""
                    />
                  </Show>
                </div>
                <div class="flex flex-col">
                  <a class="link link-neutral link-hover" href={result.url}>
                    {result.title}
                  </a>
                </div>
              </li>
            );
          }}
        </For>
      </ul>
    </div>
  );
}
