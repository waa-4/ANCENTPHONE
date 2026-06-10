# AncentPhone - Ancient Configurable Phone UI

This is a more ancient-looking, configurable version of **AncentPhone**.

## Main features

- Sand/stone/ancient phone design
- `config.js` for built-in custom apps
- Multiple home screen pages
- Swipe left/right on mobile to change pages
- Page dots
- Dock
- Edit mode for moving apps
- Drag app icons on desktop
- Touch-friendly move helper on mobile
- Folders/groups
- Debug app that creates custom apps
- Custom apps saved with `localStorage`
- Theme switching
- Sandstorm visual toggle
- Notes app
- Calculator app
- List/text/html custom app types

## Files

- `index.html`
- `style.css`
- `script.js`
- `config.js`

## How to install

Extract this zip into your repo.

If your repo already has `index.html`, `style.css`, `script.js`, or `config.js`, back them up first.

## Editing apps in config.js

Open `config.js`.

Example text app:

```js
{
  id: "rules",
  name: "Rules",
  icon: "⚖️",
  type: "text",
  description: "Example custom text app.",
  content: {
    title: "Tablet Rules",
    body: "1. Do not feed the scarabs."
  }
}
```

Example list app:

```js
{
  id: "files",
  name: "Relics",
  icon: "🗿",
  type: "list",
  description: "Fake file storage.",
  items: ["tablet_log.txt", "sandy_config.json"]
}
```

Example folder/group app:

```js
{
  id: "folder-tools",
  name: "Tools",
  icon: "🧰",
  type: "folder",
  description: "A folder/group example.",
  children: ["calculator", "files", "camera"]
}
```

## Debug app

The Debug app replaces the old fake Messages app.

It lets you create apps directly in the phone UI.

Debug-created apps save only in the browser/device using localStorage. To make them permanent, use Export Custom Apps and paste the JSON into `config.js`.

## App movement

Press **Edit**, then drag icons on desktop.

On mobile, press **Edit**, long-press an app until the move notification appears, then tap another app to place it before that app.

## Resetting

Use the page helper button **Reset layout** or clear browser storage.
