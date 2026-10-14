(() => {
  const core = globalThis.BO1PadRemapCore;
  const cap = globalThis.BO1Capture;
  const $ = (id) => document.getElementById(id);

  const { t, dict } = globalThis.BO1I18n;
  // Steps in the standard (Xbox) layout: 4 stick axes, then the 17 standard buttons. Text comes from i18n.js.
  const STEPS = dict.steps.map(([label, help], k) =>
    k < 4 ? { kind: "axis", target: k, label, help: t("holdStick") } : { kind: "button", target: k - 4, label, help }
  );
  const STD_NAMES = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Back", "Start", "L3", "R3", "↑", "↓", "←", "→", "Home"];

  let padIndex = null;
  let saved = null;
  let mode = "idle"; // idle | rest | step | wait-release | test
  let rest = null;
  let restSamples = [];
  let restUntil = 0;
  let stepIdx = 0;
  let results = []; // por passo: fonte capturada ou null (pulado)
  let releaseSince = 0;
  let buttonsEverSeen = false;
  let stepStartedAt = 0;

  const getPad = () => (padIndex === null ? null : navigator.getGamepads()[padIndex]);

  function refreshPadList() {
    const pads = [...navigator.getGamepads()].filter(Boolean);
    const sel = $("padSelect");
    const current = sel.value;
    sel.innerHTML = "";
    for (const p of pads) {
      const o = document.createElement("option");
      o.value = p.index;
      o.textContent = `#${p.index} — ${p.id}${p.mapping === "standard" ? "" : ` (${t("rawLayout")})`}`;
      sel.appendChild(o);
    }
    sel.hidden = pads.length === 0;
    $("pickHint").hidden = pads.length > 0;
    if (pads.length) {
      sel.value = pads.some((p) => String(p.index) === current) ? current : String(pads[0].index);
      padIndex = Number(sel.value);
    } else {
      padIndex = null;
    }
    $("startBtn").disabled = padIndex === null || mode === "rest" || mode === "step" || mode === "wait-release";
  }

  function showSaved() {
    const has = !!saved;
    $("savedInfo").hidden = !has;
    $("testBtn").hidden = !has;
    $("clearBtn").hidden = !has;
    if (has) $("savedInfo").textContent = t("savedFor", { name: saved.padId });
  }

  function usedSet(upTo) {
    const keys = new Set();
    const stickAxes = new Set();
    for (let k = 0; k < upTo; k++) {
      const r = results[k];
      if (!r) continue;
      if (STEPS[k].kind === "axis") stickAxes.add(r.i);
      else keys.add(cap.keyOf(r));
    }
    return { keys, stickAxes };
  }

  function startWizard() {
    if (!getPad()) return;
    results = new Array(STEPS.length).fill(undefined);
    stepIdx = 0;
    buttonsEverSeen = false;
    $("wizard").hidden = false;
    $("test").hidden = true;
    $("noButtons").hidden = true;
    $("restBox").hidden = false;
    $("stepBox").hidden = true;
    $("startBtn").disabled = true;
    restSamples = [];
    restUntil = performance.now() + 900;
    mode = "rest";
  }

  function showStep() {
    const s = STEPS[stepIdx];
    $("restBox").hidden = true;
    $("stepBox").hidden = false;
    $("progress").textContent = t("progress", { n: stepIdx + 1, total: STEPS.length });
    $("stepLabel").textContent = s.label;
    $("stepHelp").textContent = s.help;
    $("stepStatus").textContent = "";
    $("backBtn").disabled = stepIdx === 0;
    stepStartedAt = performance.now();
    mode = "step";
  }

  function nextStep() {
    stepIdx++;
    if (stepIdx >= STEPS.length) finish();
    else showStep();
  }

  function finish() {
    const pad = getPad();
    const map = { version: 1, padId: pad ? pad.id : saved?.padId, created: Date.now(), buttons: {}, axes: {} };
    STEPS.forEach((s, k) => {
      const r = results[k] || null;
      if (s.kind === "axis") map.axes[s.target] = r;
      else map.buttons[s.target] = r;
    });
    cap.finalizeHat(map.buttons);
    chrome.storage.local.set({ padmap: map }, () => {
      saved = map;
      showSaved();
      $("wizard").hidden = true;
      $("savedMsg").hidden = false;
      openTest();
    });
  }

  function openTest() {
    if (!saved) return;
    $("test").hidden = false;
    $("startBtn").disabled = padIndex === null;
    const vb = $("vButtons");
    vb.innerHTML = "";
    STD_NAMES.forEach((n) => {
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = n;
      vb.appendChild(c);
    });
    const va = $("vAxes");
    va.innerHTML = "";
    dict.axes.forEach((n) => {
      const d = document.createElement("div");
      d.className = "axis";
      d.innerHTML = `<label>${n}</label><div class="bar"><i></i></div>`;
      va.appendChild(d);
    });
    mode = "test";
  }

  function renderRaw(pad) {
    const rb = $("rawButtons");
    const ra = $("rawAxes");
    if (rb.children.length !== pad.buttons.length) {
      rb.innerHTML = pad.buttons.map((_, i) => `<span class="chip">B${i}</span>`).join("");
    }
    if (ra.children.length !== pad.axes.length) {
      ra.innerHTML = pad.axes.map(() => `<span class="chip"></span>`).join("");
    }
    pad.buttons.forEach((b, i) => rb.children[i].classList.toggle("on", b.pressed || b.value > 0.5));
    pad.axes.forEach((v, i) => (ra.children[i].textContent = `A${i} ${v.toFixed(2)}`));
  }

  function renderTest(pad) {
    if (!core.matches(pad, saved)) return;
    const v = core.virtualPad(pad, saved);
    const vb = $("vButtons").children;
    v.buttons.forEach((b, i) => vb[i] && vb[i].classList.toggle("on", b.pressed));
    const bars = $("vAxes").querySelectorAll(".bar i");
    v.axes.forEach((a, i) => bars[i] && (bars[i].style.left = `${50 + a * 50}%`));
  }

  function loop(now) {
    const pad = getPad();
    if (pad) {
      renderRaw(pad);
      const snap = cap.snapshot(pad);
      if (snap.buttons.some((b) => b > 0)) buttonsEverSeen = true;

      if (mode === "rest") {
        restSamples.push(snap);
        if (now >= restUntil) {
          rest = cap.averageRest(restSamples);
          showStep();
        }
      } else if (mode === "step") {
        const step = STEPS[stepIdx];
        const src = cap.detect(snap, rest, step, usedSet(stepIdx));
        if (src) {
          results[stepIdx] = src;
          $("stepStatus").textContent = t("got");
          releaseSince = 0;
          mode = "wait-release";
        } else if (step.kind === "button" && !buttonsEverSeen && now - stepStartedAt > 10000) {
          $("noButtons").hidden = false;
        }
      } else if (mode === "wait-release") {
        if (cap.released(snap, rest)) {
          releaseSince ||= now;
          if (now - releaseSince > 250) nextStep();
        } else {
          releaseSince = 0;
        }
      } else if (mode === "test" && saved) {
        renderTest(pad);
      }
    }
    requestAnimationFrame(loop);
  }

  $("padSelect").addEventListener("change", (e) => (padIndex = Number(e.target.value)));
  $("startBtn").addEventListener("click", startWizard);
  $("redoBtn").addEventListener("click", startWizard);
  $("testBtn").addEventListener("click", () => {
    $("savedMsg").hidden = true;
    openTest();
  });
  $("clearBtn").addEventListener("click", () => {
    chrome.storage.local.remove("padmap", () => {
      saved = null;
      showSaved();
      $("test").hidden = true;
      mode = "idle";
    });
  });
  $("skipBtn").addEventListener("click", () => {
    if (mode !== "step" && mode !== "wait-release") return;
    results[stepIdx] = null;
    nextStep();
  });
  $("backBtn").addEventListener("click", () => {
    if (stepIdx === 0) return;
    results[stepIdx] = undefined;
    stepIdx--;
    results[stepIdx] = undefined;
    showStep();
  });
  $("cancelBtn").addEventListener("click", () => {
    mode = saved ? "idle" : "idle";
    $("wizard").hidden = true;
    refreshPadList();
  });

  addEventListener("gamepadconnected", refreshPadList);
  addEventListener("gamepaddisconnected", refreshPadList);
  setInterval(() => {
    if (padIndex === null) refreshPadList();
  }, 500);

  chrome.storage.local.get("padmap", (r) => {
    saved = r.padmap || null;
    showSaved();
  });
  refreshPadList();
  requestAnimationFrame(loop);
})();
