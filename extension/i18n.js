// Interface strings. English by default; Portuguese when the browser language is Portuguese.
(() => {
  const STRINGS = {
    en: {
      subtitle: 'Teaches your controller to speak "Xbox" to vel.gg/bo1z. Do it once; it stays saved.',
      controllerTitle: "1. Controller",
      pickHint: "Plug in your controller and <b>move a stick or press a button</b> to make it show up here.",
      rawLayout: "raw layout",
      savedFor: "Mapping saved for: {name}",
      start: "Start mapping",
      testSaved: "Test saved mapping",
      clear: "Delete mapping",
      mappingTitle: "2. Mapping",
      progress: "({n} of {total})",
      rest: "Let go of the controller — don't touch anything…",
      back: "Back",
      skip: "Skip this one",
      cancel: "Cancel",
      got: "Got it! Now let go…",
      noButtons:
        "No controller buttons have reached Chrome so far (only the sticks). If you're pressing and nothing happens, " +
        "your system isn't passing this controller's buttons to the browser — mapping can't fix that; use an app that " +
        "turns the controller into keyboard/mouse. First try unplugging and replugging the cable, and pressing Home.",
      testTitle: "3. Test",
      testSub: "— what the game will receive",
      saved: "Mapping saved. Open (or reload) vel.gg/bo1z and play.",
      redo: "Redo mapping",
      raw: "Raw controller signal (diagnostics)",
      axes: ["Left X", "Left Y", "Right X", "Right Y"],
      holdStick: "Push all the way and hold.",
      steps: [
        ["LEFT stick to the RIGHT", null],
        ["LEFT stick DOWN", null],
        ["RIGHT stick to the RIGHT", null],
        ["RIGHT stick DOWN", null],
        ["Press B (Switch)", "Bottom of the 4 right-side buttons · A on Xbox — in game: jump"],
        ["Press A (Switch)", "Right of the 4 right-side buttons · B on Xbox — in game: crouch"],
        ["Press Y (Switch)", "Left of the 4 right-side buttons · X on Xbox — in game: reload · hold = use / repair barriers"],
        ["Press X (Switch)", "Top of the 4 right-side buttons · Y on Xbox — in game: switch weapon"],
        ["L (left bumper)", "In game: tactical grenade"],
        ["R (right bumper)", "In game: grenade"],
        ["ZL (left trigger)", "In game: aim"],
        ["ZR (right trigger)", "In game: fire"],
        ["− button", "In game: scoreboard"],
        ["+ button", "In game: pause"],
        ["LEFT stick CLICK", "Press the stick in — in game: sprint"],
        ["RIGHT stick CLICK", "Press the stick in — in game: knife"],
        ["D-pad UP", ""],
        ["D-pad DOWN", ""],
        ["D-pad LEFT", ""],
        ["D-pad RIGHT", ""],
        ["HOME button", "Optional — you can skip it"],
      ],
    },
    pt: {
      subtitle: 'Ensina o seu controle a falar "Xbox" para o vel.gg/bo1z. Você faz uma vez; fica salvo.',
      controllerTitle: "1. Controle",
      pickHint: "Conecte o controle e <b>mexa um analógico ou aperte um botão</b> para ele aparecer aqui.",
      rawLayout: "formato cru",
      savedFor: "Mapeamento salvo para: {name}",
      start: "Começar mapeamento",
      testSaved: "Testar mapeamento salvo",
      clear: "Apagar mapeamento",
      mappingTitle: "2. Mapeamento",
      progress: "({n} de {total})",
      rest: "Solte o controle — não encoste em nada…",
      back: "Voltar",
      skip: "Pular este",
      cancel: "Cancelar",
      got: "Pegou! Agora solte…",
      noButtons:
        "Nenhum botão do controle chegou ao Chrome até agora (só os analógicos). Se você está apertando e nada acontece, " +
        "o sistema não está repassando os botões desse controle para o navegador — aí o mapeamento não resolve, e o caminho " +
        "é um app que transforma o controle em teclado/mouse. Tente antes: desconectar e reconectar o cabo, e apertar o Home.",
      testTitle: "3. Teste",
      testSub: "— o que o jogo vai receber",
      saved: "Mapeamento salvo. Abra (ou recarregue) o vel.gg/bo1z e jogue.",
      redo: "Refazer mapeamento",
      raw: "Sinal cru do controle (diagnóstico)",
      axes: ["Esq. X", "Esq. Y", "Dir. X", "Dir. Y"],
      holdStick: "Empurre até o fim e segure.",
      steps: [
        ["Analógico ESQUERDO para a DIREITA", null],
        ["Analógico ESQUERDO para BAIXO", null],
        ["Analógico DIREITO para a DIREITA", null],
        ["Analógico DIREITO para BAIXO", null],
        ["Aperte B (Switch)", "O botão de baixo dos 4 botões da direita · no Xbox seria o A — no jogo: pular"],
        ["Aperte A (Switch)", "O botão da direita dos 4 botões da direita · no Xbox seria o B — no jogo: agachar"],
        ["Aperte Y (Switch)", "O botão da esquerda dos 4 botões da direita · no Xbox seria o X — no jogo: recarregar · segurar = usar / reparar barreira"],
        ["Aperte X (Switch)", "O botão de cima dos 4 botões da direita · no Xbox seria o Y — no jogo: trocar arma"],
        ["L (ombro esquerdo)", "No jogo: granada tática"],
        ["R (ombro direito)", "No jogo: granada"],
        ["ZL (gatilho esquerdo)", "No jogo: mirar"],
        ["ZR (gatilho direito)", "No jogo: atirar"],
        ["Botão −", "No jogo: placar"],
        ["Botão +", "No jogo: pausar"],
        ["CLIQUE do analógico esquerdo", "Aperte o analógico para dentro — no jogo: correr"],
        ["CLIQUE do analógico direito", "Aperte o analógico para dentro — no jogo: faca"],
        ["Direcional para CIMA", ""],
        ["Direcional para BAIXO", ""],
        ["Direcional para a ESQUERDA", ""],
        ["Direcional para a DIREITA", ""],
        ["Botão HOME", "Opcional — pode pular"],
      ],
    },
  };

  const lang = /^pt\b/i.test(navigator.language || "") ? "pt" : "en";
  const dict = STRINGS[lang];
  const t = (key, vars = {}) => String(dict[key] ?? STRINGS.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

  globalThis.BO1I18n = { lang, t, dict };

  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
})();
