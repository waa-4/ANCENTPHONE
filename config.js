/*
  AncentPhone config.js

  Built-in apps go here.
  Types:
  - link: opens another website
  - text: simple text app
  - list: list app
  - folder: group app
  - notes: saved notes
  - calculator: calculator
  - debug: in-phone custom app creator
  - camera: fake camera
*/

window.ANCENTPHONE_CONFIG = {
  phoneName: "AncentPhone",
  phoneSubtitle: "Ancient cursed smartphone",
  dock: ["debug", "notes", "browser", "settings"],

  themes: [
    { id: "default", name: "Desert Relic", className: "" },
    { id: "night", name: "Moon Tomb", className: "theme-night" },
    { id: "moss", name: "Moss Ruin", className: "theme-moss" },
    { id: "blood", name: "Cursed Obelisk", className: "theme-blood" }
  ],

  apps: [
    {
      id: "debug",
      name: "Debug",
      icon: "🧪",
      type: "debug",
      description: "Create custom apps and website links."
    },
    {
      id: "browser",
      name: "Obelisk Net",
      icon: "🌐",
      type: "link",
      description: "Example website link app.",
      url: "https://example.com",
      openInNewTab: true
    },
    {
      id: "github",
      name: "GitHub",
      icon: "🐙",
      type: "link",
      description: "Link to GitHub.",
      url: "https://github.com",
      openInNewTab: true
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: "▶️",
      type: "link",
      description: "Link to YouTube.",
      url: "https://youtube.com",
      openInNewTab: true
    },
    {
      id: "notes",
      name: "Notes",
      icon: "📜",
      type: "notes",
      description: "Papyrus note pad."
    },
    {
      id: "settings",
      name: "Settings",
      icon: "⚙️",
      type: "settings",
      description: "Phone toggles and fun stuff."
    },
    {
      id: "weather",
      name: "Sandcast",
      icon: "☀️",
      type: "text",
      description: "Fake desert forecast.",
      content: {
        title: "Forecast",
        body: "Hot, sandy, and maybe haunted. Chance of scarabs: 40%."
      }
    },
    {
      id: "music",
      name: "Hymns",
      icon: "🎵",
      type: "list",
      description: "Ancient playlist.",
      items: ["Rusty Bucket Chant", "Pyramid Loading Screen", "Sibo in the Sand", "Tiny Cursed Flute"]
    },
    {
      id: "files",
      name: "Relics",
      icon: "🗿",
      type: "list",
      description: "Fake file storage.",
      items: ["tablet_log.txt", "sarcophagus_photo.png", "do_not_open.jar", "sandy_config.json"]
    },
    {
      id: "calculator",
      name: "Calc",
      icon: "🧮",
      type: "calculator",
      description: "Simple calculator."
    },
    {
      id: "camera",
      name: "Lens",
      icon: "📷",
      type: "camera",
      description: "Fake ancient camera."
    },
    {
      id: "folder-fun",
      name: "Fun",
      icon: "🧰",
      type: "folder",
      description: "Grouped apps.",
      children: ["calculator", "files", "camera", "music"]
    }
  ]
};
