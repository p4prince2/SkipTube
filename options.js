import { DEFAULTS, getSettings, saveSettings } from './utils/storage.js';
const fields = ['autoSkip', 'manualConfirmation', 'notificationDuration', 'debugMode'];
async function load() {
  const data = await getSettings();
  for (const id of fields) { const element = document.getElementById(id); element.type === 'checkbox' ? element.checked = data[id] : element.value = String(data[id]); }
  for (const id of ['whitelistChannels', 'whitelistVideos']) document.getElementById(id).value = (data[id] || []).join('\n');
}
async function persist() {
  const values = {};
  for (const id of fields) { const element = document.getElementById(id); values[id] = element.type === 'checkbox' ? element.checked : Number(element.value); }
  values.whitelistChannels = document.getElementById('whitelistChannels').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  values.whitelistVideos = document.getElementById('whitelistVideos').value.split(/\r?\n/).map(value => value.trim()).filter(value => /^[\w-]{11}$/.test(value));
  await saveSettings(values);
  chrome.runtime.sendMessage({ type: 'SKIPTUBE_SETTINGS_CHANGED' }).catch(() => {});
  const status = document.getElementById('saved'); status.textContent = 'Settings saved'; setTimeout(() => status.textContent = '', 1400);
}
for (const element of document.querySelectorAll('input,select,textarea')) element.addEventListener(element.tagName === 'TEXTAREA' ? 'change' : 'change', persist);
document.getElementById('reset').addEventListener('click', async () => {
  await saveSettings({ autoSkip: DEFAULTS.autoSkip, manualConfirmation: DEFAULTS.manualConfirmation, notificationDuration: DEFAULTS.notificationDuration, debugMode: DEFAULTS.debugMode, categories: DEFAULTS.categories, whitelistChannels: [], whitelistVideos: [] });
  chrome.runtime.sendMessage({ type: 'SKIPTUBE_SETTINGS_CHANGED' }).catch(() => {});
  await load();
});
document.getElementById('openVideo').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.includes('youtube.com/watch')) { chrome.tabs.sendMessage(tab.id, { type: 'SKIPTUBE_SUBMISSION_OPEN' }).catch(() => {}); window.close(); }
  else chrome.tabs.create({ url: 'https://www.youtube.com/' });
});
load();
