window.ANCENTPHONE_CONFIG = {
  phoneName: "AncentPhone",
  phoneSubtitle: "Stable cursed phone",
  dock: ["debug", "notes", "browser", "settings"],

  themes: [
    { name: "Desert Relic", className: "" },
    { name: "Moon Tomb", className: "themeNight" },
    { name: "Moss Ruin", className: "themeMoss" },
    { name: "Cursed Obelisk", className: "themeBlood" }
  ],

  apps: [
    {
      id: "debug",
      name: "Debug",
      icon: "🧪",
      type: "debug",
      description: "Create local apps and website links."
    },
    {
      id: "browser",
      name: "Obelisk Net",
      icon: "🌐",
      type: "link",
      description: "Example website link.",
      url: "https://example.com",
      openInNewTab: true
    },
    {
      id: "github",
      name: "GitHub",
      icon: "🐙",
      type: "link",
      description: "Open GitHub.",
      url: "https://github.com",
      openInNewTab: true
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: "▶️",
      type: "link",
      description: "Open YouTube.",
      url: "https://youtube.com",
      openInNewTab: true
    },
    {
      id: "notes",
      name: "Notes",
      icon: "📜",
      type: "notes",
      description: "Papyrus notes saved in your browser."
    },
    {
      id: "settings",
      name: "Settings",
      icon: "⚙️",
      type: "settings",
      description: "Phone controls."
    },
    {
      id: "sandcast",
      name: "Sandcast",
      icon: "☀️",
      type: "text",
      description: "Fake weather.",
      content: {
        title: "Sandcast",
        body: "Hot, sandy, and possibly haunted. Scarab chance: 40%."
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
      description: "Fake storage.",
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
      description: "Fake camera."
    },
    {
      id: "funfolder",
      name: "Fun",
      icon: "🧰",
      type: "folder",
      description: "Grouped apps.",
      children: ["calculator", "files", "camera", "music"]
    }
  ]
};
