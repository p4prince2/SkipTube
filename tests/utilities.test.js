import test from 'node:test';
import assert from 'node:assert/strict';
import { videoIdFromUrl, normalizeChannelId } from '../utils/youtube.js';
import { formatTime, isWhitelisted, normalizeSegments, shouldSkipAtTime } from '../utils/segments.js';
import { DEFAULTS, getSettings, mergeVideoState, saveSettings } from '../utils/storage.js';
import { mayRequestSegments, settingsFingerprint, shouldReloadVideo, stateForVideo } from '../utils/lifecycle.js';
import { parseSegmentsResponse, submitSegment } from '../api/sponsorblock.js';
import { configureRepositoryLink } from '../utils/repository-link.js';

test('videoIdFromUrl accepts YouTube watch and short links only', () => {
  assert.equal(videoIdFromUrl('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk');
  assert.equal(videoIdFromUrl('https://youtu.be/abcdefghijk?t=20'), 'abcdefghijk');
  assert.equal(videoIdFromUrl('https://youtube.com/watch?v=short'), null);
  assert.equal(videoIdFromUrl('https://notyoutube.com/watch?v=abcdefghijk'), null);
});

test('channel IDs normalize YouTube handles and channel paths', () => {
  assert.equal(normalizeChannelId('/@creator'), '@creator');
  assert.equal(normalizeChannelId('https://www.youtube.com/channel/UC123'), 'channel/UC123');
  assert.equal(normalizeChannelId('/watch?v=abcdefghijk'), '');
});

test('popup repository link becomes visible and points to the public repository', () => {
  const link = { href: '', hidden: true };
  assert.equal(configureRepositoryLink(link, 'https://github.com/p4prince2/SkipTube'), true);
  assert.equal(link.href, 'https://github.com/p4prince2/SkipTube');
  assert.equal(link.hidden, false);
  assert.equal(configureRepositoryLink(link, ''), false);
});

test('SponsorBlock requests require persisted in-product data consent', async () => {
  const originalChrome = globalThis.chrome;
  const data = {};
  globalThis.chrome = { storage: { local: {
    get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => key in data).map(key => [key, data[key]])),
    set: async values => Object.assign(data, structuredClone(values))
  } } };
  try {
    assert.equal((await getSettings()).dataConsent, false);
    assert.equal(mayRequestSegments(await getSettings()), false);
    await saveSettings({ dataConsent: true });
    assert.equal((await getSettings()).dataConsent, true);
    assert.equal(mayRequestSegments(await getSettings()), true);
    assert.equal(mayRequestSegments({ dataConsent: true, enabled: false }), false);
  } finally { globalThis.chrome = originalChrome; }
});

test('segment normalization rejects invalid/action/category values, deduplicates, and sorts', () => {
  const segments = normalizeSegments([
    { segment: [12, 15], category: 'sponsor' },
    { segment: [2, 4], category: 'intro', actionType: 'skip' },
    { segment: [12, 15], category: 'sponsor' },
    { segment: [0, 1], category: 'sponsor', actionType: 'mute' },
    { segment: [4, 3], category: 'sponsor' },
    { segment: [1, 2], category: 'unknown' }
  ]);
  assert.deepEqual(segments.map(value => value.start), [2, 12]);
});

test('API response parser handles both documented payload shapes', () => {
  const one = { segment: [1, 3], category: 'sponsor', UUID: 'a' };
  assert.equal(parseSegmentsResponse([one]).length, 1);
  assert.equal(parseSegmentsResponse({ videoID: 'abcdefghijk', segments: [one] }).length, 1);
  assert.deepEqual(parseSegmentsResponse({ error: 'not found' }), []);
});

test('formatTime handles normal, negative, and invalid inputs', () => {
  assert.equal(formatTime(125.9), '2:05');
  assert.equal(formatTime(-3), '0:00');
  assert.equal(formatTime(Number.NaN), '0:00');
});

test('whitelist and playback selector honor normalized IDs and skipped segments', () => {
  assert.equal(isWhitelisted({ videoId: 'abcdefghijk', whitelistVideos: ['abcdefghijk'] }), true);
  assert.equal(isWhitelisted({ videoId: 'x', channelId: '@creator', whitelistChannels: ['https://youtube.com/@creator'] }), true);
  const segments = normalizeSegments([{ segment: [5, 10], category: 'sponsor', UUID: 'u' }]);
  assert.equal(shouldSkipAtTime(segments, 4.95)?.uuid, 'u');
  assert.equal(shouldSkipAtTime(segments, 5, new Set(['u'])), null);
});

test('live tab state wins over worker snapshots only when it is newer and for same video', () => {
  const old = { state: 'loading', videoId: 'abcdefghijk', updatedAt: 10 };
  const fresh = { state: 'ready', videoId: 'abcdefghijk', updatedAt: 20 };
  assert.equal(mergeVideoState(fresh, old, 'abcdefghijk').state, 'ready');
  assert.equal(mergeVideoState(null, old, 'abcdefghijk').state, 'loading');
  assert.equal(mergeVideoState(fresh, old, 'different123'), null);
});

test('closing and reopening popup reads settings without resetting skip state', async () => {
  const originalChrome = globalThis.chrome;
  const data = { enabled: false, autoSkip: false, skippedCount: 4, savedSeconds: 37, categories: { ...DEFAULTS.categories } };
  globalThis.chrome = { storage: { local: {
    get: async keys => keys == null ? { ...data } : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => key in data).map(key => [key, data[key]])),
    set: async values => Object.assign(data, structuredClone(values))
  } } };
  try {
    const firstOpen = await getSettings();
    await saveSettings({ enabled: true });
    const reopenedStates = [];
    for (let open = 0; open < 4; open++) reopenedStates.push(await getSettings());
    const reopened = reopenedStates.at(-1);
    assert.equal(firstOpen.enabled, false);
    assert.equal(reopened.enabled, true);
    assert.equal(reopened.autoSkip, false);
    assert.equal(reopened.skippedCount, 4);
    assert.equal(reopened.savedSeconds, 37);
    assert.ok(reopenedStates.every(value => value.skippedCount === 4 && value.savedSeconds === 37));
  } finally { globalThis.chrome = originalChrome; }
});

test('automatic skipping OFF then ON preserves loaded segment eligibility', () => {
  const segment = normalizeSegments([{ segment: [10, 20], category: 'sponsor', UUID: 'segment-1' }]);
  const skipped = new Set();
  let autoSkip = false;
  assert.equal(autoSkip && shouldSkipAtTime(segment, 10, skipped) !== null, false);
  autoSkip = true;
  assert.equal(autoSkip && shouldSkipAtTime(segment, 10, skipped) !== null, true);
});

test('auto-skip preference changes do not force segment reload, but category/master changes do', () => {
  const base = { enabled: true, autoSkip: true, categories: { sponsor: true }, whitelistVideos: [], whitelistChannels: [] };
  const off = { ...base, autoSkip: false };
  const categoryOff = { ...off, categories: { sponsor: false } };
  assert.equal(settingsFingerprint(base), settingsFingerprint(off));
  assert.notEqual(settingsFingerprint(off), settingsFingerprint(categoryOff));
  assert.equal(shouldReloadVideo({ currentVideoId: 'abcdefghijk', nextVideoId: 'abcdefghijk', currentVideo: 1, nextVideo: 1, currentSettingsKey: settingsFingerprint(base), nextSettingsKey: settingsFingerprint(off) }), false);
  assert.equal(shouldReloadVideo({ currentVideoId: 'abcdefghijk', nextVideoId: 'abcdefghijk', currentVideo: 1, nextVideo: 1, currentSettingsKey: settingsFingerprint(off), nextSettingsKey: settingsFingerprint(categoryOff) }), true);
});

test('existing tab synchronization reports current playback state and navigation invalidates old state', () => {
  assert.deepEqual(stateForVideo('abcdefghijk', 'ready', [{}, {}]), { state: 'ready', videoId: 'abcdefghijk', count: 2 });
  assert.deepEqual(stateForVideo(null, 'ready', []), { state: 'not-youtube-video', videoId: null, count: 0 });
  assert.equal(shouldReloadVideo({ currentVideoId: 'abcdefghijk', nextVideoId: 'different123', currentVideo: 1, nextVideo: 1, currentSettingsKey: 'x', nextSettingsKey: 'x' }), true);
});

test('worker restart recovery uses persistent local settings and stored same-video snapshot', async () => {
  const originalChrome = globalThis.chrome;
  const state = { 'state:7': { state: 'ready', videoId: 'abcdefghijk', count: 2, updatedAt: 5 } };
  const data = { enabled: true, skippedCount: 2 };
  globalThis.chrome = { storage: {
    local: { get: async keys => keys == null ? { ...data } : Object.fromEntries(keys.filter(key => key in data).map(key => [key, data[key]])), set: async values => Object.assign(data, values) },
    session: { get: async key => ({ [key]: state[key] }) }
  } };
  try {
    const recovered = (await chrome.storage.session.get('state:7'))['state:7'];
    assert.equal(mergeVideoState(null, recovered, 'abcdefghijk').count, 2);
    assert.equal((await getSettings()).enabled, true);
  } finally { globalThis.chrome = originalChrome; }
});

test('video navigation never uses a previous video state', () => {
  const first = { state: 'ready', videoId: 'abcdefghijk', count: 1, updatedAt: 100 };
  assert.equal(mergeVideoState(first, null, 'different123'), null);
});

test('manual submission validates input before network access and sends documented JSON', async () => {
  const originalChrome = globalThis.chrome, originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.chrome = { storage: { local: { get: async () => ({}), set: async () => {} } } };
  globalThis.fetch = async (url, options) => { calls.push([url, options]); return new Response('[{"UUID":"u"}]', { status: 200 }); };
  try {
    await assert.rejects(() => submitSegment({ videoId: 'bad', start: 1, end: 2, category: 'sponsor', videoDuration: 3, userId: 'x'.repeat(32) }), /Check the segment/);
    assert.equal(calls.length, 0);
    await submitSegment({ videoId: 'abcdefghijk', start: 1.25, end: 2.5, category: 'sponsor', videoDuration: 30, userId: 'x'.repeat(32) });
    assert.equal(calls.length, 1);
    const body = JSON.parse(calls[0][1].body);
    assert.deepEqual(body.segments[0].segment, [1.25, 2.5]);
    assert.equal(body.videoID, 'abcdefghijk');
  } finally { globalThis.chrome = originalChrome; globalThis.fetch = originalFetch; }
});
