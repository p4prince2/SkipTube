import { CATEGORIES, getSettings, mergeVideoState, saveSettings } from './utils/storage.js';
import { configureRepositoryLink } from './utils/repository-link.js';
const $ = selector => document.querySelector(selector);
const enabled = $('#enabled');
const REPOSITORY_URL = 'https://github.com/p4prince2/SkipTube';

async function render() {
  const settings = await getSettings(); enabled.checked = settings.enabled;
  $('#consent').hidden = settings.dataConsent;
  $('#controls').hidden = !settings.dataConsent;
  $('#master-control').hidden = !settings.dataConsent;
  $('#skipped').textContent = settings.skippedCount || 0;
  const minutes = Math.floor((settings.savedSeconds || 0) / 60); $('#saved').textContent = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  $('#category-list').innerHTML = Object.entries(CATEGORIES).map(([key, meta]) => `<div class="cat"><label for="category-${key}"><i class="dot" style="background:${meta.color}"></i>${meta.label}</label><label class="switch"><input id="category-${key}" type="checkbox" data-category="${key}" ${settings.categories[key] ? 'checked' : ''}><span></span></label></div>`).join('');
  $('#category-list').querySelectorAll('input').forEach(input => input.addEventListener('change', async () => {
    const latest = await getSettings(); latest.categories[input.dataset.category] = input.checked; await saveSettings({ categories: latest.categories });
  }));
}

$('#agree').addEventListener('click', async () => {
  await saveSettings({ dataConsent: true });
  chrome.runtime.sendMessage({ type: 'SKIPTUBE_SETTINGS_CHANGED' }).catch(() => {});
  await renderTabState();
});

enabled.addEventListener('change', async () => {
  await saveSettings({ enabled: enabled.checked });
  chrome.runtime.sendMessage({ type: 'SKIPTUBE_SETTINGS_CHANGED' }).catch(() => {});
});
$('#settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
async function renderTabState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  let onVideo = false, activeVideo = '', state = null;
  try { const parsed = new URL(url); onVideo = ['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(parsed.hostname) && parsed.pathname === '/watch' && /^[\w-]{11}$/.test(parsed.searchParams.get('v') || ''); activeVideo = parsed.searchParams.get('v') || ''; } catch {}
  if (onVideo && tab?.id != null) {
    try {
      const liveState = await chrome.tabs.sendMessage(tab.id, { type: 'SKIPTUBE_GET_STATE', videoId: activeVideo });
      if (liveState?.videoId === activeVideo) state = { ...liveState, updatedAt: Date.now() };
    } catch { /* The content script may be in startup; use its last worker snapshot below. */ }
    const key = `state:${tab.id}`;
    const stored = await chrome.storage.session.get(key);
    state = mergeVideoState(state, stored[key], activeVideo);
  }
  const labels = { loading: ['Loading segments…', `Video ${activeVideo}`], ready: ['YouTube video active', `${state?.count ?? 0} segments available`], error: ['SponsorBlock unavailable', state.error || 'Playback can continue normally'], disabled: ['SkipTube is disabled', `Video ${activeVideo}`], whitelisted: ['Video is whitelisted', `Video ${activeVideo}`] };
  const shown = labels[state?.state] || (onVideo ? ['YouTube video active', `Video ${activeVideo}`] : ['No video detected', 'Open a YouTube video to get started']);
  $('#video-state').textContent = shown[0]; $('#video-detail').textContent = shown[1];
  $('.pulse').classList.toggle('live', onVideo && state?.state !== 'error'); $('.pulse').classList.toggle('error', state?.state === 'error');
}
renderTabState();
render();
configureRepositoryLink($('#github'), REPOSITORY_URL);
chrome.storage.onChanged.addListener(() => { render(); renderTabState(); });
