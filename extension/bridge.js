// Mundo isolado: lê o mapeamento salvo e entrega para o script da página (mundo MAIN) via atributo no <html>.
(() => {
  const ATTR = "data-bo1-padmap";
  const apply = (map) => {
    const root = document.documentElement;
    if (!root) return;
    if (map) root.setAttribute(ATTR, JSON.stringify(map));
    else root.removeAttribute(ATTR);
  };
  chrome.storage.local.get("padmap", (r) => apply(r.padmap));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.padmap) apply(changes.padmap.newValue);
  });
})();
