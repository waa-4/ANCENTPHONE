const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

const CONFIG = window.ANCENTPHONE_CONFIG || {};
const STORAGE_KEYS = {
  customApps: "ancentphone.customApps.v2",
  layout: "ancentphone.layout.v2",
  theme: "ancentphone.theme.v2",
  note: "ancentphone.note.v2"
};

const state = {
  locked: true,
  editing: false,
  currentPage: 0,
  themeIndex: Number(localStorage.getItem(STORAGE_KEYS.theme) || 0),
  calc: "0",
  note: localStorage.getItem(STORAGE_KEYS.note) || "Ancient notes:\n- Make apps in Debug\n- Drag icons in Edit mode\n- Add custom apps in config.js",
  draggedAppId: null,
  customApps: loadCustomApps(),
  layout: null
};

const builtInApps = Array.isArray(CONFIG.apps) ? CONFIG.apps : [];
const themes = Array.isArray(CONFIG.themes) ? CONFIG.themes : [{ name: "Default", className: "" }];
const appsPerPage = Number(CONFIG.appsPerPage || 9);

function getAllApps() {
  const merged = [...builtInApps, ...state.customApps];
  const seen = new Set();
  return merged.filter(app => {
    if (!app || !app.id || seen.has(app.id)) return false;
    seen.add(app.id);
    return true;
  });
}

function getApp(id) {
  return getAllApps().find(app => app.id === id);
}

function loadCustomApps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.customApps) || "[]");
  } catch {
    return [];
  }
}

function saveCustomApps() {
  localStorage.setItem(STORAGE_KEYS.customApps, JSON.stringify(state.customApps));
}

function defaultLayout() {
  const allIds = getAllApps().map(app => app.id);
  const dockIds = (CONFIG.dock || []).filter(id => allIds.includes(id)).slice(0, 4);
  const homeIds = allIds.filter(id => !dockIds.includes(id));
  return {
    dock: dockIds,
    home: homeIds
  };
}

function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.layout) || "null");
    if (!saved || !Array.isArray(saved.home) || !Array.isArray(saved.dock)) return defaultLayout();

    const validIds = getAllApps().map(app => app.id);
    const validSet = new Set(validIds);

    let dock = saved.dock.filter(id => validSet.has(id)).slice(0, 4);
    let home = saved.home.filter(id => validSet.has(id) && !dock.includes(id));

    for (const id of validIds) {
      if (!dock.includes(id) && !home.includes(id)) home.push(id);
    }

    return { dock, home };
  } catch {
    return defaultLayout();
  }
}

function saveLayout() {
  localStorage.setItem(STORAGE_KEYS.layout, JSON.stringify(state.layout));
}

function resetLayout() {
  localStorage.removeItem(STORAGE_KEYS.layout);
  state.layout = defaultLayout();
  renderHome();
  notify("Layout reset", "The icons returned to config.js order.");
}

function setTheme(index) {
  state.themeIndex = ((index % themes.length) + themes.length) % themes.length;
  localStorage.setItem(STORAGE_KEYS.theme, state.themeIndex);
  const shell = $("#phoneShell");
  shell.classList.remove(...themes.map(t => t.className).filter(Boolean));
  const theme = themes[state.themeIndex];
  if (theme && theme.className) shell.classList.add(theme.className);
}

function cycleTheme() {
  setTheme(state.themeIndex + 1);
  notify("Theme changed", themes[state.themeIndex]?.name || "Unknown theme");
}

function showView(id) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $(id).classList.add("active");
}

function lockPhone() {
  state.locked = true;
  $("#shade").classList.remove("open");
  showView("#lockView");
}

function unlockPhone() {
  state.locked = false;
  showView("#homeView");
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
}

function renderHome() {
  if (!state.layout) state.layout = loadLayout();

  $("#phoneTitle").textContent = CONFIG.phoneName || "AncentPhone";
  $("#phoneSubtitle").textContent = CONFIG.phoneSubtitle || "Ancient slab UI";
  $("#homeView").classList.toggle("editing", state.editing);
  $("#editToggle").textContent = state.editing ? "Done" : "Edit";

  const pagesEl = $("#pages");
  const dotsEl = $("#pageDots");
  const dockEl = $("#dock");
  pagesEl.innerHTML = "";
  dotsEl.innerHTML = "";
  dockEl.innerHTML = "";

  const homeIds = state.layout.home.filter(id => getApp(id));
  const dockIds = state.layout.dock.filter(id => getApp(id));
  const pages = chunk(homeIds, appsPerPage);
  if (!pages.length) pages.push([]);

  if (state.currentPage >= pages.length) state.currentPage = pages.length - 1;
  if (state.currentPage < 0) state.currentPage = 0;

  pages.forEach((pageIds, pageIndex) => {
    const page = document.createElement("div");
    page.className = `page ${pageIndex === state.currentPage ? "active" : ""}`;
    page.dataset.page = pageIndex;

    pageIds.forEach(appId => {
      page.appendChild(createAppButton(appId, "home"));
    });

    pagesEl.appendChild(page);

    const dot = document.createElement("button");
    dot.className = pageIndex === state.currentPage ? "active" : "";
    dot.addEventListener("click", () => {
      state.currentPage = pageIndex;
      renderHome();
    });
    dotsEl.appendChild(dot);
  });

  dockIds.forEach(appId => dockEl.appendChild(createAppButton(appId, "dock")));

  $("#pageText").textContent = roman(state.currentPage + 1);
}

function createAppButton(appId, zone) {
  const app = getApp(appId);
  const button = document.createElement("button");
  button.className = "app-icon";
  button.draggable = state.editing;
  button.dataset.appId = appId;
  button.dataset.zone = zone;
  button.innerHTML = `<span class="glyph">${app.icon || "𓂀"}</span><b>${escapeHtml(app.name || app.id)}</b>`;

  button.addEventListener("click", () => {
    if (state.editing) return;
    openApp(appId);
  });

  button.addEventListener("dragstart", (e) => {
    if (!state.editing) return e.preventDefault();
    state.draggedAppId = appId;
    button.classList.add("dragging");
    e.dataTransfer.setData("text/plain", appId);
  });

  button.addEventListener("dragend", () => {
    button.classList.remove("dragging");
    state.draggedAppId = null;
  });

  button.addEventListener("dragover", (e) => {
    if (state.editing) e.preventDefault();
  });

  button.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!state.editing) return;
    const fromId = state.draggedAppId || e.dataTransfer.getData("text/plain");
    moveAppBefore(fromId, appId, zone);
  });

  // Touch-friendly long press drag-ish movement:
  let holdTimer = null;
  button.addEventListener("touchstart", () => {
    if (!state.editing) return;
    holdTimer = setTimeout(() => {
      state.draggedAppId = appId;
      notify("Moving app", `Tap another icon to place ${app.name}.`);
    }, 420);
  }, { passive: true });

  button.addEventListener("touchend", () => {
    clearTimeout(holdTimer);
    if (state.editing && state.draggedAppId && state.draggedAppId !== appId) {
      moveAppBefore(state.draggedAppId, appId, zone);
      state.draggedAppId = null;
    }
  });

  return button;
}

function moveAppBefore(fromId, toId, targetZone) {
  if (!fromId || !toId || fromId === toId) return;

  state.layout.home = state.layout.home.filter(id => id !== fromId);
  state.layout.dock = state.layout.dock.filter(id => id !== fromId);

  if (targetZone === "dock") {
    const index = state.layout.dock.indexOf(toId);
    state.layout.dock.splice(index < 0 ? state.layout.dock.length : index, 0, fromId);
    while (state.layout.dock.length > 4) {
      state.layout.home.unshift(state.layout.dock.pop());
    }
  } else {
    const index = state.layout.home.indexOf(toId);
    state.layout.home.splice(index < 0 ? state.layout.home.length : index, 0, fromId);
  }

  saveLayout();
  renderHome();
}

function openApp(appId) {
  const app = getApp(appId);
  if (!app) return;

  $("#appTitle").textContent = app.name || app.id;
  $("#appDesc").textContent = app.description || "Ancient app";
  $("#appContent").innerHTML = renderApp(app);
  showView("#appView");

  if (app.type === "debug") attachDebugEvents();
  if (app.type === "notes") attachNotesEvents();
  if (app.type === "calculator") attachCalcEvents();
}

function renderApp(app) {
  switch (app.type) {
    case "debug":
      return renderDebugApp();
    case "notes":
      return `<textarea class="note-box" id="noteBox" spellcheck="false">${escapeHtml(state.note)}</textarea>
              <div class="app-card"><p>This saves in your browser with localStorage.</p></div>`;
    case "list":
      return `<div class="app-card"><h3>${escapeHtml(app.name)}</h3><p>${escapeHtml(app.description || "")}</p></div>` +
        (app.items || []).map(item => `<div class="app-card"><strong>${escapeHtml(item)}</strong><span>Relic entry</span></div>`).join("");
    case "folder":
      return renderFolder(app);
    case "calculator":
      return renderCalculator();
    case "camera":
      return `<div class="app-card" style="min-height:260px;display:grid;place-items:center;font-size:4rem;">📷</div>
              <div class="app-card"><h3>Ancient Lens</h3><p>This is a safe fake camera app for static sites.</p></div>`;
    case "html":
      return `<div class="app-card">${app.html || ""}</div>`;
    case "text":
    default:
      const title = app.content?.title || app.name || "Text App";
      const body = app.content?.body || app.description || "Edit this app inside config.js.";
      return `<div class="app-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body).replaceAll("\n", "<br>")}</p></div>`;
  }
}

function renderFolder(app) {
  const children = (app.children || []).filter(id => getApp(id));
  return `<div class="folder-panel">
    <h3>${escapeHtml(app.name)}</h3>
    <span>${escapeHtml(app.description || "Grouped apps")}</span>
    <div class="folder-grid">
      ${children.map(id => {
        const child = getApp(id);
        return `<button class="app-icon folder-child" data-folder-open="${child.id}">
          <span class="glyph">${child.icon || "𓂀"}</span><b>${escapeHtml(child.name)}</b>
        </button>`;
      }).join("")}
    </div>
  </div>`;
}

function renderCalculator() {
  return `<div class="calc-display" id="calcDisplay">${escapeHtml(state.calc)}</div>
    <div class="calc-keys">
      ${["7","8","9","C","4","5","6","+","1","2","3","-","0",".","=","×"].map(k => `<button data-calc="${k}">${k}</button>`).join("")}
    </div>`;
}

function renderDebugApp() {
  const customCards = state.customApps.map(app => `
    <div class="app-editor-card">
      <strong>${escapeHtml(app.icon || "𓂀")} ${escapeHtml(app.name)}</strong>
      <span>ID: ${escapeHtml(app.id)}</span>
      <div class="editor-actions">
        <button data-edit-app="${app.id}">Edit</button>
        <button data-delete-app="${app.id}">Delete</button>
      </div>
    </div>
  `).join("");

  return `
    <div class="app-card">
      <h3>Debug / App Creator</h3>
      <p>Create custom apps without editing code. For permanent built-in apps, copy the exported data into config.js.</p>
    </div>

    <form class="debug-form" id="debugForm">
      <input type="hidden" id="debugOriginalId" />
      <div class="debug-row">
        <label>Name <input id="debugName" placeholder="Cursed App" required /></label>
        <label>Icon <input id="debugIcon" placeholder="𓂀" maxlength="4" /></label>
      </div>
      <label>ID <input id="debugId" placeholder="cursed-app" required /></label>
      <label>Type
        <select id="debugType">
          <option value="text">Text</option>
          <option value="list">List</option>
          <option value="html">HTML</option>
        </select>
      </label>
      <label>Description <input id="debugDesc" placeholder="What does this app do?" /></label>
      <label>Content <textarea id="debugContent" rows="5" placeholder="Text body, list items separated by lines, or HTML."></textarea></label>
      <div class="debug-row">
        <button type="submit">Save App</button>
        <button type="button" id="clearDebugForm">Clear</button>
      </div>
      <button type="button" id="exportApps">Export Custom Apps</button>
    </form>

    <div class="app-card">
      <h3>Custom Apps</h3>
      <p>${state.customApps.length ? "Apps saved on this device:" : "No custom apps yet."}</p>
    </div>
    ${customCards}
  `;
}

function attachDebugEvents() {
  $("#debugForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const originalId = $("#debugOriginalId").value.trim();
    const id = slug($("#debugId").value);
    const name = $("#debugName").value.trim();
    const icon = $("#debugIcon").value.trim() || "𓂀";
    const type = $("#debugType").value;
    const description = $("#debugDesc").value.trim();
    const rawContent = $("#debugContent").value;

    if (!id || !name) return notify("Missing info", "App needs a name and ID.");

    const newApp = {
      id,
      name,
      icon,
      type,
      description
    };

    if (type === "list") {
      newApp.items = rawContent.split("\n").map(x => x.trim()).filter(Boolean);
    } else if (type === "html") {
      newApp.html = rawContent;
    } else {
      newApp.content = { title: name, body: rawContent };
    }

    state.customApps = state.customApps.filter(app => app.id !== originalId && app.id !== id);
    state.customApps.push(newApp);
    saveCustomApps();

    if (originalId && originalId !== id) {
      state.layout.home = state.layout.home.filter(x => x !== originalId);
      state.layout.dock = state.layout.dock.filter(x => x !== originalId);
    }

    if (!state.layout.home.includes(id) && !state.layout.dock.includes(id)) {
      state.layout.home.push(id);
    }

    saveLayout();
    notify("App saved", `${name} was added to the tablet.`);
    renderHome();
    openApp("debug");
  });

  $("#clearDebugForm").addEventListener("click", clearDebugForm);

  $("#exportApps").addEventListener("click", () => {
    const text = JSON.stringify(state.customApps, null, 2);
    navigator.clipboard?.writeText(text);
    notify("Export copied", "Custom app JSON was copied if clipboard is allowed.");
  });

  $$("[data-delete-app]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.deleteApp;
      state.customApps = state.customApps.filter(app => app.id !== id);
      state.layout.home = state.layout.home.filter(x => x !== id);
      state.layout.dock = state.layout.dock.filter(x => x !== id);
      saveCustomApps();
      saveLayout();
      notify("App deleted", id);
      renderHome();
      openApp("debug");
    });
  });

  $$("[data-edit-app]").forEach(btn => {
    btn.addEventListener("click", () => {
      const app = state.customApps.find(a => a.id === btn.dataset.editApp);
      if (!app) return;
      $("#debugOriginalId").value = app.id;
      $("#debugId").value = app.id;
      $("#debugName").value = app.name || "";
      $("#debugIcon").value = app.icon || "";
      $("#debugType").value = app.type || "text";
      $("#debugDesc").value = app.description || "";
      $("#debugContent").value =
        app.type === "list" ? (app.items || []).join("\n")
        : app.type === "html" ? (app.html || "")
        : (app.content?.body || "");
      notify("Editing app", app.name);
    });
  });
}

function clearDebugForm() {
  $("#debugOriginalId").value = "";
  $("#debugId").value = "";
  $("#debugName").value = "";
  $("#debugIcon").value = "";
  $("#debugType").value = "text";
  $("#debugDesc").value = "";
  $("#debugContent").value = "";
}

function attachNotesEvents() {
  $("#noteBox").addEventListener("input", (e) => {
    state.note = e.target.value;
    localStorage.setItem(STORAGE_KEYS.note, state.note);
  });
}

function attachCalcEvents() {
  $$("[data-calc]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.calc;
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
      $("#calcDisplay").textContent = state.calc;
    });
  });
}

function notify(title, body) {
  const list = $("#notificationList");
  const article = document.createElement("article");
  article.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body || "")}</span>`;
  list.prepend(article);
}

function toggleShade() {
  $("#shade").classList.toggle("open");
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function roman(number) {
  const values = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return values[number] || String(number);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function initGestures() {
  let startX = null;
  let startY = null;

  $("#screen").addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  $("#screen").addEventListener("touchend", (e) => {
    if (startX === null || startY === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;

    if (state.locked && dy < -45) unlockPhone();

    if (!state.locked && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) && $("#homeView").classList.contains("active")) {
      state.currentPage += dx < 0 ? 1 : -1;
      const pageCount = Math.max(1, Math.ceil(state.layout.home.length / appsPerPage));
      state.currentPage = Math.max(0, Math.min(pageCount - 1, state.currentPage));
      renderHome();
    }

    if (!state.locked && dy > 55 && startY < 85) toggleShade();

    startX = null;
    startY = null;
  }, { passive: true });
}

$("#unlockBtn").addEventListener("click", unlockPhone);
$("#lockBtn").addEventListener("click", () => state.locked ? unlockPhone() : lockPhone());
$("#shadeBtn").addEventListener("click", toggleShade);
$("#backBtn").addEventListener("click", () => showView("#homeView"));
$("#editToggle").addEventListener("click", () => {
  state.editing = !state.editing;
  state.draggedAppId = null;
  renderHome();
});
$("#resetLayout").addEventListener("click", resetLayout);
$("#openDebug").addEventListener("click", () => {
  unlockPhone();
  openApp("debug");
});
$("#quickTheme").addEventListener("click", cycleTheme);
$("#quickSand").addEventListener("click", () => {
  $("#phoneShell").classList.toggle("sandstorm");
  notify("Sandstorm", $("#phoneShell").classList.contains("sandstorm") ? "The sand is moving." : "The sand calmed down.");
});
$("#quickLock").addEventListener("click", lockPhone);

document.addEventListener("click", (e) => {
  const folderOpen = e.target.closest("[data-folder-open]");
  if (folderOpen) openApp(folderOpen.dataset.folderOpen);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") showView(state.locked ? "#lockView" : "#homeView");
  if (!state.locked && e.key === "ArrowRight") {
    state.currentPage++;
    const pageCount = Math.max(1, Math.ceil(state.layout.home.length / appsPerPage));
    state.currentPage = Math.min(pageCount - 1, state.currentPage);
    renderHome();
  }
  if (!state.locked && e.key === "ArrowLeft") {
    state.currentPage = Math.max(0, state.currentPage - 1);
    renderHome();
  }
});

state.layout = loadLayout();
setTheme(state.themeIndex);
renderHome();
notify("Awakened", "The ancient phone UI is ready.");
notify("Tip", "Use Edit mode to move apps. Use Debug to create apps.");
updateClock();
setInterval(updateClock, 1000);
$("#batteryText").textContent = `${Math.floor(Math.random() * 30) + 68}%`;
initGestures();
