export const CATEGORIES = {
  sponsor: { label: 'Sponsor', color: '#ff4d6d' },
  selfpromo: { label: 'Self-promotion', color: '#ff8c42' },
  interaction: { label: 'Interaction reminder', color: '#ffd166' },
  intro: { label: 'Intro', color: '#06d6a0' },
  outro: { label: 'Outro', color: '#118ab2' },
  preview: { label: 'Preview / recap', color: '#8b7bff' },
  filler: { label: 'Filler', color: '#c77dff' },
  music_offtopic: { label: 'Non-music section', color: '#74c0fc' }
};

export const DEFAULTS = {
  enabled: true, dataConsent: false, autoSkip: true, manualConfirmation: false, notificationDuration: 2200,
  debugMode: false,
  categories: Object.fromEntries(Object.keys(CATEGORIES).map(key => [key, true])),
  whitelistChannels: [], whitelistVideos: [], skippedCount: 0, savedSeconds: 0,
  submissionUserId: '',
  cache: {}
};

export async function getSettings() {
  const keys = [...Object.keys(DEFAULTS), 'enabled', 'autoSkip', 'manualConfirmation', 'notificationDuration', 'debugMode', 'categories', 'whitelistChannels', 'whitelistVideos', 'skippedCount', 'savedSeconds', 'submissionUserId'];
  const data = await chrome.storage.local.get([...new Set(keys)]);
  return { ...DEFAULTS, ...data, categories: { ...DEFAULTS.categories, ...data.categories } };
}

export async function saveSettings(values) {
  await chrome.storage.local.set(values);
  return getSettings();
}

export async function updateStats(seconds) {
  const { skippedCount = 0, savedSeconds = 0 } = await chrome.storage.local.get(['skippedCount', 'savedSeconds']);
  await chrome.storage.local.set({ skippedCount: skippedCount + 1, savedSeconds: savedSeconds + seconds });
}

export function mergeVideoState(liveState, storedState, videoId) {
  const live = liveState?.videoId === videoId ? liveState : null;
  const stored = storedState?.videoId === videoId ? storedState : null;
  if (!live) return stored;
  if (!stored) return live;
  return (live.updatedAt || 0) >= (stored.updatedAt || 0) ? live : stored;
}
