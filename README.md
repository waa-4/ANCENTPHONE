# AncentPhone Stable Fun Patch

This is a safer patched build after the previous physics version broke.

## Features

- Ancient sand/stone phone design
- Website-link apps through `config.js`
- Debug app for local custom apps
- Temporary spawned apps that disappear on reload
- Clear Spawned Apps button for old saved spawned apps
- Move mode for dragging/swiping apps
- Gravity mode for falling apps
- Chaos button
- Tilt mode
- Dock
- Folders
- Notes
- Calculator
- Settings
- Reset layout button

## Install

Extract into your repo and replace the old files:

- `index.html`
- `style.css`
- `script.js`
- `config.js`

Back up your old files first.

## Add a website app in config.js

```js
{
  id: "my-site",
  name: "My Site",
  icon: "🌐",
  type: "link",
  description: "Opens my website.",
  url: "https://example.com",
  openInNewTab: true
}
```

## Emergency fix

If app positions get weird, press **Reset**.
If the browser still remembers old broken data, clear site data/localStorage or use a different browser tab.


## Spawned apps change in v2

The **Spawn Temp App** button now creates temporary apps only. They are not saved into localStorage.

If you used the older patch and old `Relic` apps are stuck forever, press **Clear Spawned Apps** once.
