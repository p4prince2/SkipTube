export function normalizeSegments(input, { videoDuration = 0 } = {}) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input.map(item => {
    const start = Number(item?.segment?.[0]);
    const actionType = item?.actionType || 'skip';
    const fullVideo = actionType === 'full' && start === 0 && Number(item?.segment?.[1]) === 0;
    const duration = Number(item?.videoDuration) > 0 ? Number(item.videoDuration) : videoDuration;
    return {
      start, end: fullVideo ? (Number.isFinite(duration) && duration > 0 ? duration : null) : Number(item?.segment?.[1]),
      ...(fullVideo ? { fullVideo: true } : {}),
      category: String(item?.category || ''), uuid: String(item?.UUID || ''), actionType
    };
  }).filter(item => Number.isFinite(item.start) && item.start >= 0 && (item.fullVideo ? item.start === 0 && (item.end === null || (Number.isFinite(item.end) && item.end > 0)) : Number.isFinite(item.end) && item.end > item.start) && ['skip', 'full'].includes(item.actionType) && ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'filler', 'music_offtopic'].includes(item.category))
    .filter(item => { const key = `${item.start}:${item.end}:${item.category}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a, b) => a.start - b.start);
}

export function resolveFullVideoSegments(segments, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return segments;
  return segments.map(segment => segment.fullVideo && (!Number.isFinite(segment.end) || segment.end <= 0)
    ? { ...segment, end: duration }
    : segment);
}

export function filterSegmentsByCategories(segments, enabledCategories) {
  const enabled = new Set(enabledCategories);
  const filtered = segments.filter(segment => enabled.has(segment.category));
  const receivedByCategory = Object.create(null);
  const retainedByCategory = Object.create(null);
  for (const segment of segments) receivedByCategory[segment.category] = (receivedByCategory[segment.category] || 0) + 1;
  for (const segment of filtered) retainedByCategory[segment.category] = (retainedByCategory[segment.category] || 0) + 1;
  return {
    segments: filtered,
    diagnostics: {
      receivedCount: segments.length,
      receivedByCategory,
      selfpromoReceived: receivedByCategory.selfpromo || 0,
      selfpromoFilteredOut: (receivedByCategory.selfpromo || 0) - (retainedByCategory.selfpromo || 0)
    }
  };
}

export function formatTime(seconds) {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function isWhitelisted({ videoId, channelId = '', whitelistVideos = [], whitelistChannels = [] }) {
  const normalizeVideo = value => String(value).trim();
  const normalizeChannel = value => {
    const channel = String(value).trim().replace(/^https?:\/\/(?:www\.)?youtube\.com\//i, '').replace(/^\//, '');
    if (channel.startsWith('@')) return `handle:${channel.slice(1).toLowerCase()}`;
    if (channel.startsWith('channel/')) return `id:${channel.slice(8)}`;
    return '';
  };
  return whitelistVideos.some(value => normalizeVideo(value) === videoId) ||
    (normalizeChannel(channelId) !== '' && whitelistChannels.some(value => normalizeChannel(value) === normalizeChannel(channelId)));
}

export function shouldSkipAtTime(segments, currentTime, skippedKeys = new Set(), tolerance = 0.12, enabledCategories = null) {
  return segments.find(item => item.start <= currentTime + tolerance && item.end > currentTime && (!enabledCategories || enabledCategories[item.category]) && !skippedKeys.has(item.uuid || `${item.start}-${item.end}`)) || null;
}
