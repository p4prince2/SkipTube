import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, DEFAULTS } from '../utils/storage.js';
import { filterSegmentsByCategories, normalizeSegments, resolveFullVideoSegments, shouldSkipAtTime } from '../utils/segments.js';
import { getSegments, parseSegmentsResponse } from '../api/sponsorblock.js';
import { settingsFingerprint, shouldReloadVideo } from '../utils/lifecycle.js';

const VIDEO = 'abcdefghijk';
const responseSegments = [
  { segment: [14.2, 22.7], category: 'selfpromo', UUID: 'self-1', actionType: 'skip' },
  { segment: [35, 42], category: 'sponsor', UUID: 'sponsor-1', actionType: 'skip' }
];

test('Self-promotion setting maps to SponsorBlock selfpromo identifier', () => {
  assert.equal(CATEGORIES.selfpromo.label, 'Self-promotion');
  assert.equal(DEFAULTS.categories.selfpromo, true);
  assert.ok(Object.hasOwn(CATEGORIES, 'selfpromo'));
});

test('all eight UI category identifiers are the supported SponsorBlock category IDs', () => {
  assert.deepEqual(Object.keys(CATEGORIES), ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'filler', 'music_offtopic']);
  const rows = Object.keys(CATEGORIES).map(category => ({ segment: [1, 2], category, actionType: 'skip' }));
  assert.deepEqual(normalizeSegments(rows).map(segment => segment.category), Object.keys(CATEGORIES));
});

test('API response normalization retains selfpromo timestamps and category', () => {
  const segments = parseSegmentsResponse(responseSegments);
  assert.deepEqual(segments[0], { start: 14.2, end: 22.7, category: 'selfpromo', uuid: 'self-1', actionType: 'skip' });
});

test('selfpromo full-video labels with documented [0, 0] timestamps are normalized to whole-video intervals', () => {
  const apiLabel = [{ segment: [0, 0], category: 'selfpromo', UUID: 'full-selfpromo', actionType: 'full', videoDuration: 95 }];
  const fromApiDuration = normalizeSegments(apiLabel);
  assert.equal(fromApiDuration[0].start, 0);
  assert.equal(fromApiDuration[0].end, 95);
  assert.equal(fromApiDuration[0].fullVideo, true);
  assert.equal(shouldSkipAtTime(fromApiDuration, 1)?.category, 'selfpromo');

  const withoutDuration = normalizeSegments([{ ...apiLabel[0], videoDuration: 0 }]);
  assert.equal(withoutDuration[0].end, null);
  assert.equal(resolveFullVideoSegments(withoutDuration, 120)[0].end, 120);
});

test('category filtering keeps enabled selfpromo and reports disabled selfpromo as filtered', () => {
  const received = normalizeSegments(responseSegments);
  const enabled = filterSegmentsByCategories(received, ['selfpromo']);
  assert.equal(enabled.segments.length, 1);
  assert.equal(enabled.diagnostics.selfpromoReceived, 1);
  assert.equal(enabled.diagnostics.selfpromoFilteredOut, 0);
  const disabled = filterSegmentsByCategories(received, ['sponsor']);
  assert.equal(disabled.segments.some(segment => segment.category === 'selfpromo'), false);
  assert.equal(disabled.diagnostics.selfpromoFilteredOut, 1);
});

test('changing category preferences changes the active segment set and triggers refresh', () => {
  const all = { enabled: true, categories: { selfpromo: true, sponsor: true }, whitelistVideos: [], whitelistChannels: [] };
  const selfpromoOff = { ...all, categories: { selfpromo: false, sponsor: true } };
  assert.notEqual(settingsFingerprint(all), settingsFingerprint(selfpromoOff));
  assert.equal(shouldReloadVideo({ currentVideoId: VIDEO, nextVideoId: VIDEO, currentVideo: 1, nextVideo: 1, currentSettingsKey: settingsFingerprint(all), nextSettingsKey: settingsFingerprint(selfpromoOff) }), true);
});

test('playback selector skips an enabled selfpromo interval and honors disabled filtering', () => {
  const normalized = normalizeSegments(responseSegments);
  const enabled = filterSegmentsByCategories(normalized, ['selfpromo']).segments;
  assert.equal(shouldSkipAtTime(enabled, 14.15)?.category, 'selfpromo');
  assert.equal(shouldSkipAtTime(enabled, 22.7), null);
  const disabled = filterSegmentsByCategories(normalized, ['sponsor']).segments;
  assert.equal(shouldSkipAtTime(disabled, 16), null);
  assert.equal(shouldSkipAtTime(normalized, 16, new Set(), .12, { selfpromo: false, sponsor: true }), null);
});

test('API request sends selfpromo, returns raw category counts, and reuses only matching fresh cache', async () => {
  const originalChrome = globalThis.chrome, originalFetch = globalThis.fetch;
  const local = new Map(); const calls = []; const diagnostics = [];
  globalThis.chrome = { storage: { local: {
    get: async key => typeof key === 'string' ? (local.has(key) ? { [key]: local.get(key) } : {}) : {},
    set: async values => { for (const [key, value] of Object.entries(values)) local.set(key, value); }
  } } };
  globalThis.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response(JSON.stringify(responseSegments), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const first = await getSegments(VIDEO, ['sponsor', 'selfpromo'], { onDiagnostics: value => diagnostics.push(value) });
    const second = await getSegments(VIDEO, ['selfpromo', 'sponsor'], { onDiagnostics: value => diagnostics.push(value) });
    assert.equal(calls.length, 1);
    assert.deepEqual(JSON.parse(calls[0].url.searchParams.get('categories')), ['sponsor', 'selfpromo']);
    assert.deepEqual(JSON.parse(calls[0].url.searchParams.get('actionTypes')), ['skip', 'full']);
    assert.ok(first.some(segment => segment.category === 'selfpromo'));
    assert.ok(second.some(segment => segment.category === 'selfpromo'));
    assert.equal(diagnostics[0].source, 'network');
    assert.equal(diagnostics[0].segments.filter(segment => segment.category === 'selfpromo').length, 1);
    assert.equal(diagnostics[1].source, 'cache');

    await getSegments(VIDEO, ['sponsor']);
    assert.equal(calls.length, 2, 'different category set uses a separate cache entry/request');
  } finally { globalThis.chrome = originalChrome; globalThis.fetch = originalFetch; }
});

test('expired cache entry causes a fresh SponsorBlock request', async () => {
  const originalChrome = globalThis.chrome, originalFetch = globalThis.fetch;
  const key = `segments:${VIDEO}:selfpromo`;
  let calls = 0;
  globalThis.chrome = { storage: { local: {
    get: async requested => requested === key ? { [key]: { segments: [], expires: Date.now() - 1 } } : {},
    set: async () => {}
  } } };
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify(responseSegments.slice(0, 1)), { status: 200 }); };
  try {
    const segments = await getSegments(VIDEO, ['selfpromo']);
    assert.equal(calls, 1);
    assert.equal(segments[0].category, 'selfpromo');
  } finally { globalThis.chrome = originalChrome; globalThis.fetch = originalFetch; }
});
