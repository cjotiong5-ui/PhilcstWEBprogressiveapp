/* ═══════════════════════════════════════════════════════════════════
   PhilCST Attendance System — app.js
   All JavaScript logic: routing, face-api, attendance, charts, API
═══════════════════════════════════════════════════════════════════ */

// ─── PAGE LOADING ANIMATION ──────────────────────────────────────
(function injectPageLoader() {
  const style = document.createElement("style");
  style.textContent = `
    #philcst-page-loader {
      position: fixed;
      inset: 0;
      background: #0f0c1a;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      transition: opacity 0.45s ease;
    }
    #philcst-page-loader.hiding {
      opacity: 0;
      pointer-events: none !important;
    }
    .loader-logo-ring {
      position: relative;
      width: 96px;
      height: 96px;
      margin-bottom: 28px;
    }
    .loader-logo-ring svg.ring-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      animation: loader-spin 1.8s linear infinite;
    }
    .loader-logo-ring svg.ring-svg circle {
      fill: none;
      stroke: url(#loader-grad);
      stroke-width: 3;
      stroke-dasharray: 180 80;
      stroke-linecap: round;
    }
    .loader-logo-ring .loader-inner-img {
      position: absolute;
      inset: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .loader-logo-ring .loader-inner-img img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 0 10px rgba(157,92,255,0.5));
      animation: loader-pulse-img 2s ease-in-out infinite;
    }
    @keyframes loader-pulse-img {
      0%, 100% { opacity: 1; filter: drop-shadow(0 0 10px rgba(157,92,255,0.5)); }
      50%       { opacity: 0.75; filter: drop-shadow(0 0 22px rgba(157,92,255,0.9)); }
    }
    @keyframes loader-spin {
      to { transform: rotate(360deg); }
    }
    .loader-title {
      font-family: 'Syne', sans-serif;
      font-size: 18px;
      font-weight: 800;
      color: #c4a8e8;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .loader-sub {
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      letter-spacing: 3.5px;
      text-transform: uppercase;
      color: #4a3f6a;
      margin-bottom: 36px;
    }
    .loader-bar-wrap {
      width: 200px;
      height: 3px;
      background: rgba(157,92,255,0.1);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .loader-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #6b3fb8, #9d5cff, #c084fc);
      border-radius: 10px;
      transition: width 0.3s ease;
      box-shadow: 0 0 12px rgba(157,92,255,0.6);
    }
    .loader-status {
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      color: #4a3f6a;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      min-height: 14px;
    }
    .loader-dots {
      display: inline-flex;
      gap: 5px;
      margin-top: 20px;
    }
    .loader-dots span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(157,92,255,0.35);
      animation: loader-dot-blink 1.2s ease-in-out infinite;
    }
    .loader-dots span:nth-child(2) { animation-delay: 0.2s; }
    .loader-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes loader-dot-blink {
      0%, 100% { background: rgba(157,92,255,0.2); transform: scale(1); }
      50%       { background: rgba(157,92,255,0.9); transform: scale(1.3); }
    }
  `;
  document.head.appendChild(style);

  const loader = document.createElement("div");
  loader.id = "philcst-page-loader";
  loader.innerHTML = `
    <div class="loader-logo-ring">
      <svg class="ring-svg" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="loader-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#6b3fb8"/>
            <stop offset="50%" stop-color="#9d5cff"/>
            <stop offset="100%" stop-color="#c084fc"/>
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r="44"/>
      </svg>
      <div class="loader-inner-img">
        <img src="assets/img/logo.png" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'font-family:Syne,sans-serif;font-size:22px;font-weight:800;color:#9d5cff;\\'>P</div>'" alt="PhilCST"/>
      </div>
    </div>
    <div class="loader-title">PhilCST Attendance</div>
    <div class="loader-sub">Philippine College of Science and Technology</div>
    <div class="loader-bar-wrap"><div class="loader-bar" id="loader-bar-fill"></div></div>
    <div class="loader-status" id="loader-status-text">Initializing system…</div>
    <div class="loader-dots"><span></span><span></span><span></span></div>
  `;

  // Insert as first child of body when DOM is ready
  function mountLoader() {
    if (document.body) {
      document.body.insertBefore(loader, document.body.firstChild);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.insertBefore(loader, document.body.firstChild);
      });
    }
  }
  mountLoader();

  // Animate progress bar through loading stages
  const stages = [
    { pct: 15, msg: "Loading fonts & styles…" },
    { pct: 35, msg: "Preparing interface…" },
    { pct: 55, msg: "Connecting to server…" },
    { pct: 75, msg: "Checking session…" },
    { pct: 90, msg: "Almost ready…" },
  ];

  let stageIdx = 0;
  const barEl = () => document.getElementById("loader-bar-fill");
  const statusEl = () => document.getElementById("loader-status-text");

  const stageTimer = setInterval(() => {
    if (stageIdx < stages.length) {
      const s = stages[stageIdx++];
      const bar = barEl();
      const status = statusEl();
      if (bar) bar.style.width = s.pct + "%";
      if (status) status.textContent = s.msg;
    } else {
      clearInterval(stageTimer);
    }
  }, 380);

  window._loaderComplete = function () {
    clearInterval(stageTimer);
    const bar = barEl();
    const status = statusEl();
    if (bar) bar.style.width = "100%";
    if (status) status.textContent = "Ready ✓";
    // Immediately kill pointer events so clicks go through right away
    loader.style.pointerEvents = "none";
    setTimeout(() => {
      loader.classList.add("hiding");
      setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 500);
    }, 200);
  };
})();

const API_BASE = "api/";

// ─── CONFIG (synced from DB settings) ────────────────────────────
let CFG = {
  confidenceThreshold: 0.45,
  detectionCooldown: 3,
};

// ─── STATE ───────────────────────────────────────────────────────
let faceModelsLoaded = false;
let knownDescriptors = []; // [{student_id, full_name, descriptor, face_image}]
let attCamStream = null;
let attCamRunning = false;
let attDetectionLoop = null;
let lastDetectionTime = {};
let markedToday = new Set();
let regCamStream = null;
let regCamRunning = false;
let regSamples = []; // Array of Float32Array descriptors
let regFaceImage = null;
let regDetectionLoop = null;
let regFrameCounter = 0; // Frame counter for sampling
const MAX_SAMPLES = 20;
let charts = {};

// ─── API HELPER ───────────────────────────────────────────────────
async function api(endpoint, params = {}, body = null, method = "GET") {
  try {
    const url =
      API_BASE +
      endpoint +
      (Object.keys(params).length ? "?" + new URLSearchParams(params) : "");
    const opts = {
      method,
      headers: {},
      credentials: "include", // ← always send session cookie
    };
    if (body) {
      opts.method = "POST";
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);

    // Handle 401 — session expired or not logged in
    if (res.status === 401) {
      console.warn("401 Unauthorized — session may have expired.");
      toast("Unauthorized. Please log in again.", "error", 5000);
      // Show login overlay so user can re-auth without a full reload
      const overlay = document.getElementById("login-overlay");
      if (overlay) {
        overlay.style.display = "flex";
        overlay.style.opacity = "1";
      }
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json;
    } catch (parseErr) {
      console.error("JSON parse error. Response text:", text);
      return {
        success: false,
        error: "Invalid JSON response: " + text.substring(0, 100),
      };
    }
  } catch (e) {
    console.error("API error:", e);
    return { success: false, error: e.message };
  }
}

// ─── TOAST ────────────────────────────────────────────────────────
function toast(msg, type = "info", duration = 3500) {
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ─── AUTO CAPITALIZE ─────────────────────────────────────────────
function autoCapitalize(input) {
  const pos = input.selectionStart;
  input.value = input.value
    .toLowerCase()
    .replace(/(^|[\s\-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
  try {
    input.setSelectionRange(pos, pos);
  } catch (e) {}
}

// ─── CLOCK ────────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const h = now.getHours() % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const am = now.getHours() < 12 ? "AM" : "PM";
    const clockEl = document.getElementById("live-clock");
    const dateEl = document.getElementById("live-date");
    if (clockEl) clockEl.textContent = `${h}:${m}:${s} ${am}`;
    if (dateEl)
      dateEl.textContent = now.toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  }
  tick();
  setInterval(tick, 1000);
}

// ─── MOBILE SIDEBAR TOGGLE ───────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const isOpen = sidebar.classList.contains("open");
  if (isOpen) {
    sidebar.classList.remove("open");
    overlay.classList.remove("visible");
  } else {
    sidebar.classList.add("open");
    overlay.classList.add("visible");
  }
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("visible");
}

// ─── NAVIGATION ──────────────────────────────────────────────────
const viewTitles = {
  dashboard: "◈ Dashboard",
  attendance: "◉ Live Attendance",
  register: "✦ Student Registration",
  analytics: "◆ Analytics & Reports",
  settings: "◎ Settings",
};

function switchView(name) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  const viewEl = document.getElementById("view-" + name);
  if (viewEl) viewEl.classList.add("active");
  const navBtn = document.querySelector(`.nav-btn[data-view="${name}"]`);
  if (navBtn) navBtn.classList.add("active");
  // page-title may not exist if topbar was redesigned — guard against crash
  const titleEl = document.getElementById("page-title");
  if (titleEl) titleEl.textContent = viewTitles[name] || name;

  // Stop cameras when leaving views
  if (name !== "attendance") stopAttendanceCam();
  if (name !== "register") stopRegCapture();

  // Load data for view
  if (name === "dashboard") loadDashboard();
  if (name === "attendance") {
    loadTodayAttendance();
    loadKnownDescriptors();
  }
  if (name === "register") loadStudentsList();
  if (name === "analytics") loadAnalyticsData();
  if (name === "settings") loadSettingsValues();
}

document.querySelectorAll(".nav-btn[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchView(btn.dataset.view);
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) closeSidebar();
  });
});

// ─── FACE MODELS ─────────────────────────────────────────────────
async function loadFaceModels() {
  const statusEl = document.getElementById("face-models-status");
  if (faceModelsLoaded) return true;

  // Models must be in /assets/models/ directory
  const MODEL_URL = "assets/models";
  try {
    statusEl && (statusEl.textContent = "⟳ Loading face detection models…");
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    faceModelsLoaded = true;
    statusEl && (statusEl.textContent = "✓ Face models loaded");
    statusEl && (statusEl.style.color = "var(--green)");
    return true;
  } catch (e) {
    console.error("Model load error:", e);
    statusEl &&
      (statusEl.textContent =
        "✕ Models failed to load. Check /assets/models/ folder.");
    statusEl && (statusEl.style.color = "var(--red)");
    toast("Face models not found. See setup instructions.", "error", 6000);
    return false;
  }
}

// ─── LOAD KNOWN DESCRIPTORS ───────────────────────────────────────
async function loadKnownDescriptors() {
  const res = await api("students.php", { action: "descriptors" });
  if (!res.success) return;
  knownDescriptors = res.data
    .filter((s) => s.face_descriptor && s.face_descriptor.length === 128)
    .map((s) => ({
      student_id: s.student_id,
      full_name: s.full_name,
      course: s.course,
      year_level: s.year_level,
      face_image: s.face_image,
      matcher: new faceapi.FaceMatcher(
        [
          new faceapi.LabeledFaceDescriptors(s.student_id, [
            new Float32Array(s.face_descriptor),
          ]),
        ],
        CFG.confidenceThreshold,
      ),
    }));
  console.log(`Loaded ${knownDescriptors.length} face descriptors`);
}

// ─══════════════════════════════════════════════════════════════════
//  ATTENDANCE VIEW
// ══════════════════════════════════════════════════════════════════
async function startAttendanceCam() {
  if (!(await loadFaceModels())) return;
  await loadKnownDescriptors();

  if (knownDescriptors.length === 0) {
    toast(
      "No trained students found. Register and save face data first.",
      "error",
      5000,
    );
    return;
  }

  try {
    attCamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    const video = document.getElementById("cam-video");
    video.srcObject = attCamStream;
    video.style.display = "block";
    await video.play();

    document.getElementById("btn-start-cam").disabled = true;
    document.getElementById("btn-stop-cam").disabled = false;
    setAttCamStatus("ready", "◉ Camera active — recognizing faces…");

    attCamRunning = true;
    runAttendanceDetection();
  } catch (e) {
    toast("Cannot access camera: " + e.message, "error");
  }
}

function stopAttendanceCam() {
  attCamRunning = false;
  if (attDetectionLoop) {
    clearTimeout(attDetectionLoop);
    attDetectionLoop = null;
  }
  if (attCamStream) {
    attCamStream.getTracks().forEach((t) => t.stop());
    attCamStream = null;
  }
  const video = document.getElementById("cam-video");
  if (video) video.style.display = "none";
  const btnStart = document.getElementById("btn-start-cam");
  const btnStop = document.getElementById("btn-stop-cam");
  if (btnStart) btnStart.disabled = false;
  if (btnStop) btnStop.disabled = true;
  setAttCamStatus("", "Camera stopped");
}

function setAttCamStatus(cls, text) {
  const bar = document.getElementById("cam-status-bar");
  const txt = document.getElementById("cam-status-text");
  if (!bar) return;
  bar.className = "cam-status " + cls;
  txt.textContent = text;
}

async function runAttendanceDetection() {
  if (!attCamRunning) return;
  const video = document.getElementById("cam-video");
  const canvas = document.getElementById("cam-canvas");
  if (!video || !canvas || video.readyState < 2) {
    attDetectionLoop = setTimeout(runAttendanceDetection, 200);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Title-case helper for canvas labels
  function titleCase(str) {
    if (!str) return str;
    return str
      .toLowerCase()
      .replace(/(^|[\s,\-])([a-z])/g, (m, s, c) => s + c.toUpperCase());
  }

  try {
    const detections = await faceapi
      .detectAllFaces(
        video,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
      )
      .withFaceLandmarks()
      .withFaceDescriptors();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const det of detections) {
      const { x, y, width, height } = det.detection.box;
      const desc = det.descriptor;
      let matched = null;
      let minDist = 1;

      for (const known of knownDescriptors) {
        const result = known.matcher.findBestMatch(desc);
        if (!result.label.startsWith("unknown") && result.distance < minDist) {
          minDist = result.distance;
          matched = known;
        }
      }

      // Draw box
      const confidence = matched ? Math.round((1 - minDist) * 100) : 0;
      const color = matched ? "#00ff88" : "#ff4455";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Label
      const label = matched
        ? `${titleCase(matched.full_name)} (${confidence}%)`
        : "Unknown";
      ctx.fillStyle = color;
      ctx.font = "bold 13px Space Mono, monospace";
      ctx.fillRect(x, y - 22, ctx.measureText(label).width + 14, 22);
      ctx.fillStyle = "#000";
      ctx.fillText(label, x + 7, y - 6);

      // Mark attendance — only trigger if not already marked and cooldown passed
      if (matched) {
        const now = Date.now() / 1000;
        const last = lastDetectionTime[matched.student_id] || 0;
        if (
          !markedToday.has(matched.student_id) &&
          now - last > CFG.detectionCooldown
        ) {
          // Set cooldown immediately to prevent duplicate API calls while awaiting
          lastDetectionTime[matched.student_id] = now;
          markAttendance(
            matched.student_id,
            matched.full_name,
            confidence,
            matched.course,
            matched.year_level,
          ).catch((e) => {
            // Reset cooldown on error so it can retry
            delete lastDetectionTime[matched.student_id];
            console.error("markAttendance failed:", e);
          });
        }
      }
    }

    const overlay = document.getElementById("cam-overlay");
    if (overlay) {
      overlay.textContent =
        detections.length > 0
          ? `◉ ${detections.length} face(s) detected`
          : "◉ SCANNING…";
    }
  } catch (e) {
    console.error("Detection error:", e);
  }

  attDetectionLoop = setTimeout(runAttendanceDetection, 300);
}

async function markAttendance(
  student_id,
  full_name,
  confidence,
  course = "—",
  yearLevel = "—",
) {
  try {
    const res = await api(
      "attendance.php",
      { action: "mark" },
      { student_id, full_name, confidence },
    );
    if (res.success) {
      markedToday.add(student_id);
      const nameFixed = full_name
        ? full_name
            .toLowerCase()
            .replace(/(^|[\s,\-])([a-z])/g, (m, s, c) => s + c.toUpperCase())
        : full_name;
      toast(`✓ Attendance marked: ${nameFixed}`, "success");
      addAttendanceRow(
        student_id,
        full_name,
        new Date().toLocaleTimeString("en-PH"),
        confidence,
        course,
        yearLevel,
      );
    } else if (
      res.already_marked ||
      (res.error && res.error.includes("Already"))
    ) {
      // Already marked today — add to set so we stop trying
      markedToday.add(student_id);
    } else {
      // Real failure — reset cooldown so detection can retry
      delete lastDetectionTime[student_id];
      console.error("Mark attendance failed:", res.error);
      toast(
        `⚠ Could not mark attendance: ${res.error || "Unknown error"}`,
        "error",
        4000,
      );
    }
  } catch (e) {
    delete lastDetectionTime[student_id];
    console.error("markAttendance exception:", e);
  }
}

async function loadTodayAttendance() {
  const res = await api("attendance.php", { action: "today" });
  const body = document.getElementById("att-live-body");
  if (!body) return;
  body.innerHTML = "";
  markedToday.clear();

  if (!res.success || !res.data.length) {
    body.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px">No records yet today</td></tr>';
    updateTodayBadge(0);
    return;
  }
  res.data.forEach((r) => {
    markedToday.add(r.student_id);
    addAttendanceRow(
      r.student_id,
      r.full_name,
      r.attend_time,
      r.confidence,
      r.course || "—",
      r.year_level || "—",
    );
  });
  updateTodayBadge(res.data.length);
}

function addAttendanceRow(
  sid,
  name,
  time,
  conf,
  course = "—",
  yearLevel = "—",
) {
  const body = document.getElementById("att-live-body");
  if (!body) return;
  const noData = body.querySelector("td[colspan]");
  if (noData) body.innerHTML = "";

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${sid}</td>
    <td>${name}</td>
    <td style="font-size:10px">${course}</td>
    <td style="font-size:10px">${yearLevel}</td>
    <td>${time}</td>
    <td><span class="badge green">${typeof conf === "number" ? conf.toFixed(1) : conf}%</span></td>
  `;
  body.insertBefore(tr, body.firstChild);
  const count = body.querySelectorAll("tr").length;
  updateTodayBadge(count);
}

function updateTodayBadge(n) {
  const el = document.getElementById("today-count-badge");
  if (el) el.textContent = n;
}

// ═══════════════════════════════════════════════════════════════════
//  REGISTRATION VIEW
// ═══════════════════════════════════════════════════════════════════
async function startRegCapture() {
  if (regCamRunning) {
    toast("Camera is already running.", "info");
    return;
  }

  // Guard: make sure we are on the register view before touching DOM elements
  const registerView = document.getElementById("view-register");
  if (!registerView || !registerView.classList.contains("active")) {
    // Not on register view yet — switch to it first
    if (typeof switchView === "function") switchView("register");
    await new Promise((r) => setTimeout(r, 100));
  }

  const sidEl = document.getElementById("reg-id");
  const surnameEl = document.getElementById("reg-surname");
  const firstnameEl = document.getElementById("reg-firstname");

  if (!sidEl || !surnameEl || !firstnameEl) {
    toast(
      "Registration form not found. Please go to the Register tab first.",
      "error",
    );
    return;
  }

  const sid = sidEl.value.trim();
  const surname = surnameEl.value.trim();
  const firstname = firstnameEl.value.trim();
  if (!sid || !surname || !firstname) {
    toast("Enter Student ID, Surname, and First Name first", "error");
    return;
  }

  // Open camera immediately — don't wait for models
  try {
    updateRegStatus("⟳ Starting camera…");
    regCamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 480 },
        height: { ideal: 360 },
      },
    });
    const video = document.getElementById("reg-video");
    video.srcObject = regCamStream;
    await video.play();

    document.getElementById("reg-cam-preview").style.display = "block";
    document.getElementById("reg-cam-placeholder").style.display = "none";
    document.getElementById("btn-stop-reg").style.display = "inline-flex";
    document.getElementById("sample-thumbs-grid").style.display = "grid";

    regSamples = [];
    regFaceImage = null;
    regFrameCounter = 0;
    regCamRunning = true;
    renderSampleThumbs();
    updateRegStatus("⟳ Loading face models… please wait");

    // Load models in background after camera is open
    const modelsOk = await loadFaceModels();
    if (!modelsOk) {
      updateRegStatus("✕ Face models failed. Check /assets/models/ folder.");
      stopRegCapture();
      return;
    }

    updateRegStatus(`Capturing face… 0 / ${MAX_SAMPLES}`);
    runRegCapture();
  } catch (e) {
    let msg = e.message;
    if (e.name === "NotAllowedError")
      msg = "Camera permission denied. Please allow camera access.";
    else if (e.name === "NotFoundError")
      msg = "No camera found on this device.";
    else if (e.name === "NotReadableError")
      msg = "Camera is in use by another app.";
    toast("Camera error: " + msg, "error", 6000);
    updateRegStatus("✕ " + msg);
  }
}

function stopRegCapture() {
  regCamRunning = false;
  if (regDetectionLoop) {
    clearTimeout(regDetectionLoop);
    regDetectionLoop = null;
  }
  if (regCamStream) {
    regCamStream.getTracks().forEach((t) => t.stop());
    regCamStream = null;
  }
  const preview = document.getElementById("reg-cam-preview");
  const placeholder = document.getElementById("reg-cam-placeholder");
  const stopBtn = document.getElementById("btn-stop-reg");
  if (preview) preview.style.display = "none";
  if (placeholder) placeholder.style.display = "block";
  if (stopBtn) stopBtn.style.display = "none";
}

async function runRegCapture() {
  if (!regCamRunning || regSamples.length >= MAX_SAMPLES) {
    if (regSamples.length >= MAX_SAMPLES) {
      stopRegCapture();
      document.getElementById("btn-save-student").disabled = false;
      updateRegStatus(
        `✓ ${MAX_SAMPLES} samples captured! Click "Save Student" to finish.`,
      );
      toast("Face capture complete! Click Save Student.", "success");
    }
    return;
  }

  const video = document.getElementById("reg-video");
  const canvas = document.getElementById("reg-canvas");
  if (!video || !canvas || video.readyState < 2) {
    regDetectionLoop = setTimeout(runRegCapture, 200);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  // Sync CSS height so the canvas doesn't obscure the video
  canvas.style.height = video.offsetHeight + "px";
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    const det = await faceapi
      .detectSingleFace(
        video,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }),
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (det) {
      const { x, y, width, height } = det.detection.box;
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 12px Space Mono, monospace";
      ctx.fillRect(x, y - 20, 180, 20);
      ctx.fillStyle = "#000";
      ctx.fillText(
        `Sample ${regSamples.length + 1}/${MAX_SAMPLES}`,
        x + 5,
        y - 5,
      );

      // Save every other frame to get variety
      if (regFrameCounter % 2 === 0) {
        regSamples.push(Array.from(det.descriptor));
        // Save face image on 5th sample
        if (regSamples.length === 5) {
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = Math.round(width);
          tmpCanvas.height = Math.round(height);
          tmpCanvas
            .getContext("2d")
            .drawImage(video, x, y, width, height, 0, 0, width, height);
          regFaceImage = tmpCanvas.toDataURL("image/jpeg", 0.7);
        }
        renderSampleThumbs();
        updateRegProgress(regSamples.length);
        updateRegStatus(`Capturing… ${regSamples.length} / ${MAX_SAMPLES}`);
      }
      regFrameCounter++;
    } else {
      ctx.fillStyle = "rgba(255,68,85,.7)";
      ctx.font = "bold 13px Space Mono, monospace";
      ctx.fillText("No face detected — look at camera", 10, 30);
    }
  } catch (e) {
    console.error(e);
  }

  regDetectionLoop = setTimeout(runRegCapture, 350);
}

function renderSampleThumbs() {
  const grid = document.getElementById("sample-thumbs-grid");
  grid.style.display = "grid";
  grid.innerHTML = "";
  for (let i = 0; i < MAX_SAMPLES; i++) {
    const div = document.createElement("div");
    div.className = "sample-thumb" + (i < regSamples.length ? " filled" : "");
    div.innerHTML = i < regSamples.length ? "✓" : i + 1;
    div.style.color = i < regSamples.length ? "var(--green)" : "var(--text3)";
    div.style.fontSize = "11px";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    grid.appendChild(div);
  }
  document.getElementById("sample-count-lbl").textContent =
    `${regSamples.length} / ${MAX_SAMPLES}`;
}

function updateRegProgress(n) {
  document.getElementById("reg-progress").style.width =
    `${(n / MAX_SAMPLES) * 100}%`;
}

function updateRegStatus(msg) {
  const el = document.getElementById("reg-status");
  if (el) el.textContent = msg;
}

async function saveStudentData() {
  if (regSamples.length < MAX_SAMPLES) {
    toast(
      `Need ${MAX_SAMPLES} face samples. Currently: ${regSamples.length}`,
      "error",
    );
    return;
  }

  const sidEl = document.getElementById("reg-id");
  const surnameEl = document.getElementById("reg-surname");
  const firstnameEl = document.getElementById("reg-firstname");
  const miEl = document.getElementById("reg-mi");
  const courseEl = document.getElementById("reg-course");
  const yearEl = document.getElementById("reg-year-level");

  if (!sidEl || !surnameEl || !firstnameEl) {
    toast("Form not found. Please stay on the Register tab.", "error");
    return;
  }

  const sid = sidEl.value.trim();
  const surname = surnameEl.value.trim();
  const firstname = firstnameEl.value.trim();
  const mi = miEl ? miEl.value.trim() : "";
  const name =
    surname && firstname
      ? surname +
        ", " +
        firstname +
        (mi ? " " + (mi.endsWith(".") ? mi : mi + ".") : "")
      : "";
  const course = courseEl ? courseEl.value.trim() : "";
  const yearLevel = yearEl ? yearEl.value.trim() : "";

  if (!sid || !surname || !firstname) {
    toast("Student ID, Surname, and First Name are required", "error");
    return;
  }

  // Average the descriptors
  const avg = new Array(128).fill(0);
  regSamples.forEach((d) => d.forEach((v, i) => (avg[i] += v)));
  avg.forEach((v, i) => (avg[i] = v / regSamples.length));

  updateRegStatus("Saving student…");
  const res = await api(
    "students.php",
    { action: "register" },
    {
      student_id: sid,
      full_name: name,
      course: course,
      year_level: yearLevel,
      face_descriptor: avg,
      face_image: regFaceImage,
    },
  );

  if (res.success) {
    toast(`✓ ${name} registered successfully!`, "success");
    clearRegForm();
    loadStudentsList();
    loadKnownDescriptors();
  } else {
    toast("Error: " + res.error, "error");
    updateRegStatus("⚠ " + res.error);
  }
}

function clearRegForm() {
  const fields = [
    "reg-id",
    "reg-surname",
    "reg-firstname",
    "reg-mi",
    "reg-course",
    "reg-year-level",
  ];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  regSamples = [];
  regFaceImage = null;
  const saveBtn = document.getElementById("btn-save-student");
  if (saveBtn) saveBtn.disabled = true;
  updateRegStatus("");
  updateRegProgress(0);
  renderSampleThumbs();
  stopRegCapture();
}

// ─── STUDENT LIST ─────────────────────────────────────────────────
let studentRefreshInterval = null;
function startStudentAutoRefresh() {
  if (studentRefreshInterval) clearInterval(studentRefreshInterval);
  studentRefreshInterval = setInterval(() => {
    if (document.getElementById("view-register")?.classList.contains("active"))
      loadStudentsList();
  }, 10000);
}
function stopStudentAutoRefresh() {
  if (studentRefreshInterval) {
    clearInterval(studentRefreshInterval);
    studentRefreshInterval = null;
  }
}
async function loadStudentsList(q = "") {
  const action = q ? "search" : "list";
  const params = q ? { action, q } : { action };
  const res = await api("students.php", params);
  const body = document.getElementById("students-table-body");
  if (!body) return;

  if (!res.success || !res.data.length) {
    body.innerHTML =
      '<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:24px">No students found</td></tr>';
    return;
  }

  body.innerHTML = res.data
    .map(
      (s) => `
    <tr data-course="${s.course || ""}" data-year="${s.year_level || ""}">
      <td>${
        s.face_image
          ? `<img src="${s.face_image}" class="face-avatar"/>`
          : '<div class="face-avatar-placeholder">👤</div>'
      }</td>
      <td>${s.student_id}</td>
      <td>${s.full_name}</td>
      <td style="font-size:10px">${s.course || "—"}</td>
      <td style="font-size:10px">${s.year_level || "—"}</td>
      <td style="font-size:10px">${s.registered_at ? s.registered_at.split(" ")[0] : "—"}</td>
      <td>${s.face_image ? '<span class="badge green">Trained</span>' : '<span class="badge red">No Face</span>'}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.student_id}','${s.full_name}')">✕</button>
      </td>
    </tr>
  `,
    )
    .join("");

  // Update count and apply any active filters
  const countEl = document.getElementById("quick-student-count");
  if (countEl) countEl.textContent = res.data.length;
  applyStudentFilters();
}

let searchTimer;
function searchStudents(q) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => applyStudentFilters(), 300);
}

async function deleteStudent(sid, name) {
  if (!confirm(`Delete student "${name}" (${sid})? This cannot be undone.`))
    return;
  const res = await api(
    "students.php",
    { action: "delete" },
    { student_id: sid },
  );
  if (res.success) {
    toast(`Deleted: ${name}`, "info");
    loadStudentsList();
    loadKnownDescriptors();
  } else {
    toast("Delete failed: " + res.error, "error");
  }
}

// ─── QUICK COURSE FILTER ──────────────────────────────────────────
function onQuickCourseChange() {
  applyStudentFilters();
}

function onQuickYearChange() {
  applyStudentFilters();
}

function applyStudentFilters() {
  const course = document.getElementById("quick-course-select").value;
  const year = document.getElementById("quick-year-select").value;
  const search = (
    document.getElementById("search-students").value || ""
  ).toLowerCase();
  const rows = document.querySelectorAll(
    "#students-table-body tr[data-course]",
  );
  let visible = 0;

  rows.forEach((row) => {
    const rowCourse = row.getAttribute("data-course") || "";
    const rowYear = row.getAttribute("data-year") || "";
    const rowText = row.textContent.toLowerCase();

    const matchCourse = !course || rowCourse === course;
    const matchYear = !year || rowYear === year;
    const matchSearch = !search || rowText.includes(search);

    if (matchCourse && matchYear && matchSearch) {
      row.style.display = "";
      visible++;
    } else {
      row.style.display = "none";
    }
  });

  const countEl = document.getElementById("quick-student-count");
  if (countEl) countEl.textContent = visible;
}

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════
async function loadDashboard() {
  const res = await api("attendance.php", { action: "dashboard" });
  const dash = res.data || {};

  setText("stat-total", dash.total_students ?? "—");
  setText("stat-today", dash.today_present ?? "—");
  setText(
    "stat-rate",
    dash.attendance_rate != null ? dash.attendance_rate + "%" : "—",
  );
  setText("stat-month", dash.month_total ?? "—");
  setText("stat-today-sub", `vs yesterday: ${dash.yesterday_present ?? 0}`);

  // Recent table
  const res2 = await api("attendance.php", { action: "today" });
  const body = document.getElementById("dash-recent-body");
  if (body && res2.success) {
    if (!res2.data.length) {
      body.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">No attendance today</td></tr>';
    } else {
      body.innerHTML = res2.data
        .slice(0, 10)
        .map(
          (r) => `
        <tr>
          <td>${r.student_id}</td>
          <td>${r.full_name}</td>
          <td style="font-size:10px">${r.course || "—"}</td>
          <td style="font-size:10px">${r.year_level || "—"}</td>
          <td>${r.attend_time}</td>
          <td><span class="badge green">${parseFloat(r.confidence).toFixed(1)}%</span></td>
          <td><span class="badge green">Present</span></td>
        </tr>
      `,
        )
        .join("");
    }
  }

  // Mini weekly chart
  const wRes = await api("attendance.php", { action: "weekly" });
  if (wRes.success) renderWeeklyMiniChart(wRes.data);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ═══════════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════════
async function loadAnalyticsData() {
  // Stats
  const dash = await api("attendance.php", { action: "dashboard" });
  if (dash.success && dash.data) {
    setText("an-total", dash.data.total_students || 0);
    setText("an-today", dash.data.today_present || 0);
    setText("an-rate", (dash.data.attendance_rate || 0) + "%");
    setText("an-month", dash.data.month_total || 0);
  }

  // Weekly chart
  const wRes = await api("attendance.php", { action: "weekly" });
  if (wRes.success) renderWeeklyChart(wRes.data || []);

  // Hourly chart
  const hRes = await api("attendance.php", { action: "hourly" });
  if (hRes.success) renderHourlyChart(hRes.data || []);

  // Pie chart
  if (dash.success && dash.data) renderPieChart(dash.data);

  // Top attendees
  const tRes = await api("attendance.php", { action: "top", limit: 10 });
  if (tRes.success) renderTopTable(tRes.data || []);
}

function getChartDefaults() {
  return {
    color: "rgba(0,255,136,.8)",
    fill: "rgba(0,255,136,.1)",
    grid: "rgba(255,255,255,.05)",
    text: "#8faa98",
    fontFam: "Space Mono, monospace",
  };
}

function renderWeeklyChart(data) {
  const ctx = document.getElementById("chart-weekly");
  if (!ctx) return;
  if (charts["weekly"]) charts["weekly"].destroy();

  // Fill 7 days
  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const row = data.find((r) => r.attend_date === ds);
    days.push(d.toLocaleDateString("en-PH", { weekday: "short" }));
    counts.push(row ? parseInt(row.count) : 0);
  }

  const C = getChartDefaults();
  charts["weekly"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: days,
      datasets: [
        {
          label: "Present",
          data: counts,
          borderColor: C.color,
          backgroundColor: C.fill,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: C.color,
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: C.text, font: { family: C.fontFam, size: 10 } },
          grid: { color: C.grid },
        },
        y: {
          ticks: {
            color: C.text,
            font: { family: C.fontFam, size: 10 },
            stepSize: 1,
          },
          grid: { color: C.grid },
        },
      },
    },
  });
}

function renderWeeklyMiniChart(data) {
  const ctx = document.getElementById("chart-weekly-mini");
  if (!ctx) return;
  if (charts["weekly-mini"]) charts["weekly-mini"].destroy();

  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const row = data.find((r) => r.attend_date === ds);
    days.push(d.toLocaleDateString("en-PH", { weekday: "short" }));
    counts.push(row ? parseInt(row.count) : 0);
  }
  const C = getChartDefaults();
  charts["weekly-mini"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: days,
      datasets: [
        {
          data: counts,
          backgroundColor: "rgba(0,255,136,.5)",
          borderColor: C.color,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: C.text, font: { family: C.fontFam, size: 9 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: C.text,
            font: { family: C.fontFam, size: 9 },
            stepSize: 1,
          },
          grid: { color: C.grid },
        },
      },
    },
  });
}

function renderHourlyChart(data) {
  const ctx = document.getElementById("chart-hourly");
  if (!ctx) return;
  if (charts["hourly"]) charts["hourly"].destroy();

  const hours = data.map((r) => `${r.hour}:00`);
  const counts = data.map((r) => parseInt(r.count));
  const C = getChartDefaults();
  charts["hourly"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Check-ins",
          data: counts,
          backgroundColor: "rgba(0,207,255,.5)",
          borderColor: "#00cfff",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: C.text, font: { family: C.fontFam, size: 10 } },
          grid: { color: C.grid },
        },
        y: {
          ticks: {
            color: C.text,
            font: { family: C.fontFam, size: 10 },
            stepSize: 1,
          },
          grid: { color: C.grid },
        },
      },
    },
  });
}

function renderPieChart(dash) {
  const ctx = document.getElementById("chart-pie");
  if (!ctx) return;
  if (charts["pie"]) charts["pie"].destroy();

  const present = parseInt(dash.today_present) || 0;
  const total = parseInt(dash.total_students) || 0;
  const absent = Math.max(0, total - present);

  charts["pie"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Present", "Absent"],
      datasets: [
        {
          data: [present, absent],
          backgroundColor: ["rgba(0,255,136,.6)", "rgba(255,68,85,.4)"],
          borderColor: ["#00ff88", "#ff4455"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#8faa98",
            font: { family: "Space Mono,monospace", size: 11 },
          },
        },
      },
    },
  });
}

function renderTopTable(data) {
  const body = document.getElementById("top-table-body");
  if (!body) return;
  if (!data.length) {
    body.innerHTML =
      '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px">No data</td></tr>';
    return;
  }
  body.innerHTML = data
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.student_id}</td>
      <td>${r.full_name}</td>
      <td><span class="badge green">${r.days_present} days</span></td>
    </tr>
  `,
    )
    .join("");
}

// ─── DATE RANGE HELPERS ───────────────────────────────────────────
function setDateRange(type) {
  const today = new Date().toISOString().split("T")[0];
  const from = document.getElementById("report-from");
  const to = document.getElementById("report-to");
  to.value = today;
  if (type === "today") {
    from.value = today;
  } else if (type === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    from.value = d.toISOString().split("T")[0];
  } else {
    const d = new Date();
    d.setDate(1);
    from.value = d.toISOString().split("T")[0];
  }
}

function initDateRanges() {
  const today = new Date().toISOString().split("T")[0];
  const fromD = new Date();
  fromD.setDate(fromD.getDate() - 6);
  const fromEl = document.getElementById("report-from");
  const toEl = document.getElementById("report-to");
  if (fromEl) fromEl.value = fromD.toISOString().split("T")[0];
  if (toEl) toEl.value = today;
}

// ─── EXPORT ───────────────────────────────────────────────────────
async function exportAttendance() {
  openExportPasswordModal(async (password) => {
    try {
      const from = new Date();
      from.setDate(1);
      const fromStr = from.toISOString().split("T")[0];
      const toStr = new Date().toISOString().split("T")[0];

      // First verify password
      const url = `api/attendance.php?action=export&from=${fromStr}&to=${toStr}&pwd=${encodeURIComponent(password)}`;

      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json();
        toast("❌ " + (data.error || "Invalid password"), "error");
        return;
      }

      // Password valid, trigger download
      window.open(url, "_blank");
      toast("✓ Downloading attendance record...", "success");
    } catch (e) {
      console.error("Export error:", e);
      toast("Error: " + e.message, "error");
    }
  });
}

async function exportRangeCSV() {
  openExportPasswordModal(async (password) => {
    try {
      const from =
        document.getElementById("report-from")?.value ||
        new Date().toISOString().split("T")[0];
      const to =
        document.getElementById("report-to")?.value ||
        new Date().toISOString().split("T")[0];

      // First verify password
      const url = `api/attendance.php?action=export&from=${from}&to=${to}&pwd=${encodeURIComponent(password)}`;

      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json();
        toast("❌ " + (data.error || "Invalid password"), "error");
        return;
      }

      // Password valid, trigger download
      window.open(url, "_blank");
      toast("✓ Downloading attendance record...", "success");
    } catch (e) {
      console.error("Export error:", e);
      toast("Error: " + e.message, "error");
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════
async function loadSettingsValues() {
  const res = await api("attendance.php", { action: "dashboard" });
  if (res.success) {
    const thresh = document.getElementById("set-threshold");
    const cool = document.getElementById("set-cooldown");
    if (thresh) thresh.value = CFG.confidenceThreshold || 0.45;
    if (cool) cool.value = CFG.detectionCooldown || 3;

    // Update quick stats
    const total = document.getElementById("quick-total");
    const today = document.getElementById("quick-today");
    if (total) total.textContent = res.data.total_students || 0;
    if (today) today.textContent = res.data.today_present || 0;
  }
}

async function saveSettings() {
  const threshold = parseFloat(
    document.getElementById("set-threshold")?.value || 0.45,
  );
  const cooldown = parseInt(
    document.getElementById("set-cooldown")?.value || 3,
  );

  CFG.confidenceThreshold = threshold;
  CFG.detectionCooldown = cooldown;
  toast("Settings saved!", "success");
}

// ─── PASSWORD MODAL FOR EXPORTS ───────────────────────────────────
let exportPasswordCallback = null;

function openExportPasswordModal(callback) {
  exportPasswordCallback = callback;
  document.getElementById("export-modal-pass-input").value = "";
  document.getElementById("export-modal-pass-err").style.display = "none";
  document.getElementById("modal-export-password").classList.add("open");
  setTimeout(
    () => document.getElementById("export-modal-pass-input").focus(),
    50,
  );
}

function closeExportPasswordModal() {
  document.getElementById("modal-export-password").classList.remove("open");
}

function confirmExportPassword() {
  const pass = document.getElementById("export-modal-pass-input").value;
  if (!pass) {
    document.getElementById("export-modal-pass-err").style.display = "block";
    document.getElementById("export-modal-pass-err").textContent =
      "⚠ Password is required";
    return;
  }
  const callback = exportPasswordCallback;
  exportPasswordCallback = null;
  closeExportPasswordModal();
  if (callback) {
    try {
      callback(pass); // This can be async or sync
    } catch (e) {
      console.error("Export callback error:", e);
      toast("Error: " + e.message, "error");
    }
  }
}

document.addEventListener("keydown", (e) => {
  if (
    document
      .getElementById("modal-export-password")
      .classList.contains("open") &&
    e.key === "Enter"
  ) {
    confirmExportPassword();
  }
});

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

// ─── EXIT ─────────────────────────────────────────────────────────
function confirmExit() {
  if (confirm("Exit the attendance system?")) {
    stopAttendanceCam();
    stopRegCapture();
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0f0d;color:#00ff88;font-family:'Space Mono',monospace;font-size:18px">System Closed. Close this browser tab.</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  AUTH — LOGIN / LOGOUT / ADMIN NAME / STUDENT MODE
// ═══════════════════════════════════════════════════════════════════

// Tracks whether we're in student (attendance-only) mode
let _isStudentMode = false;

/**
 * Inject the Admin Switch modal + Student Mode styles into the DOM.
 * Called once on DOMContentLoaded.
 */
function injectAdminSwitchModal() {
  // ── Styles ────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    @keyframes login-shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-8px)}
      40%{transform:translateX(8px)}
      60%{transform:translateX(-5px)}
      80%{transform:translateX(5px)}
    }
    /* Student mode badge in topbar */
    #student-mode-badge {
      display: none;
      align-items: center;
      gap: 6px;
      background: rgba(52,211,153,0.10);
      border: 1px solid rgba(52,211,153,0.28);
      border-radius: 20px;
      padding: 4px 11px;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--success);
      font-weight: 700;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    #student-mode-badge .sm-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--success);
      animation: pulse-dot 1.5s infinite;
      flex-shrink: 0;
    }

    /* Clickable admin badge (student mode) */
    #topbar-admin.student-mode {
      cursor: pointer;
      border-color: rgba(157,92,255,0.45) !important;
      transition: all 0.18s ease;
    }
    #topbar-admin.student-mode:hover {
      background: rgba(124,58,237,0.22) !important;
      border-color: var(--accent) !important;
      box-shadow: 0 0 14px rgba(157,92,255,0.25);
      transform: translateY(-1px);
    }
    #topbar-admin.student-mode::after {
      content: ' ↗';
      font-size: 9px;
      opacity: 0.6;
      margin-left: 2px;
    }

    /* Admin switch modal overlay */
    #modal-admin-switch {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    #modal-admin-switch.open { display: flex; }
    #modal-admin-switch .asw-card {
      background: linear-gradient(160deg, #1e1932 0%, #16112e 100%);
      border: 1px solid rgba(124,58,237,0.35);
      border-radius: 18px;
      padding: 36px 32px 28px;
      width: 380px;
      max-width: 94vw;
      box-shadow: 0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(124,58,237,0.10);
      position: relative;
      animation: asw-in 0.28s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes asw-in {
      from { opacity:0; transform: scale(0.93) translateY(16px); }
      to   { opacity:1; transform: scale(1) translateY(0); }
    }
    .asw-close {
      position: absolute; top: 14px; right: 14px;
      background: rgba(255,255,255,0.06); border: none;
      border-radius: 50%; width: 28px; height: 28px;
      color: var(--text3); font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .asw-close:hover { background: rgba(255,255,255,0.12); color: var(--text); }
    .asw-logo {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      margin-bottom: 22px;
    }
    .asw-logo .asw-icon {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(124,58,237,0.15);
      border: 1.5px solid rgba(124,58,237,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .asw-logo .asw-title {
      font-family: var(--font-head);
      font-size: 17px; font-weight: 800; color: var(--text);
      letter-spacing: 0.2px;
    }
    .asw-logo .asw-sub {
      font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase;
      color: var(--text3); margin-top: -4px;
    }
    .asw-field { margin-bottom: 14px; }
    .asw-field label {
      display: block; font-size: 9px; letter-spacing: 2px;
      text-transform: uppercase; color: var(--text3);
      margin-bottom: 6px; font-weight: 600;
    }
    .asw-input-wrap { position: relative; }
    .asw-input-wrap svg {
      position: absolute; left: 12px; top: 50%;
      transform: translateY(-50%); opacity: 0.4; pointer-events: none;
    }
    .asw-field input {
      width: 100%; padding: 11px 14px 11px 36px;
      background: rgba(10,8,22,0.8);
      border: 1px solid rgba(99,80,180,0.28); border-radius: 10px;
      color: var(--text); font-family: var(--font-mono); font-size: 12px;
      outline: none; box-sizing: border-box;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .asw-field input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(168,85,247,0.12);
    }
    .asw-pw-toggle {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; opacity: 0.4;
      color: var(--text2); padding: 4px; transition: opacity 0.15s;
    }
    .asw-pw-toggle:hover { opacity: 0.8; }
    .asw-error {
      display: none; background: rgba(248,113,113,0.08);
      border: 1px solid rgba(248,113,113,0.25); border-radius: 8px;
      padding: 8px 12px; font-size: 11px; color: var(--red);
      margin-bottom: 14px; text-align: center;
    }
    .asw-btn {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, #7c3aed 0%, #9d5cff 100%);
      color: #fff; border: none; border-radius: 10px;
      font-family: var(--font-mono); font-size: 12px; font-weight: 700;
      cursor: pointer; letter-spacing: 0.5px;
      box-shadow: 0 4px 18px rgba(124,58,237,0.4);
      transition: all 0.2s ease;
    }
    .asw-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
      box-shadow: 0 6px 26px rgba(139,92,246,0.5);
      transform: translateY(-2px);
    }
    .asw-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .asw-divider {
      text-align: center; font-size: 9px; color: var(--text3);
      letter-spacing: 1px; margin: 14px 0 0;
      text-transform: uppercase;
    }
  `;
  document.head.appendChild(style);

  // ── Modal HTML ────────────────────────────────────────────────────
  const modal = document.createElement("div");
  modal.id = "modal-admin-switch";
  modal.innerHTML = `
    <div class="asw-card">
      <button class="asw-close" onclick="closeAdminSwitchModal()" title="Close">✕</button>
      <div class="asw-logo">
        <div class="asw-icon">🔐</div>
        <div class="asw-title">Admin Sign In</div>
        <div class="asw-sub">PhilCST Attendance System</div>
      </div>

      <div id="asw-error" class="asw-error"></div>

      <div class="asw-field">
        <label>Username</label>
        <div class="asw-input-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#c8d0f0" stroke-width="1.5"/>
            <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#c8d0f0" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input id="asw-username" type="text" placeholder="Enter username"
            autocomplete="username"
            onkeydown="if(event.key==='Enter')document.getElementById('asw-password').focus()"/>
        </div>
      </div>

      <div class="asw-field">
        <label>Password</label>
        <div class="asw-input-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="#c8d0f0" stroke-width="1.5"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#c8d0f0" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input id="asw-password" type="password" placeholder="Enter password"
            autocomplete="current-password"
            onkeydown="if(event.key==='Enter')doAdminSwitch()"/>
          <button class="asw-pw-toggle" type="button" onclick="
            var p=document.getElementById('asw-password');
            p.type=p.type==='password'?'text':'password';">👁</button>
        </div>
      </div>

      <button class="asw-btn" id="asw-submit-btn" onclick="doAdminSwitch()">
        Sign In to Dashboard
      </button>
      <div class="asw-divider">Student mode active — admin access only</div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeAdminSwitchModal();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open"))
      closeAdminSwitchModal();
  });
}

/**
 * proceedFromRole — overrides the inline version in index.html.
 * Adds setTopbarMode("student") call when student role is chosen.
 */
window.proceedFromRole = function () {
  const role = window._selectedRole;

  if (role === "student") {
    // Student mode: bypass admin login, go to attendance view
    _isStudentMode = true;
    document.body.classList.add("student-mode"); // hide admin-only nav items
    setTopbarMode("student");
    const overlay = document.getElementById("login-overlay");
    if (overlay) {
      overlay.classList.add("hiding");
      setTimeout(() => {
        overlay.style.display = "none";
        overlay.classList.remove("hiding");
      }, 450);
    }
    if (typeof window.switchView === "function")
      window.switchView("attendance");
  } else {
    // Admin: show credentials step
    _isStudentMode = false;
    const roleStep = document.getElementById("login-step-role");
    const credStep = document.getElementById("login-step-credentials");
    if (roleStep) roleStep.style.display = "none";
    if (credStep) credStep.style.display = "block";
    setTimeout(() => {
      const u = document.getElementById("login-username");
      if (u) u.focus();
    }, 80);
  }
};

/** Open the admin-switch modal (shown when clicking the admin badge in student mode) */
window.openAdminSwitchModal = function () {
  const modal = document.getElementById("modal-admin-switch");
  if (!modal) return;
  const errEl = document.getElementById("asw-error");
  const uEl = document.getElementById("asw-username");
  const pEl = document.getElementById("asw-password");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }
  if (uEl) uEl.value = "";
  if (pEl) pEl.value = "";
  modal.classList.add("open");
  setTimeout(() => {
    if (uEl) uEl.focus();
  }, 80);
};

window.closeAdminSwitchModal = function () {
  const modal = document.getElementById("modal-admin-switch");
  if (modal) modal.classList.remove("open");
};

/** Login from the admin-switch modal (student mode → admin dashboard) */
window.doAdminSwitch = async function () {
  const uEl = document.getElementById("asw-username");
  const pEl = document.getElementById("asw-password");
  const errEl = document.getElementById("asw-error");
  const btn = document.getElementById("asw-submit-btn");

  const username = uEl ? uEl.value.trim() : "";
  const password = pEl ? pEl.value : "";

  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }

  if (!username || !password) {
    if (errEl) {
      errEl.textContent = "⚠ Please enter username and password.";
      errEl.style.display = "block";
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Signing in…";
  }

  try {
    const res = await fetch(API_BASE + "login.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password }),
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (_) {}

    if (data.success) {
      closeAdminSwitchModal();
      _isStudentMode = false;
      document.body.classList.remove("student-mode");
      setTopbarMode("admin", data.username || username, data.full_name || "");
      setAdminName(data.username || username, data.full_name || "");
      switchView("dashboard");
    } else {
      const msg = data.error || "Invalid username or password.";
      if (errEl) {
        errEl.textContent = "⚠ " + msg;
        errEl.style.display = "block";
      }
      // Shake
      const card = document.querySelector(".asw-card");
      if (card) {
        card.style.animation = "none";
        card.offsetHeight;
        card.style.animation = "login-shake 0.35s ease";
      }
      if (pEl) pEl.value = "";
    }
  } catch (e) {
    if (errEl) {
      errEl.textContent = "⚠ Connection error. Check server.";
      errEl.style.display = "block";
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Sign In to Dashboard";
    }
  }
};

/**
 * setTopbarMode — switches the topbar admin badge between "admin" and "student" mode.
 * mode: "admin" | "student"
 */
function setTopbarMode(mode, username, fullName) {
  const badge = document.getElementById("topbar-admin");
  const nameEl = document.getElementById("topbar-admin-name");
  const smBadge = document.getElementById("student-mode-badge");

  if (!badge) return;

  if (mode === "student") {
    // Student mode: badge becomes clickable → opens admin login modal
    if (nameEl) nameEl.textContent = "Admin";
    badge.classList.add("student-mode");
    badge.title = "Click to sign in as Admin";
    badge.onclick = () => window.openAdminSwitchModal();
    // Show student mode badge
    if (smBadge) smBadge.style.display = "flex";
  } else {
    // Admin mode: show name, not clickable
    const display = fullName || username || "Admin";
    if (nameEl) nameEl.textContent = display;
    badge.classList.remove("student-mode");
    badge.title = "";
    badge.onclick = null;
    if (smBadge) smBadge.style.display = "none";
  }
}

/**
 * doLogin — real implementation that replaces the stub in index.html.
 * Used by the main login overlay (admin path).
 */
window.doLogin = async function () {
  const usernameEl = document.getElementById("login-username");
  const passwordEl = document.getElementById("login-password");
  const errorEl = document.getElementById("login-error");
  const loginBtn =
    document.getElementById("login-btn") ||
    document.querySelector(
      "#login-step-credentials button[onclick*='doLogin']",
    );

  const username = usernameEl ? usernameEl.value.trim() : "";
  const password = passwordEl ? passwordEl.value : "";

  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }

  if (!username || !password) {
    if (errorEl) {
      errorEl.textContent = "⚠ Please enter username and password.";
      errorEl.style.display = "block";
    }
    return;
  }

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in…";
  }

  try {
    const res = await fetch(API_BASE + "login.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password }),
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (_) {}

    if (data.success) {
      const overlay = document.getElementById("login-overlay");
      if (overlay) {
        overlay.style.transition = "opacity 0.4s ease";
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.style.display = "none";
          overlay.style.opacity = "";
        }, 420);
      }
      _isStudentMode = false;
      document.body.classList.remove("student-mode");
      setAdminName(data.username || username, data.full_name || "");
      setTopbarMode("admin", data.username || username, data.full_name || "");
      switchView("dashboard");
    } else {
      const msg = data.error || "Invalid username or password.";
      if (errorEl) {
        errorEl.textContent = "⚠ " + msg;
        errorEl.style.display = "block";
      }
      const card = document.querySelector("#login-step-credentials");
      if (card) {
        card.style.animation = "none";
        card.offsetHeight;
        card.style.animation = "login-shake 0.35s ease";
      }
    }
  } catch (e) {
    if (errorEl) {
      errorEl.textContent = "⚠ Connection error. Please check your server.";
      errorEl.style.display = "block";
    }
    console.error("Login error:", e);
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Sign In";
    }
  }
};

/**
 * setAdminName — updates sidebar admin display name elements.
 */
function setAdminName(username, fullName) {
  const display = fullName || username || "Admin";
  const adminNameEl = document.getElementById("admin-display-name");
  const adminUserEl = document.getElementById("admin-username");
  if (adminNameEl) adminNameEl.textContent = display;
  if (adminUserEl) adminUserEl.textContent = "@" + (username || "admin");
}

/**
 * confirmModalPassword — verifies admin password for sensitive actions.
 */
window.confirmModalPassword = async function () {
  const input = document.getElementById("modal-pass-input");
  const errEl = document.getElementById("modal-pass-err");
  const pass = input ? input.value : "";

  if (!pass) {
    if (errEl) {
      errEl.textContent = "Password is required.";
      errEl.style.display = "block";
    }
    return;
  }
  if (errEl) errEl.style.display = "none";

  try {
    const res = await api(
      "login.php",
      {},
      { action: "verify", password: pass },
    );
    if (res && res.success) {
      closeModal("modal-password");
      if (typeof window._modalPasswordCallback === "function") {
        const cb = window._modalPasswordCallback;
        window._modalPasswordCallback = null;
        cb();
      }
    } else {
      if (errEl) {
        errEl.textContent = "Incorrect password.";
        errEl.style.display = "block";
      }
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  } catch (e) {
    if (errEl) {
      errEl.textContent = "Connection error. Try again.";
      errEl.style.display = "block";
    }
  }
};

/**
 * logOut / doLogout — clears session and reloads to show login screen.
 * Both names are exposed so any button (logOut or doLogout) will work.
 */
window.logOut = async function () {
  try {
    // Show a quick visual cue while logging out
    const btn = document.querySelector("[onclick*='ogout']");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Logging out…";
    }

    await fetch(API_BASE + "login.php?action=logout", {
      credentials: "include",
    });
  } catch (_) {}
  window.location.reload();
};

// Alias — app.html calls doLogout(), app.js defines logOut(). Both work now.
window.doLogout = window.logOut;

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  startClock();
  initDateRanges();

  // Inject admin-switch modal + student-mode styles into the DOM
  injectAdminSwitchModal();

  // Inject "Student Mode" badge into the topbar (right side, before clock)
  (function injectStudentBadge() {
    const topbarRight = document.querySelector(".topbar-right");
    if (!topbarRight) return;
    const badge = document.createElement("div");
    badge.id = "student-mode-badge";
    badge.innerHTML = `<span class="sm-dot"></span>Student Mode`;
    badge.title = "Student attendance mode is active";
    // Insert before the clock div
    const clock = document.getElementById("live-clock");
    if (clock) topbarRight.insertBefore(badge, clock);
    else topbarRight.appendChild(badge);
  })();

  // Check if already logged in (session cookie)
  try {
    const r = await fetch(API_BASE + "login.php?action=check", {
      credentials: "include",
    });
    const t = await r.text();
    let data = { logged_in: false };
    try {
      data = JSON.parse(t);
    } catch (_) {}

    if (data.logged_in) {
      // Already authenticated — hide login overlay, show dashboard
      const overlay = document.getElementById("login-overlay");
      if (overlay) overlay.style.display = "none";
      _isStudentMode = false;
      document.body.classList.remove("student-mode");
      setAdminName(data.username, data.full_name);
      setTopbarMode("admin", data.username, data.full_name);
      switchView("dashboard");
    } else {
      // Not logged in — show login overlay
      const overlay = document.getElementById("login-overlay");
      if (overlay) {
        overlay.style.display = "flex";
        overlay.style.opacity = "1";
      }
      // If user came from landing page (index.html Attendance button),
      // keep the role selector visible (default state — no extra action needed).
      // Clear the flag so refreshes don't carry it forward.
      if (sessionStorage.getItem("philcst_from_landing")) {
        sessionStorage.removeItem("philcst_from_landing");
        // Ensure role step is shown, credentials step is hidden
        const roleStep = document.getElementById("login-step-role");
        const credStep = document.getElementById("login-step-credentials");
        if (roleStep) roleStep.style.display = "block";
        if (credStep) credStep.style.display = "none";
      }
      // Default topbar to student mode until admin logs in
      setTopbarMode("student");
    }
  } catch (_) {
    // Network error fallback — still show login overlay so session is required.
    // (Previously this jumped to dashboard, causing the "auto-login" bug.)
    const overlay = document.getElementById("login-overlay");
    if (overlay) {
      overlay.style.display = "flex";
      overlay.style.opacity = "1";
    }
    setTopbarMode("student");
    console.warn(
      "Session check failed (network error) — showing login screen.",
    );
  }

  // Hide the page loader once session check is done
  if (typeof window._loaderComplete === "function") window._loaderComplete();

  setTimeout(() => loadFaceModels(), 1200);
  loadSettingsValues();
});

// Safety: force dismiss loader after 5s even if API hangs or 500s
setTimeout(() => {
  if (typeof window._loaderComplete === "function") window._loaderComplete();
}, 5000);

// Hamburger toggle handled by HTML #hamburger-btn

// ══════════════════════════════════════════════

// ── RESPONSIVE RESIZE HANDLER ────────────────────────────────────
// BUG FIX: Removed `window.onload = showLoading` — that function
// crashes because #loading-overlay doesn't exist in this page and
// it conflicts with the philcst-page-loader already injected above.
// Also removed the duplicate `load` listener that crashed trying to
// remove #loader which is already cleaned up by _loaderComplete().
//
// BUG FIX: The original `window.addEventListener("load", ...)` at
// the bottom called `loader.remove()` on a potentially null element
// (if _loaderComplete() already ran), causing "Cannot read properties
// of null (reading 'style')" — guarded with optional chaining now.

window.addEventListener("resize", () => {
  if (window.innerWidth < 768) {
    // Mobile breakpoint — add any responsive adjustments here
  }
});
