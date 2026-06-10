const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

const CONFIG = window.ANCENTPHONE_CONFIG || {};
const STORAGE = {
  layout: "ancentphone.physics.layout.v1",
  customApps: "ancentphone.physics.customApps.v1",
  note: "ancentphone.physics.note.v1",
  theme: "ancentphone.physics.theme.v1"
};

const state = {
  locked: true,
  moving: false,
  gravity: false,
  tilt: false,
  themeIndex: Number(localStorage.getItem(STORAGE.theme) || 0),
  note: localStorage.getItem(STORAGE.note) || "Ancient notes:\n- Apps can link to websites\n- Move mode lets you swipe apps around\n- Gravity mode makes apps fall\n- Tilt mode makes the phone feel alive",
  customApps: loadCustomApps(),
  layout: null,
  bodies: {},
  grabbed: null,
  calc: "0",
  lastTime: performance.now(),
  pointerStart: null,
  phoneTilt: { x: 0, y: 0 },
  sensorTilt: { x: 0, y: 0 }
};

const builtInApps = Array.isArray(CONFIG.apps) ? CONFIG.apps : [];
const themes = Array.isArray(CONFIG.themes) ? CONFIG.themes : [{ name: "Default", className: "" }];

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
  try { return JSON.parse(localStorage.getItem(STORAGE.customApps) || "[]"); }
  catch { return []; }
}

function saveCustomApps() {
  localStorage.setItem(STORAGE.customApps, JSON.stringify(state.customApps));
}

function defaultLayout() {
  const ids = getAllApps().map(app => app.id);
  const dock = (CONFIG.dock || []).filter(id => ids.includes(id)).slice(0, 4);
  const home = ids.filter(id => !dock.includes(id));
  return { dock, home, positions: {} };
}

function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.layout) || "null");
    if (!saved || !Array.isArray(saved.home) || !Array.isArray(saved.dock)) return defaultLayout();

    const ids = getAllApps().map(app => app.id);
    const valid = new Set(ids);

    const dock = saved.dock.filter(id => valid.has(id)).slice(0, 4);
    const home = saved.home.filter(id => valid.has(id) && !dock.includes(id));
    for (const id of ids) {
      if (!dock.includes(id) && !home.includes(id)) home.push(id);
    }

    return { dock, home, positions: saved.positions || {} };
  } catch {
    return defaultLayout();
  }
}

function saveLayout() {
  localStorage.setItem(STORAGE.layout, JSON.stringify(state.layout));
}

function setTheme(index) {
  state.themeIndex = ((index % themes.length) + themes.length) % themes.length;
  localStorage.setItem(STORAGE.theme, state.themeIndex);
  const shell = $("#phoneShell");
  shell.classList.remove(...themes.map(t => t.className).filter(Boolean));
  const theme = themes[state.themeIndex];
  if (theme?.className) shell.classList.add(theme.className);
}

function cycleTheme() {
  setTheme(state.themeIndex + 1);
  notify("Theme changed", themes[state.themeIndex]?.name || "Unknown theme");
}

function showView(id) {
  $$(".view").forEach(view => view.classList.remove("active"));
  $(id).classList.add("active");
}

function lockPhone() {
  state.locked = true;
  $("#shade").classList.remove("open");
  showView("#lockView");
  $("#modeText").textContent = "SLEEP";
}

function unlockPhone() {
  state.locked = false;
  showView("#homeView");
  $("#modeText").textContent = state.gravity ? "GRAV" : "HOME";
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
  $("#phoneSubtitle").textContent = CONFIG.phoneSubtitle || "Ancient phone";
  $("#homeView").classList.toggle("moving", state.moving);
  $("#editToggle").textContent = state.moving ? "Done" : "Move";
  $("#gravityToggle").textContent = state.gravity ? "Gravity ✓" : "Gravity";
  $("#modeText").textContent = state.gravity ? "GRAV" : state.moving ? "MOVE" : "HOME";

  const appSpace = $("#appSpace");
  appSpace.innerHTML = "";

  const homeIds = state.layout.home.filter(id => getApp(id));
  const rect = getSpaceSize();

  homeIds.forEach((appId, index) => {
    const app = getApp(appId);
    if (!state.layout.positions[appId]) {
      state.layout.positions[appId] = gridPosition(index, rect);
    }

    const pos = state.layout.positions[appId];
    state.bodies[appId] = state.bodies[appId] || {
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      rot: 0,
      vr: 0
    };
    state.bodies[appId].x = pos.x;
    state.bodies[appId].y = pos.y;

    appSpace.appendChild(createHomeIcon(appId));
  });

  renderDock();
  applyBodyPositions();
  saveLayout();
}

function renderDock() {
  const dock = $("#dock");
  dock.innerHTML = "";
  state.layout.dock.filter(id => getApp(id)).slice(0, 4).forEach(id => {
    const app = getApp(id);
    const btn = document.createElement("button");
    btn.className = "dock-icon";
    btn.textContent = app.icon || "𓂀";
    btn.title = app.name;
    btn.addEventListener("click", () => openApp(id));
    dock.appendChild(btn);
  });
}

function createHomeIcon(appId) {
  const app = getApp(appId);
  const btn = document.createElement("button");
  btn.className = "app-icon";
  btn.dataset.appId = appId;
  btn.innerHTML = `<span class="glyph">${app.icon || "𓂀"}</span><b>${escapeHtml(app.name || app.id)}</b>`;

  btn.addEventListener("pointerdown", (e) => {
    if (state.locked) return;
    const body = state.bodies[appId];
    const now = performance.now();

    state.pointerStart = {
      id: appId,
      x: e.clientX,
      y: e.clientY,
      bodyX: body.x,
      bodyY: body.y,
      time: now
    };

    if (state.moving || state.gravity) {
      state.grabbed = appId;
      btn.setPointerCapture(e.pointerId);
      btn.classList.add("grabbed");
      body.vx = 0;
      body.vy = 0;
    }
  });

  btn.addEventListener("pointermove", (e) => {
    if (state.grabbed !== appId || !state.pointerStart) return;
    const body = state.bodies[appId];
    const rect = getSpaceSize();
    const dx = e.clientX - state.pointerStart.x;
    const dy = e.clientY - state.pointerStart.y;
    body.x = clamp(state.pointerStart.bodyX + dx, 0, rect.w - 76);
    body.y = clamp(state.pointerStart.bodyY + dy, 0, rect.h - 88);
    body.rot = dx * 0.08;
    body.vx = dx * 0.25;
    body.vy = dy * 0.25;
    state.layout.positions[appId] = { x: body.x, y: body.y };
    applyBodyPositions();
  });

  btn.addEventListener("pointerup", (e) => {
    const start = state.pointerStart;
    const body = state.bodies[appId];
    btn.classList.remove("grabbed");

    if (state.grabbed === appId && start) {
      const dt = Math.max(1, performance.now() - start.time);
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      // Swipe to throw/move apps.
      if (Math.hypot(dx, dy) > 26) {
        body.vx = dx / dt * 18;
        body.vy = dy / dt * 18;
        body.vr = dx * 0.03;
        notify("App swiped", `${getApp(appId).name} got shoved across the slab.`);
      }

      state.layout.positions[appId] = { x: body.x, y: body.y };
      saveLayout();
    }

    if (!state.moving && !state.gravity && start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) < 12) openApp(appId);
    }

    state.grabbed = null;
    state.pointerStart = null;
  });

  btn.addEventListener("pointercancel", () => {
    btn.classList.remove("grabbed");
    state.grabbed = null;
    state.pointerStart = null;
  });

  return btn;
}

function applyBodyPositions() {
  $$(".app-icon[data-app-id]").forEach(el => {
    const id = el.dataset.appId;
    const body = state.bodies[id];
    if (!body) return;
    el.style.left = `${body.x}px`;
    el.style.top = `${body.y}px`;
    el.style.transform = `rotate(${body.rot}deg)`;
  });
}

function gridPosition(index, rect) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const gapX = Math.max(90, rect.w / 3);
  const gapY = 100;
  return {
    x: clamp(10 + col * gapX, 0, rect.w - 76),
    y: clamp(8 + row * gapY, 0, rect.h - 88)
  };
}

function getSpaceSize() {
  const el = $("#appSpace");
  const rect = el.getBoundingClientRect();
  return { w: Math.max(rect.width, 300), h: Math.max(rect.height, 360) };
}

function tick(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000);
  state.lastTime = now;

  if (state.gravity && $("#homeView").classList.contains("active")) {
    physicsStep(dt);
    applyBodyPositions();
  }

  if (state.tilt) {
    const tiltX = state.sensorTilt.x || state.phoneTilt.x;
    const tiltY = state.sensorTilt.y || state.phoneTilt.y;
    $("#phoneShell").style.transform = `rotateX(${clamp(-tiltY, -12, 12)}deg) rotateY(${clamp(tiltX, -12, 12)}deg)`;
  } else {
    $("#phoneShell").style.transform = "";
  }

  requestAnimationFrame(tick);
}

function physicsStep(dt) {
  const rect = getSpaceSize();
  const gravityX = state.tilt ? state.phoneTilt.x * 35 + state.sensorTilt.x * 18 : 0;
  const gravityY = 650 + (state.tilt ? state.phoneTilt.y * 22 + state.sensorTilt.y * 10 : 0);

  for (const id of state.layout.home) {
    const body = state.bodies[id];
    if (!body || state.grabbed === id) continue;

    body.vx += gravityX * dt;
    body.vy += gravityY * dt;

    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.rot += body.vr * dt;

    body.vx *= 0.992;
    body.vy *= 0.992;
    body.vr *= 0.985;

    if (body.x < 0) { body.x = 0; body.vx *= -0.62; body.vr += body.vy * 0.015; }
    if (body.x > rect.w - 76) { body.x = rect.w - 76; body.vx *= -0.62; body.vr -= body.vy * 0.015; }
    if (body.y < 0) { body.y = 0; body.vy *= -0.55; }
    if (body.y > rect.h - 88) { body.y = rect.h - 88; body.vy *= -0.5; body.vx *= 0.92; body.vr += body.vx * 0.03; }

    state.layout.positions[id] = { x: body.x, y: body.y };
  }

  collideIcons();
}

function collideIcons() {
  const ids = state.layout.home;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = state.bodies[ids[i]];
      const b = state.bodies[ids[j]];
      if (!a || !b) continue;

      const ax = a.x + 38, ay = a.y + 38;
      const bx = b.x + 38, by = b.y + 38;
      const dx = bx - ax, dy = by - ay;
      const dist = Math.hypot(dx, dy);
      const minDist = 58;

      if (dist > 0 && dist < minDist) {
        const nx = dx / dist, ny = dy / dist;
        const push = (minDist - dist) * 0.5;

        if (state.grabbed !== ids[i]) {
          a.x -= nx * push;
          a.y -= ny * push;
          a.vx -= nx * 18;
          a.vy -= ny * 18;
        }
        if (state.grabbed !== ids[j]) {
          b.x += nx * push;
          b.y += ny * push;
          b.vx += nx * 18;
          b.vy += ny * 18;
        }
      }
    }
  }
}

function toggleGravity() {
  state.gravity = !state.gravity;
  $("#gravityToggle").textContent = state.gravity ? "Gravity ✓" : "Gravity";
  $("#quickGravity").textContent = state.gravity ? "Gravity ✓" : "Gravity";
  $("#modeText").textContent = state.gravity ? "GRAV" : "HOME";
  notify("Gravity", state.gravity ? "Apps now fall and bump around." : "Apps stopped falling.");
}

function toggleTilt() {
  state.tilt = !state.tilt;
  $("#quickTilt").textContent = state.tilt ? "Tilt ✓" : "Tilt";
  notify("Tilt", state.tilt ? "Move your mouse, or tilt your device if supported." : "Tilt mode disabled.");
}

function chaosApps() {
  const rect = getSpaceSize();
  for (const id of state.layout.home) {
    const body = state.bodies[id];
    if (!body) continue;
    body.vx = (Math.random() - 0.5) * 900;
    body.vy = (Math.random() - 0.9) * 800;
    body.vr = (Math.random() - 0.5) * 300;
    body.x = clamp(body.x, 0, rect.w - 76);
    body.y = clamp(body.y, 0, rect.h - 88);
  }
  state.gravity = true;
  renderHome();
  notify("Chaos", "The icons have been cursed.");
}

function resetLayout() {
  state.layout = defaultLayout();
  state.bodies = {};
  saveLayout();
  renderHome();
  notify("Layout reset", "Apps returned to their ancient grid.");
}

function spawnRandomApp() {
  const id = `spawned-${Date.now()}`;
  const icons = ["🪲", "🏺", "🧱", "🌵", "🔥", "👁️", "🦴", "🧿"];
  const app = {
    id,
    name: `Relic ${state.customApps.length + 1}`,
    icon: icons[Math.floor(Math.random() * icons.length)],
    type: "text",
    description: "Randomly spawned relic app.",
    content: {
      title: "Random Relic",
      body: "This app was spawned from the helper panel."
    }
  };
  state.customApps.push(app);
  saveCustomApps();
  state.layout.home.push(id);
  state.layout.positions[id] = gridPosition(state.layout.home.length - 1, getSpaceSize());
  saveLayout();
  renderHome();
  notify("Random app spawned", app.name);
}

function openApp(appId) {
  const app = getApp(appId);
  if (!app) return;

  if (app.type === "link") {
    openLinkApp(app);
    return;
  }

  $("#appTitle").textContent = app.name || app.id;
  $("#appDesc").textContent = app.description || "Ancient app";
  $("#appContent").innerHTML = renderApp(app);
  showView("#appView");
  $("#modeText").textContent = "APP";

  if (app.type === "debug") attachDebugEvents();
  if (app.type === "notes") attachNotesEvents();
  if (app.type === "calculator") attachCalcEvents();
  if (app.type === "settings") attachSettingsEvents();
}

function openLinkApp(app) {
  const url = app.url || "#";
  if (app.openInNewTab !== false) {
    window.open(url, "_blank", "noopener,noreferrer");
    notify("Opening link", `${app.name} opened in a new tab.`);
  } else {
    location.href = url;
  }
}

function renderApp(app) {
  switch (app.type) {
    case "debug": return renderDebugApp();
    case "notes":
      return `<textarea class="note-box" id="noteBox" spellcheck="false">${escapeHtml(state.note)}</textarea>
              <div class="app-card"><p>This saves in this browser.</p></div>`;
    case "settings":
      return `<div class="setting-row"><div><strong>Gravity Apps</strong><span>Make icons fall and bounce.</span></div><button class="app-action" id="settingsGravity">Toggle</button></div>
              <div class="setting-row"><div><strong>Phone Tilt</strong><span>Phone follows mouse/device tilt.</span></div><button class="app-action" id="settingsTilt">Toggle</button></div>
              <div class="setting-row"><div><strong>Sandstorm</strong><span>Moving sand background.</span></div><button class="app-action" id="settingsSand">Toggle</button></div>
              <div class="setting-row"><div><strong>Theme</strong><span>Cycle ancient colors.</span></div><button class="app-action" id="settingsTheme">Change</button></div>
              <div class="setting-row"><div><strong>Layout</strong><span>Reset app positions.</span></div><button class="app-action" id="settingsReset">Reset</button></div>`;
    case "list":
      return `<div class="app-card"><h3>${escapeHtml(app.name)}</h3><p>${escapeHtml(app.description || "")}</p></div>` +
        (app.items || []).map(item => `<div class="app-card"><strong>${escapeHtml(item)}</strong><span>Relic entry</span></div>`).join("");
    case "folder":
      return `<div class="folder-panel"><h3>${escapeHtml(app.name)}</h3><span>${escapeHtml(app.description || "Grouped apps")}</span>
        <div class="folder-grid">${(app.children || []).filter(getApp).map(id => {
          const child = getApp(id);
          return `<button class="folder-app" data-folder-open="${child.id}">
            <span class="glyph">${child.icon || "𓂀"}</span><b>${escapeHtml(child.name)}</b>
          </button>`;
        }).join("")}</div></div>`;
    case "calculator": return renderCalculator();
    case "camera":
      return `<div class="app-card" style="min-height:260px;display:grid;place-items:center;font-size:4rem;">📷</div>
              <div class="app-card"><h3>Ancient Lens</h3><p>This is a safe fake camera app for static sites.</p></div>`;
    case "html": return `<div class="app-card">${app.html || ""}</div>`;
    case "text":
    default:
      const title = app.content?.title || app.name || "Text App";
      const body = app.content?.body || app.description || "Edit this app in config.js.";
      return `<div class="app-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body).replaceAll("\n", "<br>")}</p></div>`;
  }
}

function renderCalculator() {
  return `<div class="calc-display" id="calcDisplay">${escapeHtml(state.calc)}</div>
    <div class="calc-keys">
      ${["7","8","9","C","4","5","6","+","1","2","3","-","0",".","=","×"].map(k => `<button data-calc="${k}">${k}</button>`).join("")}
    </div>`;
}

function renderDebugApp() {
  const customCards = state.customApps.map(app => `
    <div class="app-card">
      <strong>${escapeHtml(app.icon || "𓂀")} ${escapeHtml(app.name)}</strong>
      <span>ID: ${escapeHtml(app.id)} / Type: ${escapeHtml(app.type)}</span>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.65rem;">
        <button class="app-action" data-edit-app="${app.id}">Edit</button>
        <button class="app-action" data-delete-app="${app.id}">Delete</button>
      </div>
    </div>
  `).join("");

  return `
    <div class="app-card">
      <h3>Debug / App Creator</h3>
      <p>Create local apps, including website link apps. Use Export to copy JSON into config.js later.</p>
    </div>
    <form class="debug-form" id="debugForm">
      <input type="hidden" id="debugOriginalId" />
      <div class="debug-row">
        <label>Name <input id="debugName" placeholder="My Site" required /></label>
        <label>Icon <input id="debugIcon" placeholder="🌐" maxlength="4" /></label>
      </div>
      <label>ID <input id="debugId" placeholder="my-site" required /></label>
      <label>Type
        <select id="debugType">
          <option value="link">Website Link</option>
          <option value="text">Text</option>
          <option value="list">List</option>
          <option value="html">HTML</option>
        </select>
      </label>
      <label>Description <input id="debugDesc" placeholder="What does this app do?" /></label>
      <label>URL or Content <textarea id="debugContent" rows="5" placeholder="https://example.com OR app text/list/html"></textarea></label>
      <div class="debug-row">
        <button type="submit">Save App</button>
        <button type="button" id="clearDebugForm">Clear</button>
      </div>
      <button type="button" id="exportApps">Copy Custom App JSON</button>
    </form>
    <div class="app-card"><h3>Custom Apps</h3><p>${state.customApps.length ? "Saved on this device:" : "No custom apps yet."}</p></div>
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
    const raw = $("#debugContent").value.trim();

    if (!id || !name) return notify("Missing info", "App needs a name and ID.");

    const app = { id, name, icon, type, description };

    if (type === "link") {
      app.url = raw || "https://example.com";
      app.openInNewTab = true;
    } else if (type === "list") {
      app.items = raw.split("\n").map(x => x.trim()).filter(Boolean);
    } else if (type === "html") {
      app.html = raw;
    } else {
      app.content = { title: name, body: raw };
    }

    state.customApps = state.customApps.filter(a => a.id !== originalId && a.id !== id);
    state.customApps.push(app);
    saveCustomApps();

    if (originalId && originalId !== id) {
      state.layout.home = state.layout.home.filter(x => x !== originalId);
      state.layout.dock = state.layout.dock.filter(x => x !== originalId);
      delete state.layout.positions[originalId];
      delete state.bodies[originalId];
    }

    if (!state.layout.home.includes(id) && !state.layout.dock.includes(id)) {
      state.layout.home.push(id);
      state.layout.positions[id] = gridPosition(state.layout.home.length - 1, getSpaceSize());
    }

    saveLayout();
    notify("App saved", name);
    renderHome();
    openApp("debug");
  });

  $("#clearDebugForm").addEventListener("click", () => {
    ["debugOriginalId", "debugName", "debugIcon", "debugId", "debugDesc", "debugContent"].forEach(id => $("#" + id).value = "");
    $("#debugType").value = "link";
  });

  $("#exportApps").addEventListener("click", () => copyText(JSON.stringify(state.customApps, null, 2), "Custom app JSON copied."));

  $$("[data-delete-app]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.deleteApp;
    state.customApps = state.customApps.filter(app => app.id !== id);
    state.layout.home = state.layout.home.filter(x => x !== id);
    state.layout.dock = state.layout.dock.filter(x => x !== id);
    delete state.layout.positions[id];
    delete state.bodies[id];
    saveCustomApps();
    saveLayout();
    notify("App deleted", id);
    renderHome();
    openApp("debug");
  }));

  $$("[data-edit-app]").forEach(btn => btn.addEventListener("click", () => {
    const app = state.customApps.find(a => a.id === btn.dataset.editApp);
    if (!app) return;
    $("#debugOriginalId").value = app.id;
    $("#debugId").value = app.id;
    $("#debugName").value = app.name || "";
    $("#debugIcon").value = app.icon || "";
    $("#debugType").value = app.type || "text";
    $("#debugDesc").value = app.description || "";
    $("#debugContent").value =
      app.type === "link" ? app.url || ""
      : app.type === "list" ? (app.items || []).join("\n")
      : app.type === "html" ? app.html || ""
      : app.content?.body || "";
    notify("Editing app", app.name);
  }));
}

function attachNotesEvents() {
  $("#noteBox").addEventListener("input", (e) => {
    state.note = e.target.value;
    localStorage.setItem(STORAGE.note, state.note);
  });
}

function attachCalcEvents() {
  $$("[data-calc]").forEach(btn => btn.addEventListener("click", () => {
    const key = btn.dataset.calc;
    if (key === "C") state.calc = "0";
    else if (key === "=") {
      try {
        const result = Function(`"use strict"; return (${state.calc.replaceAll("×", "*")})`)();
        state.calc = Number.isFinite(result) ? String(Math.round(result * 100000) / 100000) : "Nope";
      } catch {
        state.calc = "Nope";
      }
    } else {
      if (state.calc === "0" || state.calc === "Nope") state.calc = "";
      state.calc += key;
    }
    $("#calcDisplay").textContent = state.calc;
  }));
}

function attachSettingsEvents() {
  $("#settingsGravity").addEventListener("click", toggleGravity);
  $("#settingsTilt").addEventListener("click", toggleTilt);
  $("#settingsSand").addEventListener("click", () => $("#phoneShell").classList.toggle("sandstorm"));
  $("#settingsTheme").addEventListener("click", cycleTheme);
  $("#settingsReset").addEventListener("click", resetLayout);
}

function copyText(text, message) {
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  notify("Copied", message);
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

function initTilt() {
  $("#screen").addEventListener("pointermove", (e) => {
    const rect = $("#screen").getBoundingClientRect();
    state.phoneTilt.x = ((e.clientX - rect.left) / rect.width - 0.5) * 18;
    state.phoneTilt.y = ((e.clientY - rect.top) / rect.height - 0.5) * 18;
  });

  window.addEventListener("deviceorientation", (e) => {
    if (!state.tilt) return;
    state.sensorTilt.x = clamp(e.gamma || 0, -18, 18);
    state.sensorTilt.y = clamp(e.beta || 0, -18, 18) / 2;
  });
}

function initGestures() {
  let startY = null;
  $("#screen").addEventListener("touchstart", e => startY = e.touches[0].clientY, { passive: true });
  $("#screen").addEventListener("touchend", e => {
    if (startY === null) return;
    const dy = e.changedTouches[0].clientY - startY;
    if (state.locked && dy < -45) unlockPhone();
    if (!state.locked && dy > 55 && startY < 85) toggleShade();
    startY = null;
  }, { passive: true });
}

function slug(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

$("#unlockBtn").addEventListener("click", unlockPhone);
$("#lockBtn").addEventListener("click", () => state.locked ? unlockPhone() : lockPhone());
$("#shadeBtn").addEventListener("click", toggleShade);
$("#backBtn").addEventListener("click", () => {
  showView("#homeView");
  $("#modeText").textContent = state.gravity ? "GRAV" : state.moving ? "MOVE" : "HOME";
});
$("#gravityToggle").addEventListener("click", toggleGravity);
$("#quickGravity").addEventListener("click", toggleGravity);
$("#quickTilt").addEventListener("click", toggleTilt);
$("#quickLock").addEventListener("click", lockPhone);
$("#themeBtn").addEventListener("click", cycleTheme);
$("#chaosBtn").addEventListener("click", chaosApps);
$("#resetBtn").addEventListener("click", resetLayout);
$("#editToggle").addEventListener("click", () => {
  state.moving = !state.moving;
  renderHome();
  notify("Move mode", state.moving ? "Swipe or drag apps around." : "Move mode disabled.");
});
$("#openDebug").addEventListener("click", () => {
  unlockPhone();
  openApp("debug");
});
$("#spawnApp").addEventListener("click", spawnRandomApp);
$("#exportLayout").addEventListener("click", () => copyText(JSON.stringify(state.layout, null, 2), "Layout JSON copied."));

document.addEventListener("click", (e) => {
  const folderBtn = e.target.closest("[data-folder-open]");
  if (folderBtn) openApp(folderBtn.dataset.folderOpen);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") showView(state.locked ? "#lockView" : "#homeView");
});

state.layout = loadLayout();
setTheme(state.themeIndex);
renderHome();
updateClock();
setInterval(updateClock, 1000);
$("#batteryText").textContent = `${Math.floor(Math.random() * 31) + 66}%`;
notify("Ready", "Cursed phone mode loaded.");
notify("Tip", "Enable Move, then swipe icons around. Enable Gravity for falling apps.");
initTilt();
initGestures();
requestAnimationFrame(tick);
