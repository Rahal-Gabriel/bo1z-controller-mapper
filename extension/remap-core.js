// Núcleo: converte um controle "cru" no layout padrão (Xbox) do Gamepad API usando o mapeamento salvo.
// Usado pelo assistente (teste ao vivo) e pelo script injetado no vel.gg.
(() => {
  if (globalThis.BO1PadRemapCore) return;

  const HAT_STEP = 2 / 7; // direcional "hat": -1 = cima, avançando no sentido horário a cada 2/7
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function hatPressed(current, src) {
    if (!(Math.abs(current) <= 1.05)) return false; // fora de [-1, 1] = solto
    if (src.circ) {
      const k = Math.round((current + 1) / HAT_STEP);
      const kt = Math.round((src.v + 1) / HAT_STEP);
      const d = Math.abs(k - kt) % 8;
      return Math.min(d, 8 - d) <= 1; // inclui as diagonais vizinhas
    }
    return Math.abs(current - src.v) < 0.15;
  }

  /** Valor 0..1 de uma fonte de botão. */
  function readButton(pad, src) {
    if (!src) return 0;
    if (src.t === "b") {
      const b = pad.buttons[src.i];
      return b ? Math.max(b.value || 0, b.pressed ? 1 : 0) : 0;
    }
    const v = pad.axes[src.i];
    if (v === undefined) return 0;
    if (src.t === "h") return hatPressed(v, src) ? 1 : 0;
    if (src.t === "a") {
      const span = src.full - src.rest;
      if (Math.abs(span) < 1e-6) return 0;
      return clamp((v - src.rest) / span, 0, 1);
    }
    return 0;
  }

  /** Eixo padrão -1..1 com centro corrigido (analógicos que repousam fora do zero). */
  function readAxis(pad, src) {
    if (!src) return 0;
    const v = pad.axes[src.i];
    if (v === undefined) return 0;
    const rest = Math.abs(src.rest) < 0.6 ? src.rest : 0;
    const d = v - rest;
    const out = d >= 0 ? d / (1 - rest) : d / (1 + rest);
    return clamp(out * src.sign, -1, 1);
  }

  function virtualPad(raw, map) {
    const buttons = [];
    for (let i = 0; i < 17; i++) {
      const value = readButton(raw, map.buttons[i]);
      const pressed = value > 0.5;
      buttons.push({ pressed, touched: pressed, value });
    }
    const axes = [0, 1, 2, 3].map((i) => readAxis(raw, map.axes[i]));
    return {
      id: raw.id,
      index: raw.index,
      connected: raw.connected,
      mapping: "standard",
      timestamp: raw.timestamp,
      axes,
      buttons,
      vibrationActuator: raw.vibrationActuator ?? null,
      hapticActuators: raw.hapticActuators ?? [],
    };
  }

  const hwKey = (id) => (String(id).match(/Vendor:\s*\w+\s*Product:\s*\w+/i) || [""])[0].toLowerCase();

  /** O mapeamento vale para este controle? (mesmo id, ou mesmo vendor/product) */
  function matches(pad, map) {
    if (!pad || !map) return false;
    if (pad.id === map.padId) return true;
    const a = hwKey(pad.id);
    return a !== "" && a === hwKey(map.padId);
  }

  globalThis.BO1PadRemapCore = { virtualPad, matches, readButton, readAxis, hatPressed, HAT_STEP };
})();
