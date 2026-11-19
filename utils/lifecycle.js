export function settingsFingerprint(settings) {
  return JSON.stringify({
    enabled: Boolean(settings?.enabled),
    categories: Object.entries(settings?.categories || {}).filter(([, enabled]) => Boolean(enabled)).map(([name]) => name).sort(),
    whitelistVideos: [...(settings?.whitelistVideos || [])].map(String).sort(),
    whitelistChannels: [...(settings?.whitelistChannels || [])].map(String).sort()
  });
}

export function mayRequestSegments(settings) {
  return Boolean(settings?.dataConsent && settings?.enabled);
}

export function shouldReloadVideo({ currentVideoId, nextVideoId, currentVideo, nextVideo, currentSettingsKey, nextSettingsKey }) {
  return currentVideoId !== nextVideoId || currentVideo !== nextVideo || currentSettingsKey !== nextSettingsKey;
}

export function stateForVideo(videoId, state, segments) {
  if (!videoId) return { state: 'not-youtube-video', videoId: null, count: 0 };
  return { state: state || 'loading', videoId, count: segments?.length || 0 };
}
