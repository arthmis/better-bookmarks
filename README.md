# Motivation
There were some UX issues I had with Firefox's bookmarks. I wanted to have my bookmark collections at the top level. Firefox doesn't allow that to happen. There can only be `Bookmarks Toolbar`, `Bookmarks Menu`, and `Other Bookmarks`. So I have no choice but to put my collections within those folders. I also wanted allow collections to contain collections as well as bookmarks directly, though I don't know if that is really that useful of a feature. Besides that I wanted to make some improvements to search. I've opted for fuzzy search, which isn't ideal yet, but works well enough. Now it doesn't require finding an exact word when searching. Most importantly I wanted a larger cache of recently used collections. When adding a new bookmark the collections that were most recently added to were the first options, but Firefox only shows 6 of them. I've increased that limit to 15 for this extension.

## Future changes
- I want to allow reordering collections and allow moving bookmarks between collections with drag and drop ideally

## Setup

You need to have Node version 21.7.3 and npm installed.

Install the dependencies:
```bash
$ npm install # or pnpm install or yarn install
```

You will need a [rust compiler](https://rust-lang.org/learn/get-started/) and [wasm-pack](https://drager.github.io/wasm-pack/installer/).
Once you've installed those tools, at the project root in your terminal, `cd` into the `fuzzy_match` folder and use the command
```
wasm-pack build --target bundler
```
There should be a `pkg` folder in `fuzzy_match` directory after the build finishes. Now go back to the root directory of the project

## Building

Build the extension frontend with with:
```
npm run build
```
Once the project is built, the production code can be found in the `/dist` folder along with its assets.

Since this is an extension for Firefox to use it in your browser locally, you need to go to `about:debugging` in your URL bar.
Click on `This Firefox` on the left menu and click on `Load Temporary Add-on`. Select the manifest.json file found in the `dist`
folder created when you ran `npm run build`.

After that the extension should be loaded, you can click the extensions menu in the toolbar on the top right and should see
the bookmark icon that represents the app. Feel free to pin it to make access a little easier. Now you can click it and import
tabs that you've selected and group them how you want.

Here's a video showing the basic functionality:

https://github.com/user-attachments/assets/154b513d-ede0-4b39-9602-1217212c8e62

## Backup & Restore

To protect your data, Better Bookmarks includes automatic exports and an option to import exported data. The automatic exports was added to help with backing up the bookmarks. Unfortunately I had huge data loss when I went to make updates to the extension. Firefox decided to treat the temporarily loaded extension as the same thing as the one installed and it decided they should have the same data although they should be treated differently. Somehow in that process all the bookmarks were overwritten/deleted. So I added a feature that will download all of the bookmarks every time a collection is updated. These exports are done per day. So, if you constantly update the collections over 1 day, there will only be 1 export left at the end of the day.


### Import Backup
1. Click the extension icon to open Better Bookmarks
2. Click the three-dot menu
3. Select "📥 Import Backup"
4. Choose your backup JSON file
5. Confirm the import (this will merge with your current data, so there is potential for data loss)

## Install extension directly
https://better-bookmarks-artmis-dev.netlify.app/
