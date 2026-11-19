import { normalizeSegments } from '../utils/segments.js';

const API = 'https://sponsor.ajay.app/api';
const CACHE_TTL = 30 * 60 * 1000;
const EMPTY_CACHE_TTL = 5 * 60 * 1000;

export function parseSegmentsResponse(input, options) {
  // The direct videoID endpoint returns an array; the privacy-preserving
  // hash-prefix endpoint wraps the same data in { videoID, segments }.
  const rows = Array.isArray(input) ? input : Array.isArray(input?.segments) ? input.segments : [];
  return normalizeSegments(rows, options);
}

export async function getSegments(videoId, categories, { onDiagnostics, videoDuration } = {}) {
  if (!/^[\w-]{11}$/.test(videoId)) throw new Error('Invalid YouTube video ID');
  const key = `segments:${videoId}:${[...categories].sort().join(',')}`;
  const cached = await chrome.storage.local.get(key);
  if (cached[key]?.expires > Date.now()) {
    onDiagnostics?.({ source: 'cache', videoId, requestedCategories: [...categories], segments: cached[key].segments });
    return cached[key].segments;
  }
  const url = new URL(`${API}/skipSegments`);
  url.searchParams.set('videoID', videoId);
  url.searchParams.set('categories', JSON.stringify(categories));
  url.searchParams.set('actionTypes', JSON.stringify(['skip', 'full']));
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (response.status === 404) {
    await chrome.storage.local.set({ [key]: { segments: [], expires: Date.now() + EMPTY_CACHE_TTL } });
    onDiagnostics?.({ source: 'network', videoId, requestedCategories: [...categories], segments: [] });
    return [];
  }
  if (response.status === 429) throw new Error('SponsorBlock rate limit reached. Try again later.');
  if (!response.ok) throw new Error(`SponsorBlock request failed (${response.status})`);
  const segments = parseSegmentsResponse(await response.json(), { videoDuration });
  await chrome.storage.local.set({ [key]: { segments, expires: Date.now() + CACHE_TTL } });
  onDiagnostics?.({ source: 'network', videoId, requestedCategories: [...categories], segments });
  return segments;
}

export async function submitSegment({ videoId, start, end, category, videoDuration, userId }) {
  const allowedCategories = new Set(['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'filler', 'music_offtopic']);
  if (!/^[\w-]{11}$/.test(videoId) || !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(videoDuration) || videoDuration <= 0 || start < 0 || end <= start || end > videoDuration || !allowedCategories.has(category) || typeof userId !== 'string' || userId.length < 32) throw new Error('Check the segment details and video.');
  const response = await fetch(`${API}/skipSegments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoID: videoId, userID: userId, userAgent: 'SkipTube/1.0.0', videoDuration, segments: [{ segment: [start, end], category, actionType: 'skip' }] })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(response.status === 409 ? 'This segment appears to be a duplicate.' : response.status === 429 ? 'Submission rate limit reached.' : `Submission rejected (${response.status}): ${body.slice(0, 180)}`);
  try { return body ? JSON.parse(body) : null; } catch { throw new Error('SponsorBlock returned an invalid submission response.'); }
}
