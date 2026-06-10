# AncentPhone - Fun Physics + Website Links Update

This version makes AncentPhone feel more like a fun cursed phone toy.

## New features

- Website link apps
- `config.js` supports app URLs
- Move mode for swiping/dragging apps around
- App positions save in localStorage
- Gravity mode: apps fall, bounce, and collide
- Tilt mode: phone tilts with mouse/device orientation
- Chaos button to fling apps everywhere
- Settings app with fun toggles
- Debug app can create website-link apps
- Folders/groups still supported
- Dock still supported
- Sand/ancient phone style

## Files

- `index.html`
- `style.css`
- `script.js`
- `config.js`
- `README.md`

## Install

Extract this zip into your repo.

Back up your old files first if needed.

## Making website link apps

Open `config.js` and add an app like this:

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

## Moving apps

Click **Move**, then drag/swipe icons around.

Positions save automatically in your browser.

## Gravity mode

Click **Gravity** and apps fall like physical objects.

Use **Chaos** to throw them everywhere.

## Tilt mode

Open **Settings** or the Tablet Log and enable **Tilt**.

On desktop, the phone reacts to mouse movement.
On mobile, it may react to device tilt if the browser allows it.
