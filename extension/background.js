// Clique no ícone da extensão (ou primeira instalação) abre o assistente de mapeamento.
const openWizard = () => chrome.tabs.create({ url: chrome.runtime.getURL("wizard.html") });
chrome.action.onClicked.addListener(openWizard);
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") openWizard();
});
