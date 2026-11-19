export function videoIdFromUrl(url = location.href) {
  try {
    const parsed = new URL(url);
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(parsed.hostname)) return null;
    if (parsed.hostname.endsWith('youtu.be')) return parsed.pathname.slice(1).match(/^[\w-]{11}$/)?.[0] ?? null;
    return parsed.searchParams.get('v')?.match(/^[\w-]{11}$/)?.[0] ?? null;
  } catch { return null; }
}

export function normalizeChannelId(value) {
  const channelPath = String(value || '').trim().replace(/^https?:\/\/(?:www\.)?youtube\.com\//i, '').replace(/^\//, '');
  if (/^@[^/?#]+$/.test(channelPath)) return channelPath;
  if (/^channel\/[^/?#]+$/.test(channelPath)) return channelPath;
  return '';
}

export function currentChannelId() {
  const link = document.querySelector('ytd-video-owner-renderer a[href*="/channel/"], ytd-video-owner-renderer a[href*="/@"]');
  return normalizeChannelId(link?.getAttribute('href'));
}
