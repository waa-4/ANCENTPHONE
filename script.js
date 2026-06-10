const $ = (query) => document.querySelector(query);
const $$ = (query) => [...document.querySelectorAll(query)];

const views = {
  lock: $("#lockScreen"),
  home: $("#homeScreen"),
  app: $("#appWindow")
};

const state = {
  locked: true,
  themeIndex: Number(localStorage.getItem("ancentphoneTheme") || 0),
  themes: ["", "theme-candy", "theme-toxic", "theme-rust"],
  note: localStorage.getItem("ancentphoneNote") || "Todo:\n- Make fake phone better\n- Add cursed apps\n- Do not let Sibo Prime install malware",
  calc: "0"
};

const appData = {
  messages: {
    title: "Messages",
    subtitle: "3 goofy chats",
    render: () => `
      <div class="message-bubble">Welcome to the upgraded AncentPhone.</div>
      <div class="message-bubble me">This actually looks like a phone now.</div>
      <div class="message-bubble">Exactly. Fancy rectangle achieved.</div>
      <div class="app-card">
        <h3>Group Chat</h3>
        <p>Sibo: rusty bucket detected.</p>
      </div>
    `
  },
  notes: {
    title: "Notes",
    subtitle: "Saved locally",
    render: () => `
      <textarea class="note-box" id="noteBox" spellcheck="false">${escapeHtml(state.note)}</textarea>
      <div class="app-card"><p>Your note saves automatically in this browser.</p></div>
    `,
    afterRender: () => {
      $("#noteBox").addEventListener("input", (e) => {
        state.note = e.target.value;
        localStorage.setItem("ancentphoneNote", state.note);
      });
    }
  },
  camera: {
    title: "Camera",
    subtitle: "Fake lens mode",
    render: () => `
      <div class="camera-preview">📷</div>
      <div class="app-card">
        <h3>No real camera needed</h3>
        <p>This is a stylized fake camera app, so it works safely on GitHub Pages without permissions.</p>
      </div>
    `
  },
  music: {
    title: "Music",
    subtitle: "Demo playlist",
    render: () => `
      <div class="app-card">
        <div class="song-row"><strong>Rusty Bucket Theme</strong><span>2:04</span></div>
        <div class="progress"><i></i></div>
      </div>
      <div class="app-card song-row"><strong>Cheeseburger Chaos</strong><span>3:11</span></div>
      <div class="app-card song-row"><strong>Ancient Ringtone</strong><span>0:42</span></div>
    `
  },
  weather: {
    title: "Weather",
    subtitle: "Definitely accurate",
    render: () => `
      <div class="app-card">
        <h3 style="font-size:3rem">72°</h3>
        <p>Mostly derpy with a chance of flying cheeseburgers.</p>
      </div>
      <div class="app-card"><p>Tomorrow: suspiciously phone-shaped clouds.</p></div>
    `
  },
  settings: {
    title: "Settings",
    subtitle: "Customize phone",
    render: () => `
      <div class="setting-row">
        <div><strong>Theme</strong><span>Cycle phone colors</span></div>
        <button id="themeBtn">Change</button>
      </div>
      <div class="setting-row">
        <div><strong>Battery</strong><span id="settingsBattery">87%</span></div>
        <button id="batteryBtn">Random</button>
      </div>
      <div class="setting-row">
        <div><strong>Notifications</strong><span>Open the shade</span></div>
        <button id="openShadeSettings">Open</button>
      </div>
      <div class="setting-row">
        <div><strong>Lock</strong><span>Return to lock screen</span></div>
        <button id="lockSettings">Lock</button>
      </div>
    `,
    afterRender: () => {
      $("#themeBtn").addEventListener("click", cycleTheme);
      $("#batteryBtn").addEventListener("click", randomBattery);
      $("#openShadeSettings").addEventListener("click", toggleShade);
      $("#lockSettings").addEventListener("click", lockPhone);
    }
  },
  browser: {
    title: "Browser",
    subtitle: "Mini web look",
    render: () => `
      <div class="browser-box">https://ancentphone.local/home</div>
      <div class="app-card">
        <h3>Ancent Search</h3>
        <p>Results for “how to make a website phone look less like a rectangle”</p>
      </div>
      <div class="app-card">
        <h3>Top result</h3>
        <p>Add a status bar, dock, app grid, lock screen, notifications, and a chunky phone frame.</p>
      </div>
    `
  },
  files: {
    title: "Files",
    subtitle: "Fake storage",
    render: () => `
      <div class="app-card file-row"><strong>README.txt</strong><span>2 KB</span></div>
      <div class="app-card file-row"><strong>sibo_prime_warning.png</strong><span>404 KB</span></div>
      <div class="app-card file-row"><strong>phone_ui_config.json</strong><span>8 KB</span></div>
    `
  },
  calculator: {
    title: "Calculator",
    subtitle: "Tiny math box",
    render: () => `
      <div class="calc-display" id="calcDisplay">${state.calc}</div>
      <div class="calc-keys">
        ${["7","8","9","C","4","5","6","+","1","2","3","-","0",".","=","×"].map(k => `<button data-calc="${k}">${k}</button>`).join("")}
      </div>
    `,
    afterRender: () => {
      $$("[data-calc]").forEach(btn => btn.addEventListener("click", () => pressCalc(btn.dataset.calc)));
    }
  }
};

function showView(name) {
  Object.values(views).forEach(view => view.classList.remove("active"));
  views[name].classList.add("active");
}

function unlockPhone() {
  state.locked = false;
  showView("home");
  $("#dynamicIsland").textContent = "Unlocked";
  setTimeout(() => $("#dynamicIsland").textContent = "AncentPhone", 1200);
}

function lockPhone() {
  state.locked = true;
  $("#notificationShade").classList.remove("open");
  showView("lock");
}

function openApp(appName) {
  const app = appData[appName];
  if (!app) return;

  $("#appTitle").textContent = app.title;
  $("#appSubtitle").textContent = app.subtitle;
  $("#appContent").innerHTML = app.render();
  showView("app");

  $("#dynamicIsland").textContent = app.title;
  if (app.afterRender) app.afterRender();
}

function toggleShade() {
  $("#notificationShade").classList.toggle("open");
}

function fakeNotification() {
  const shade = $("#notificationShade");
  const article = document.createElement("article");
  article.innerHTML = `<strong>New alert</strong><span>${randomChoice([
    "A tiny zombie is chewing the charger.",
    "The phone has gained +2 style.",
    "Sibo Prime tried to airdrop a rusty bucket.",
    "One unread message from Derp Labs."
  ])}</span>`;
  shade.insertBefore(article, shade.querySelector(".quick-row"));
  shade.classList.add("open");
}

function cycleTheme() {
  state.themeIndex = (state.themeIndex + 1) % state.themes.length;
  localStorage.setItem("ancentphoneTheme", state.themeIndex);
  applyTheme();
}

function applyTheme() {
  const phone = $("#phone");
  phone.classList.remove("theme-candy", "theme-toxic", "theme-rust");
  const theme = state.themes[state.themeIndex];
  if (theme) phone.classList.add(theme);
}

function randomBattery() {
  const amount = Math.floor(Math.random() * 75) + 15;
  $("#batteryText").textContent = `${amount}%`;
  $("#batteryFill").style.width = `${amount}%`;
  const settingsBattery = $("#settingsBattery");
  if (settingsBattery) settingsBattery.textContent = `${amount}%`;
}

function pressCalc(key) {
  if (key === "C") state.calc = "0";
  else if (key === "=") {
    try {
      const expression = state.calc.replaceAll("×", "*");
      const result = Function(`"use strict"; return (${expression})`)();
      state.calc = Number.isFinite(result) ? String(Math.round(result * 100000) / 100000) : "Nope";
    } catch {
      state.calc = "Nope";
    }
  } else {
    if (state.calc === "0" || state.calc === "Nope") state.calc = "";
    state.calc += key;
  }
  const display = $("#calcDisplay");
  if (display) display.textContent = state.calc;
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  $("#statusTime").textContent = time;
  $("#lockTime").textContent = time;

  $("#lockDate").textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  const hour = now.getHours();
  $("#widgetGreeting").textContent =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

$("#unlockBtn").addEventListener("click", unlockPhone);
$("#lockNow").addEventListener("click", lockPhone);
$("#powerBtn").addEventListener("click", () => state.locked ? unlockPhone() : lockPhone());
$("#shadeBtn").addEventListener("click", toggleShade);
$("#demoNotify").addEventListener("click", fakeNotification);
$("#themeQuick").addEventListener("click", cycleTheme);
$("#backHome").addEventListener("click", () => showView("home"));

$$("[data-app]").forEach(button => {
  button.addEventListener("click", () => openApp(button.dataset.app));
});

$$("[data-quick]").forEach(button => {
  button.addEventListener("click", () => {
    button.classList.toggle("active");
    button.textContent = button.textContent.includes("✓")
      ? button.textContent.replace(" ✓", "")
      : `${button.textContent} ✓`;
  });
});

let touchStartY = null;
$("#screen").addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

$("#screen").addEventListener("touchend", (e) => {
  if (touchStartY === null) return;
  const endY = e.changedTouches[0].clientY;
  const diff = endY - touchStartY;

  if (state.locked && diff < -40) unlockPhone();
  if (!state.locked && diff > 55 && touchStartY < 90) toggleShade();

  touchStartY = null;
}, { passive: true });

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") showView(state.locked ? "lock" : "home");
});

applyTheme();
randomBattery();
updateClock();
setInterval(updateClock, 1000);
