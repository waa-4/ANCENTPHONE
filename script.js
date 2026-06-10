const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

const CONFIG = window.ANCENTPHONE_CONFIG || {};
const STORE = {
  layout: "ancentphone.stable.layout.v1",
  custom: "ancentphone.stable.custom.v1",
  note: "ancentphone.stable.note.v1",
  theme: "ancentphone.stable.theme.v1"
};

const state = {
  locked: true,
  moving: false,
  gravity: false,
  tilt: false,
  themeIndex: Number(localStorage.getItem(STORE.theme) || 0),
  customApps: safeJson(localStorage.getItem(STORE.custom), []),
  note: localStorage.getItem(STORE.note) || "Ancient notes:\n- Add website apps in config.js\n- Use Move to drag apps\n- Gravity makes apps fall\n- Debug can make local apps",
  layout: null,
  bodies: {},
  pointer: null,
  grabbed: null,
  calc: "0",
  mouseTiltX: 0,
  mouseTiltY: 0,
  lastFrame: performance.now()
};

function safeJson(text, fallback) {
  try { return JSON.parse(text) || fallback; }
  catch { return fallback; }
}

function allApps() {
  const result = [];
  const used = new Set();

  (CONFIG.apps || []).concat(state.customApps).forEach(app => {
    if (!app || !app.id || used.has(app.id)) return;
    used.add(app.id);
    result.push(app);
  });

  return result;
}

function appById(id) {
  return allApps().find(app => app.id === id);
}

function defaultLayout() {
  const ids = allApps().map(app => app.id);
  const dock = (CONFIG.dock || []).filter(id => ids.includes(id)).slice(0, 4);
  return {
    dock,
    home: ids.filter(id => !dock.includes(id)),
    positions: {}
  };
}

function loadLayout() {
  const saved = safeJson(localStorage.getItem(STORE.layout), null);
  if (!saved || !Array.isArray(saved.home) || !Array.isArray(saved.dock)) return defaultLayout();

  const ids = allApps().map(app => app.id);
  const valid = new Set(ids);
  const dock = saved.dock.filter(id => valid.has(id)).slice(0, 4);
  const home = saved.home.filter(id => valid.has(id) && !dock.includes(id));

  ids.forEach(id => {
    if (!dock.includes(id) && !home.includes(id)) home.push(id);
  });

  return {
    dock,
    home,
    positions: saved.positions || {}
  };
}

function saveLayout() {
  localStorage.setItem(STORE.layout, JSON.stringify(state.layout));
}

function saveCustomApps() {
  localStorage.setItem(STORE.custom, JSON.stringify(state.customApps));
}

function screenMode(text) {
  $("#modeText").textContent = text;
}

function showView(id) {
  $$(".view").forEach(view => view.classList.remove("active"));
  $(id).classList.add("active");
}

function unlock() {
  state.locked = false;
  showView("#homeView");
  screenMode(state.gravity ? "GRAV" : state.moving ? "MOVE" : "HOME");
}

function lock() {
  state.locked = true;
  $("#log").classList.remove("open");
  showView("#lockView");
  screenMode("SLEEP");
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  $("#timeText").textContent = time;
  $("#lockTime").textContent = time;
  $("#dateText").textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function setTheme(index) {
  const themes = CONFIG.themes || [{ className: "" }];
  state.themeIndex = ((index % themes.length) + themes.length) % themes.length;
  localStorage.setItem(STORE.theme, state.themeIndex);

  const phone = $("#phone");
  themes.forEach(theme => {
    if (theme.className) phone.classList.remove(theme.className);
  });

  const theme = themes[state.themeIndex];
  if (theme && theme.className) phone.classList.add(theme.className);
}

function cycleTheme() {
  setTheme(state.themeIndex + 1);
  const themes = CONFIG.themes || [];
  notify("Theme", themes[state.themeIndex]?.name || "Changed");
}

function appAreaSize() {
  const rect = $("#appArea").getBoundingClientRect();
  return {
    w: Math.max(250, rect.width),
    h: Math.max(300, rect.height)
  };
}

function gridPos(index) {
  const area = appAreaSize();
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: Math.min(10 + col * 92, area.w - 78),
    y: Math.min(8 + row * 96, area.h - 90)
  };
}

function renderHome() {
  if (!state.layout) state.layout = loadLayout();

  $("#phoneName").textContent = CONFIG.phoneName || "AncentPhone";
  $("#phoneSub").textContent = CONFIG.phoneSubtitle || "Stable cursed phone";
  $("#homeView").classList.toggle("moving", state.moving);
  $("#moveBtn").textContent = state.moving ? "Done" : "Move";
  $("#gravityBtn").textContent = state.gravity ? "Gravity ✓" : "Gravity";
  $("#logGravity").textContent = state.gravity ? "Gravity ✓" : "Gravity";
  $("#tiltBtn").textContent = state.tilt ? "Tilt ✓" : "Tilt";

  const appArea = $("#appArea");
  appArea.innerHTML = "";

  state.layout.home = state.layout.home.filter(id => appById(id));
  state.layout.dock = state.layout.dock.filter(id => appById(id)).slice(0, 4);

  state.layout.home.forEach((id, index) => {
    const saved = state.layout.positions[id] || gridPos(index);
    const body = state.bodies[id] || { x: saved.x, y: saved.y, vx: 0, vy: 0, rot: 0, vr: 0 };
    body.x = Number.isFinite(saved.x) ? saved.x : gridPos(index).x;
    body.y = Number.isFinite(saved.y) ? saved.y : gridPos(index).y;
    state.bodies[id] = body;
    appArea.appendChild(makeIcon(id));
  });

  renderDock();
  applyPositions();
  saveLayout();
}

function renderDock() {
  const dock = $("#dock");
  dock.innerHTML = "";

  state.layout.dock.forEach(id => {
    const app = appById(id);
    if (!app) return;

    const btn = document.createElement("button");
    btn.textContent = app.icon || "𓂀";
    btn.title = app.name;
    btn.addEventListener("click", () => openApp(id));
    dock.appendChild(btn);
  });
}

function makeIcon(id) {
  const app = appById(id);
  const btn = document.createElement("button");
  btn.className = "appIcon";
  btn.dataset.id = id;
  btn.innerHTML = `<span class="glyph">${app.icon || "𓂀"}</span><b>${escapeText(app.name || id)}</b>`;

  btn.addEventListener("pointerdown", event => {
    const body = state.bodies[id];
    state.pointer = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      bodyX: body.x,
      bodyY: body.y,
      time: performance.now()
    };

    if (state.moving || state.gravity) {
      state.grabbed = id;
      body.vx = 0;
      body.vy = 0;
      btn.classList.add("dragging");
      btn.setPointerCapture(event.pointerId);
    }
  });

  btn.addEventListener("pointermove", event => {
    if (state.grabbed !== id || !state.pointer) return;

    const body = state.bodies[id];
    const area = appAreaSize();
    const dx = event.clientX - state.pointer.startX;
    const dy = event.clientY - state.pointer.startY;

    body.x = clamp(state.pointer.bodyX + dx, 0, area.w - 78);
    body.y = clamp(state.pointer.bodyY + dy, 0, area.h - 90);
    body.rot = dx * 0.08;
    state.layout.positions[id] = { x: body.x, y: body.y };
    applyPositions();
  });

  btn.addEventListener("pointerup", event => {
    btn.classList.remove("dragging");

    if (!state.pointer) return;

    const dx = event.clientX - state.pointer.startX;
    const dy = event.clientY - state.pointer.startY;
    const distance = Math.hypot(dx, dy);
    const body = state.bodies[id];

    if (state.grabbed === id) {
      const time = Math.max(16, performance.now() - state.pointer.time);

      if (distance > 20) {
        body.vx = dx / time * 20;
        body.vy = dy / time * 20;
        body.vr = dx * 0.03;
      }

      state.layout.positions[id] = { x: body.x, y: body.y };
      saveLayout();
    } else if (distance < 10) {
      openApp(id);
    }

    state.grabbed = null;
    state.pointer = null;
  });

  btn.addEventListener("pointercancel", () => {
    btn.classList.remove("dragging");
    state.grabbed = null;
    state.pointer = null;
  });

  return btn;
}

function applyPositions() {
  $$(".appIcon").forEach(icon => {
    const id = icon.dataset.id;
    const body = state.bodies[id];
    if (!body) return;

    icon.style.left = `${body.x}px`;
    icon.style.top = `${body.y}px`;
    icon.style.transform = `rotate(${body.rot || 0}deg)`;
  });
}

function physicsStep(dt) {
  const area = appAreaSize();

  state.layout.home.forEach(id => {
    const body = state.bodies[id];
    if (!body || state.grabbed === id) return;

    const tiltX = state.tilt ? state.mouseTiltX * 28 : 0;
    const tiltY = state.tilt ? state.mouseTiltY * 16 : 0;

    body.vx += tiltX * dt;
    body.vy += (650 + tiltY) * dt;

    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.rot += (body.vr || 0) * dt;

    body.vx *= 0.992;
    body.vy *= 0.992;
    body.vr = (body.vr || 0) * 0.985;

    if (body.x < 0) { body.x = 0; body.vx *= -0.58; }
    if (body.x > area.w - 78) { body.x = area.w - 78; body.vx *= -0.58; }
    if (body.y < 0) { body.y = 0; body.vy *= -0.52; }
    if (body.y > area.h - 90) {
      body.y = area.h - 90;
      body.vy *= -0.46;
      body.vx *= 0.93;
    }

    state.layout.positions[id] = { x: body.x, y: body.y };
  });
}

function animate(now) {
  const dt = Math.min(0.035, (now - state.lastFrame) / 1000);
  state.lastFrame = now;

  if (state.gravity && $("#homeView").classList.contains("active")) {
    physicsStep(dt);
    applyPositions();
  }

  if (state.tilt) {
    $("#phone").style.transform = `rotateX(${clamp(-state.mouseTiltY / 2, -10, 10)}deg) rotateY(${clamp(state.mouseTiltX / 2, -10, 10)}deg)`;
  } else {
    $("#phone").style.transform = "";
  }

  requestAnimationFrame(animate);
}

function toggleGravity() {
  state.gravity = !state.gravity;
  if (state.gravity) showView("#homeView");
  renderHome();
  notify("Gravity", state.gravity ? "Apps now fall." : "Apps stopped falling.");
}

function toggleMove() {
  state.moving = !state.moving;
  renderHome();
  notify("Move", state.moving ? "Drag or swipe apps." : "Move mode off.");
}

function toggleTilt() {
  state.tilt = !state.tilt;
  renderHome();
  notify("Tilt", state.tilt ? "Phone tilt enabled." : "Phone tilt disabled.");
}

function chaos() {
  state.gravity = true;
  state.layout.home.forEach(id => {
    const body = state.bodies[id];
    if (!body) return;
    body.vx = (Math.random() - 0.5) * 900;
    body.vy = (Math.random() - 0.9) * 800;
    body.vr = (Math.random() - 0.5) * 240;
  });
  renderHome();
  notify("Chaos", "Apps have been thrown.");
}

function resetLayout() {
  localStorage.removeItem(STORE.layout);
  state.layout = defaultLayout();
  state.bodies = {};
  renderHome();
  notify("Reset", "Layout fixed.");
}

function openApp(id) {
  const app = appById(id);
  if (!app) return;

  if (app.type === "link") {
    openLink(app);
    return;
  }

  $("#appTitle").textContent = app.name || id;
  $("#appDesc").textContent = app.description || "Ancient app";
  $("#appContent").innerHTML = renderApp(app);
  showView("#appView");
  screenMode("APP");

  if (app.type === "notes") attachNotes();
  if (app.type === "calculator") attachCalc();
  if (app.type === "settings") attachSettings();
  if (app.type === "debug") attachDebug();
}

function openLink(app) {
  if (!app.url) return;
  if (app.openInNewTab === false) {
    location.href = app.url;
  } else {
    window.open(app.url, "_blank", "noopener,noreferrer");
    notify("Link", `Opening ${app.name}.`);
  }
}

function renderApp(app) {
  if (app.type === "notes") {
    return `<textarea id="noteBox" class="noteBox" spellcheck="false">${escapeText(state.note)}</textarea><div class="card"><p>Notes save in this browser.</p></div>`;
  }

  if (app.type === "settings") {
    return `
      <div class="setting"><div><strong>Gravity</strong><span>Apps fall and bounce.</span></div><button id="setGravity" class="actionBtn">Toggle</button></div>
      <div class="setting"><div><strong>Move Mode</strong><span>Drag/swipe apps.</span></div><button id="setMove" class="actionBtn">Toggle</button></div>
      <div class="setting"><div><strong>Tilt</strong><span>Phone reacts to mouse.</span></div><button id="setTilt" class="actionBtn">Toggle</button></div>
      <div class="setting"><div><strong>Sandstorm</strong><span>Animated sand.</span></div><button id="setSand" class="actionBtn">Toggle</button></div>
      <div class="setting"><div><strong>Theme</strong><span>Change ancient colors.</span></div><button id="setTheme" class="actionBtn">Change</button></div>
      <div class="setting"><div><strong>Reset</strong><span>Fix app positions.</span></div><button id="setReset" class="actionBtn">Reset</button></div>
    `;
  }

  if (app.type === "debug") return renderDebug();

  if (app.type === "calculator") {
    return `<div id="calcDisplay" class="calcDisplay">${escapeText(state.calc)}</div>
      <div class="calcKeys">${["7","8","9","C","4","5","6","+","1","2","3","-","0",".","=","×"].map(k => `<button data-calc="${k}">${k}</button>`).join("")}</div>`;
  }

  if (app.type === "camera") {
    return `<div class="card" style="min-height:250px;display:grid;place-items:center;font-size:4rem;">📷</div><div class="card"><h3>Ancient Lens</h3><p>Fake camera for a static site.</p></div>`;
  }

  if (app.type === "list") {
    return `<div class="card"><h3>${escapeText(app.name)}</h3><p>${escapeText(app.description || "")}</p></div>` +
      (app.items || []).map(item => `<div class="card"><strong>${escapeText(item)}</strong><p>Relic entry</p></div>`).join("");
  }

  if (app.type === "folder") {
    const children = (app.children || []).filter(id => appById(id));
    return `<div class="card"><h3>${escapeText(app.name)}</h3><p>${escapeText(app.description || "")}</p>
      <div class="folderGrid">${children.map(id => {
        const child = appById(id);
        return `<button data-folder-open="${child.id}"><span class="glyph">${child.icon || "𓂀"}</span><b>${escapeText(child.name)}</b></button>`;
      }).join("")}</div></div>`;
  }

  if (app.type === "html") {
    return `<div class="card">${app.html || ""}</div>`;
  }

  const title = app.content?.title || app.name || "Text";
  const body = app.content?.body || app.description || "Edit this in config.js.";
  return `<div class="card"><h3>${escapeText(title)}</h3><p>${escapeText(body).replaceAll("\\n", "<br>")}</p></div>`;
}

function renderDebug() {
  const cards = state.customApps.map(app => `
    <div class="card">
      <strong>${escapeText(app.icon || "𓂀")} ${escapeText(app.name)}</strong>
      <p>ID: ${escapeText(app.id)} / Type: ${escapeText(app.type)}</p>
      <button class="actionBtn" data-edit="${app.id}">Edit</button>
      <button class="actionBtn" data-delete="${app.id}">Delete</button>
    </div>
  `).join("");

  return `
    <div class="card"><h3>Debug / App Creator</h3><p>Create local apps. For permanent apps, copy exported JSON into config.js.</p></div>
    <form id="debugForm" class="debugForm">
      <input id="originalId" type="hidden" />
      <div class="formRow">
        <label>Name <input id="debugName" required placeholder="My Site"></label>
        <label>Icon <input id="debugIcon" maxlength="4" placeholder="🌐"></label>
      </div>
      <label>ID <input id="debugId" required placeholder="my-site"></label>
      <label>Type
        <select id="debugType">
          <option value="link">Website Link</option>
          <option value="text">Text</option>
          <option value="list">List</option>
          <option value="html">HTML</option>
        </select>
      </label>
      <label>Description <input id="debugDesc" placeholder="What does this app do?"></label>
      <label>URL / Content <textarea id="debugBody" rows="5" placeholder="https://example.com OR text/list/html"></textarea></label>
      <div class="formRow">
        <button type="submit">Save</button>
        <button type="button" id="clearDebug">Clear</button>
      </div>
      <button type="button" id="copyCustom">Copy Custom App JSON</button>
    </form>
    ${cards || `<div class="card"><p>No custom apps yet.</p></div>`}
  `;
}

function attachNotes() {
  $("#noteBox").addEventListener("input", event => {
    state.note = event.target.value;
    localStorage.setItem(STORE.note, state.note);
  });
}

function attachSettings() {
  $("#setGravity").addEventListener("click", toggleGravity);
  $("#setMove").addEventListener("click", toggleMove);
  $("#setTilt").addEventListener("click", toggleTilt);
  $("#setSand").addEventListener("click", () => $("#phone").classList.toggle("sandstorm"));
  $("#setTheme").addEventListener("click", cycleTheme);
  $("#setReset").addEventListener("click", resetLayout);
}

function attachCalc() {
  $$("[data-calc]").forEach(btn => {
    btn.addEventListener("click", () => {
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
    });
  });
}

function attachDebug() {
  $("#debugForm").addEventListener("submit", event => {
    event.preventDefault();

    const originalId = $("#originalId").value.trim();
    const id = slug($("#debugId").value);
    const name = $("#debugName").value.trim();
    const icon = $("#debugIcon").value.trim() || "𓂀";
    const type = $("#debugType").value;
    const description = $("#debugDesc").value.trim();
    const raw = $("#debugBody").value.trim();

    if (!id || !name) {
      notify("Missing", "App needs an ID and name.");
      return;
    }

    const app = { id, name, icon, type, description };

    if (type === "link") {
      app.url = raw || "https://example.com";
      app.openInNewTab = true;
    } else if (type === "list") {
      app.items = raw.split("\\n").map(x => x.trim()).filter(Boolean);
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
      delete state.layout.positions[originalId];
      delete state.bodies[originalId];
    }

    if (!state.layout.home.includes(id) && !state.layout.dock.includes(id)) {
      state.layout.home.push(id);
      state.layout.positions[id] = gridPos(state.layout.home.length - 1);
    }

    saveLayout();
    renderHome();
    notify("Saved", `${name} added.`);
    openApp("debug");
  });

  $("#clearDebug").addEventListener("click", () => {
    ["originalId", "debugName", "debugIcon", "debugId", "debugDesc", "debugBody"].forEach(id => $("#" + id).value = "");
    $("#debugType").value = "link";
  });

  $("#copyCustom").addEventListener("click", () => copyText(JSON.stringify(state.customApps, null, 2)));

  $$("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.delete;
      state.customApps = state.customApps.filter(app => app.id !== id);
      state.layout.home = state.layout.home.filter(x => x !== id);
      delete state.layout.positions[id];
      delete state.bodies[id];
      saveCustomApps();
      saveLayout();
      renderHome();
      notify("Deleted", id);
      openApp("debug");
    });
  });

  $$("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const app = state.customApps.find(a => a.id === btn.dataset.edit);
      if (!app) return;

      $("#originalId").value = app.id;
      $("#debugName").value = app.name || "";
      $("#debugIcon").value = app.icon || "";
      $("#debugId").value = app.id || "";
      $("#debugType").value = app.type || "text";
      $("#debugDesc").value = app.description || "";
      $("#debugBody").value =
        app.type === "link" ? app.url || "" :
        app.type === "list" ? (app.items || []).join("\\n") :
        app.type === "html" ? app.html || "" :
        app.content?.body || "";
    });
  });
}

function notify(title, body) {
  const item = document.createElement("article");
  item.innerHTML = `<strong>${escapeText(title)}</strong><span>${escapeText(body || "")}</span>`;
  $("#logList").prepend(item);
}

function copyText(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  notify("Copied", "JSON copied if clipboard permission allowed.");
}

function spawnApp() {
  const id = `relic-${Date.now()}`;
  const icons = ["🪲", "🏺", "🧱", "🌵", "🔥", "👁️", "🦴", "🧿"];
  const app = {
    id,
    name: `Relic ${state.customApps.length + 1}`,
    icon: icons[Math.floor(Math.random() * icons.length)],
    type: "text",
    description: "Spawned app.",
    content: {
      title: "Random Relic",
      body: "This app was spawned from the side panel."
    }
  };

  state.customApps.push(app);
  saveCustomApps();
  state.layout.home.push(id);
  state.layout.positions[id] = gridPos(state.layout.home.length - 1);
  saveLayout();
  renderHome();
  notify("Spawned", app.name);
}

function toggleLog() {
  $("#log").classList.toggle("open");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function slug(text) {
  return String(text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeText(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

$("#unlockBtn").addEventListener("click", unlock);
$("#powerBtn").addEventListener("click", () => state.locked ? unlock() : lock());
$("#lockBtn").addEventListener("click", lock);
$("#logBtn").addEventListener("click", toggleLog);
$("#backBtn").addEventListener("click", () => {
  showView("#homeView");
  screenMode(state.gravity ? "GRAV" : state.moving ? "MOVE" : "HOME");
});
$("#gravityBtn").addEventListener("click", toggleGravity);
$("#logGravity").addEventListener("click", toggleGravity);
$("#moveBtn").addEventListener("click", toggleMove);
$("#chaosBtn").addEventListener("click", chaos);
$("#themeBtn").addEventListener("click", cycleTheme);
$("#resetBtn").addEventListener("click", resetLayout);
$("#tiltBtn").addEventListener("click", toggleTilt);
$("#openDebug").addEventListener("click", () => {
  unlock();
  openApp("debug");
});
$("#spawnBtn").addEventListener("click", spawnApp);

document.addEventListener("click", event => {
  const folder = event.target.closest("[data-folder-open]");
  if (folder) openApp(folder.dataset.folderOpen);
});

$("#screen").addEventListener("pointermove", event => {
  const rect = $("#screen").getBoundingClientRect();
  state.mouseTiltX = ((event.clientX - rect.left) / rect.width - 0.5) * 24;
  state.mouseTiltY = ((event.clientY - rect.top) / rect.height - 0.5) * 24;
});

let touchStartY = null;
$("#screen").addEventListener("touchstart", event => {
  touchStartY = event.touches[0].clientY;
}, { passive: true });

$("#screen").addEventListener("touchend", event => {
  if (touchStartY === null) return;
  const dy = event.changedTouches[0].clientY - touchStartY;
  if (state.locked && dy < -45) unlock();
  if (!state.locked && dy > 55 && touchStartY < 90) toggleLog();
  touchStartY = null;
}, { passive: true });

state.layout = loadLayout();
setTheme(state.themeIndex);
renderHome();
updateClock();
setInterval(updateClock, 1000);
$("#batteryText").textContent = `${Math.floor(Math.random() * 31) + 66}%`;
notify("Ready", "Stable patch loaded.");
notify("Tip", "Move mode + Gravity are safer now.");
requestAnimationFrame(animate);
