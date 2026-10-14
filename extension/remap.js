// Mundo MAIN do vel.gg: intercepta navigator.getGamepads() e devolve o controle já no layout padrão.
// O vel.gg e a extensão de co-op leem getGamepads() a cada frame, então a ordem de carregamento não importa.
(() => {
  if (window.__bo1PadRemapInstalled) return;
  window.__bo1PadRemapInstalled = true;

  const core = globalThis.BO1PadRemapCore;
  const original = Navigator.prototype.getGamepads;
  if (!core || typeof original !== "function") return;

  const ATTR = "data-bo1-padmap";
  let cachedText = null;
  let map = null;

  function currentMap() {
    const text = document.documentElement ? document.documentElement.getAttribute(ATTR) : null;
    if (text !== cachedText) {
      cachedText = text;
      try {
        map = text ? JSON.parse(text) : null;
      } catch {
        map = null;
      }
      if (map) console.info("[BO1Z Controller Mapper] mapeamento ativo para:", map.padId);
    }
    return map;
  }

  Navigator.prototype.getGamepads = function getGamepads() {
    const pads = original.call(this);
    const m = currentMap();
    if (!m || !pads) return pads;
    const out = Array.from(pads);
    for (let i = 0; i < out.length; i++) {
      const pad = out[i];
      if (pad && pad.connected && core.matches(pad, m)) {
        try {
          out[i] = core.virtualPad(pad, m);
        } catch (e) {
          console.warn("[BO1Z Controller Mapper] erro ao traduzir:", e);
        }
        break;
      }
    }
    return out;
  };
})();
