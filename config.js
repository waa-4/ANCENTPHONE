/*
  AncentPhone config file

  Edit this file to add/remove built-in apps.
  Apps made in the Debug app are saved in the browser's localStorage.
*/

window.ANCENTPHONE_CONFIG = {
  phoneName: "AncentPhone",
  phoneSubtitle: "Sand-powered rectangle",
  appsPerPage: 9,
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
      description: "Create, edit, delete, and export custom apps."
    },
    {
      id: "notes",
      name: "Notes",
      icon: "📜",
      type: "notes",
      description: "A papyrus note pad that saves locally."
    },
    {
      id: "browser",
      name: "Obelisk Net",
      icon: "🌐",
      type: "text",
      description: "Ancient fake browser.",
      content: {
        title: "Obelisk Net",
        body: "Search results carved directly into the stone. Replace this in config.js."
      }
    },
    {
      id: "weather",
      name: "Sandcast",
      icon: "☀️",
      type: "text",
      description: "Very trustworthy desert forecast.",
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
      id: "folder-tools",
      name: "Tools",
      icon: "🧰",
      type: "folder",
      description: "A folder/group example.",
      children: ["calculator", "files", "camera"]
    },
    {
      id: "rules",
      name: "Rules",
      icon: "⚖️",
      type: "text",
      description: "Example custom text app.",
      content: {
        title: "Tablet Rules",
        body: "1. Do not feed the scarabs.\n2. Do not install cursed APKs.\n3. Sand is not a valid password."
      }
    }
  ]
};
