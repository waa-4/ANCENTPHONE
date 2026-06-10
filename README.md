# AncentPhone - Phone UI Upgrade

This is a cleaner, more phone-like web UI for **ancentphone**.

## What is included

- Polished phone frame
- Lock screen
- Swipe-up/tap unlock
- Live clock/date
- Status bar
- Home screen
- App icons
- Bottom dock
- Notification shade
- Fake apps:
  - Messages
  - Notes
  - Camera
  - Music
  - Weather
  - Settings
  - Browser
  - Files
  - Calculator
- Theme switching
- Mobile-friendly layout
- Local note saving with `localStorage`

## How to use

Extract this zip into your repo.

For GitHub Pages, the important files are:

- `index.html`
- `style.css`
- `script.js`

If your repo already has these files, back them up first or replace them with these.

## Easy editing

### Change app names/icons

Open `index.html` and edit the buttons inside:

```html
<div class="app-grid" id="appGrid">
```

### Change app content

Open `script.js` and edit the `appData` object.

Example:

```js
messages: {
  title: "Messages",
  subtitle: "3 goofy chats",
  render: () => `...`
}
```

### Change colors

Open `style.css` and edit:

```css
:root {
  --accent: #54d6ff;
  --accent-2: #9b7cff;
}
```

## Notes

This is a static site. It does not need a server and should work on GitHub Pages.
