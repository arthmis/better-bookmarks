## Setup

You need to have Node version 21.7.3 and npm installed.

Install the dependencies:
```bash
$ npm install # or pnpm install or yarn install
```

## Building

Build the project with:
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
