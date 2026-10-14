(() => {
  const core = globalThis.BO1PadRemapCore;
  const cap = globalThis.BO1Capture;
  const $ = (id) => document.getElementById(id);

  // Passos no layout padrão (Xbox). Nomes dos botões pela POSIÇÃO, com o nome no Switch entre parênteses.
  const STEPS = [
    { kind: "axis", target: 0, label: "Analógico ESQUERDO para a DIREITA", help: "Empurre até o fim e segure." },
    { kind: "axis", target: 1, label: "Analógico ESQUERDO para BAIXO", help: "Empurre até o fim e segure." },
    { kind: "axis", target: 2, label: "Analógico DIREITO para a DIREITA", help: "Empurre até o fim e segure." },
    { kind: "axis", target: 3, label: "Analógico DIREITO para BAIXO", help: "Empurre até o fim e segure." },
    { kind: "button", target: 0, label: "Aperte B (Switch)", help: "O botão de baixo dos 4 botões da direita · no Xbox seria o A — no jogo: pular" },
    { kind: "button", target: 1, label: "Aperte A (Switch)", help: "O botão da direita dos 4 botões da direita · no Xbox seria o B — no jogo: agachar" },
    { kind: "button", target: 2, label: "Aperte Y (Switch)", help: "O botão da esquerda dos 4 botões da direita · no Xbox seria o X — no jogo: usar / reparar / recarregar (segurar = usar)" },
    { kind: "button", target: 3, label: "Aperte X (Switch)", help: "O botão de cima dos 4 botões da direita · no Xbox seria o Y — no jogo: trocar arma" },
    { kind: "button", target: 4, label: "L (ombro esquerdo)", help: "No jogo: granada tática" },
    { kind: "button", target: 5, label: "R (ombro direito)", help: "No jogo: granada" },
    { kind: "button", target: 6, label: "ZL (gatilho esquerdo)", help: "No jogo: mirar" },
    { kind: "button", target: 7, label: "ZR (gatilho direito)", help: "No jogo: atirar" },
    { kind: "button", target: 8, label: "Botão −", help: "No jogo: placar" },
    { kind: "button", target: 9, label: "Botão +", help: "No jogo: pausar" },
    { kind: "button", target: 10, label: "CLIQUE do analógico esquerdo", help: "Aperte o analógico para dentro — no jogo: correr" },
    { kind: "button", target: 11, label: "CLIQUE do analógico direito", help: "Aperte o analógico para dentro — no jogo: faca" },
    { kind: "button", target: 12, label: "Direcional para CIMA", help: "" },
    { kind: "button", target: 13, label: "Direcional para BAIXO", help: "" },
    { kind: "button", target: 14, label: "Direcional para a ESQUERDA", help: "" },
    { kind: "button", target: 15, label: "Direcional para a DIREITA", help: "" },
    { kind: "button", target: 16, label: "Botão HOME", help: "Opcional — pode pular" },
  ];
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
      o.textContent = `#${p.index} — ${p.id}${p.mapping === "standard" ? "" : " (formato cru)"}`;
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
    if (has) $("savedInfo").textContent = `Mapeamento salvo para: ${saved.padId}`;
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
    $("progress").textContent = `(${stepIdx + 1} de ${STEPS.length})`;
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
    ["Esq. X", "Esq. Y", "Dir. X", "Dir. Y"].forEach((n) => {
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
          $("stepStatus").textContent = "Pegou! Agora solte…";
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
