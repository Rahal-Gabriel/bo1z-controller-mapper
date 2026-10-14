// Lógica de captura do assistente (sem DOM, para poder testar).
(() => {
  const HAT_REST = 1.05; // eixo que repousa fora de [-1, 1] é um direcional "hat"
  const PRESS = 0.6;
  const RELEASE = 0.3;

  const isHat = (rest) => Math.abs(rest) > HAT_REST;

  /** Média do estado parado do controle. */
  function averageRest(samples) {
    const n = samples.length;
    const axes = samples[0].axes.map((_, i) => samples.reduce((s, p) => s + p.axes[i], 0) / n);
    const buttons = samples[0].buttons.map((_, i) => samples.reduce((s, p) => s + p.buttons[i], 0) / n);
    return { axes, buttons };
  }

  /** Foto simples (números) de um Gamepad. */
  function snapshot(pad) {
    return {
      axes: Array.from(pad.axes, (v) => v),
      buttons: Array.from(pad.buttons, (b) => Math.max(b.value || 0, b.pressed ? 1 : 0)),
    };
  }

  const keyOf = (src) =>
    src.t === "b" ? `b${src.i}` : src.t === "h" ? `h${src.i}:${src.v.toFixed(2)}` : `a${src.i}${src.full > src.rest ? "+" : "-"}`;

  /**
   * Detecta a entrada sendo acionada agora.
   * step.kind: "axis" (analógico) ou "button".
   * used: { keys:Set, stickAxes:Set } entradas já atribuídas.
   */
  function detect(snap, rest, step, used) {
    if (step.kind === "axis") {
      let best = null;
      snap.axes.forEach((v, i) => {
        if (isHat(rest.axes[i]) || used.stickAxes.has(i)) return;
        const d = v - rest.axes[i];
        if (Math.abs(d) > PRESS && (!best || Math.abs(d) > Math.abs(best.d))) best = { d, i };
      });
      if (!best) return null;
      return { i: best.i, sign: best.d > 0 ? 1 : -1, rest: rest.axes[best.i] };
    }

    // Botão: prefere botão de verdade; senão eixo (gatilho analógico) ou direcional hat.
    for (let i = 0; i < snap.buttons.length; i++) {
      if (snap.buttons[i] > 0.5 && rest.buttons[i] < RELEASE) {
        const src = { t: "b", i };
        if (!used.keys.has(keyOf(src))) return src;
      }
    }
    for (let i = 0; i < snap.axes.length; i++) {
      const v = snap.axes[i];
      const r = rest.axes[i];
      let src = null;
      if (isHat(r)) {
        if (Math.abs(v) <= HAT_REST) src = { t: "h", i, v: Math.round(v * 1000) / 1000 };
      } else if (!used.stickAxes.has(i) && Math.abs(v - r) > PRESS) {
        src = { t: "a", i, rest: r, full: v > r ? 1 : -1 };
      }
      if (src && !used.keys.has(keyOf(src))) return src;
    }
    return null;
  }

  /** Tudo solto de novo? */
  function released(snap, rest) {
    if (snap.buttons.some((v, i) => v > RELEASE && rest.buttons[i] < RELEASE)) return false;
    return snap.axes.every((v, i) => {
      const r = rest.axes[i];
      if (isHat(r)) return Math.abs(v) > HAT_REST;
      return Math.abs(v - r) < RELEASE;
    });
  }

  /** Marca o direcional como "circular" (aceita diagonais) se for um hat padrão de 8 posições. */
  function finalizeHat(buttons) {
    const dpad = [12, 13, 14, 15].map((i) => buttons[i]);
    if (!dpad.every((s) => s && s.t === "h" && s.i === dpad[0].i)) return;
    const STEP = 2 / 7;
    const ks = dpad.map((s) => (s.v + 1) / STEP);
    const integral = ks.every((k) => Math.abs(k - Math.round(k)) < 0.15);
    const r = ks.map(Math.round);
    const distinct = new Set(r).size === 4;
    const even = r.every((k) => (k - r[0]) % 2 === 0);
    if (integral && distinct && even) dpad.forEach((s) => (s.circ = true));
  }

  globalThis.BO1Capture = { averageRest, snapshot, detect, released, keyOf, finalizeHat, isHat };
})();
