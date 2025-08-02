import { For, Show } from "solid-js";

interface Favorite {
  id: string;
  name: string;
}

interface FavoritesProps {
  favorites: Favorite[];
  selectedFavoriteId?: string;
  onSelectFavorite: (favoriteId: string) => void;
}

export default function Favorites(props: FavoritesProps) {
  return (
    <div class="w-[300px] h-full bg-gray-100 border-r border-gray-300 overflow-auto font-sans">
      <div class="p-4 border-b border-gray-300 bg-white sticky top-0 z-10">
        <h3 class="m-0 text-lg font-semibold text-gray-800">Favorites</h3>
      </div>

      <Show
        when={props.favorites.length > 0}
        fallback={
          <div class="p-4 text-center text-gray-500">
            <p>No favorites yet</p>
            <p class="text-sm mt-2">Collections you interact with will appear here</p>
          </div>
        }
      >
        <ul class="py-2">
          <For each={props.favorites}>
            {(favorite) => (
              <li>
                <div
                  class="flex items-center py-3 px-4 cursor-pointer transition-colors duration-200 hover:bg-gray-600 hover:text-white border-b border-gray-200 last:border-b-0"
                  classList={{
                    "bg-secondary text-white": props.selectedFavoriteId === favorite.id,
                  }}
                  onClick={() => props.onSelectFavorite(favorite.id)}
                >
                  <span class="w-5 text-xs text-gray-600 hover:text-white mr-3 flex items-center justify-center">
                    ⭐
                  </span>
                  <span
                    class="flex-1 font-medium transition-colors duration-200"
                    classList={{
                      "text-white": props.selectedFavoriteId === favorite.id,
                      "text-gray-800": props.selectedFavoriteId !== favorite.id,
                    }}
                  >
                    {favorite.name}
                  </span>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
