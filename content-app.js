import { getSettings } from './utils/storage.js';
import { videoIdFromUrl, currentChannelId } from './utils/youtube.js';
import { getSegments } from './api/sponsorblock.js';
import { filterSegmentsByCategories, formatTime, isWhitelisted, resolveFullVideoSegments, shouldSkipAtTime } from './utils/segments.js';
import { mayRequestSegments, settingsFingerprint, shouldReloadVideo, stateForVideo } from './utils/lifecycle.js';


let videoId = null, segments = [], video = null, markerObserver = null, routeTimer = 0, inFlight = false, loadGeneration = 0, loadedSettingsKey = null, engineState = 'loading', currentSettings = null;
let markedStart = null, submitPanel = null;
const skipped = new Set();
const skippedByCategory = Object.create(null);
const title = category => ({ sponsor: 'Sponsor', selfpromo: 'Self-promotion', interaction: 'Interaction reminder', intro: 'Intro', outro: 'Outro', preview: 'Preview / recap', filler: 'Filler', music_offtopic: 'Non-music section' }[category] || category);

function debugLog(event, details = {}) {
  if (!currentSettings?.debugMode) return;
  console.info('[SkipTube debug]', { event, videoId, selfpromoSkipped: skippedByCategory.selfpromo || 0, skippedByCategory: { ...skippedByCategory }, ...details });
}

function recordSkippedSegment(segment, settings, savedSeconds) {
  skippedByCategory[segment.category] = (skippedByCategory[segment.category] || 0) + 1;
  debugLog('segment-skipped', { category: segment.category, skippedCountForCategory: skippedByCategory[segment.category] });
  notify(`Skipped ${title(segment.category)} · ${Math.round(savedSeconds)}s`, settings.notificationDuration);
}

function notify(text, duration) {
  let node = document.getElementById('skiptube-toast');
  if (!node) { node = document.createElement('div'); node.id = 'skiptube-toast'; node.setAttribute('role', 'status'); document.body.append(node); }
  node.textContent = text; node.classList.add('visible');
  clearTimeout(notify.timer); notify.timer = setTimeout(() => node.classList.remove('visible'), duration);
}

function renderMarkers() {
  const container = document.querySelector('.ytp-progress-bar');
  if (!container) return;
  container.querySelectorAll('.skiptube-marker').forEach(node => node.remove());
  const duration = video?.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  for (const segment of segments) {
    const marker = document.createElement('div'); marker.className = 'skiptube-marker';
    marker.style.left = `${segment.start / duration * 100}%`; marker.style.width = `${Math.max(.2, (segment.end - segment.start) / duration * 100)}%`;
    marker.style.background = ({ sponsor: '#ff4d6d', selfpromo: '#ff8c42', interaction: '#ffd166', intro: '#06d6a0', outro: '#118ab2', preview: '#8b7bff', filler: '#c77dff', music_offtopic: '#74c0fc' })[segment.category] || '#aaa';
    marker.title = `${title(segment.category)} · ${formatTime(segment.start)}–${formatTime(segment.end)}`; container.append(marker);
  }
}

async function loadVideo(force = false) {
  const nextId = videoIdFromUrl();
  const nextVideo = document.querySelector('video.html5-main-video');
  if (!force && nextId === videoId && nextVideo === video) return;
  const settings = await getSettings();
  currentSettings = settings;
  const nextSettingsKey = settingsFingerprint(settings);
  if (!shouldReloadVideo({ currentVideoId: videoId, nextVideoId: nextId, currentVideo: video, nextVideo, currentSettingsKey: loadedSettingsKey, nextSettingsKey })) return;
  const generation = ++loadGeneration;
  videoId = nextId; segments = []; skipped.clear(); video = nextVideo; loadedSettingsKey = nextSettingsKey; engineState = 'loading';
  if (markerObserver) markerObserver.disconnect();
  const markerContainer = document.querySelector('.ytp-progress-bar');
  markerContainer?.querySelectorAll('.skiptube-marker').forEach(node => node.remove());
  if (!videoId || !video) { engineState = 'not-youtube-video'; chrome.runtime.sendMessage({ type: 'SKIPTUBE_STATE', state: 'not-youtube-video' }).catch(() => {}); return; }
  if (!settings.dataConsent) { engineState = 'consent-required'; chrome.runtime.sendMessage({ type: 'SKIPTUBE_STATE', state: engineState, videoId }).catch(() => {}); return; }
  chrome.runtime.sendMessage({ type: 'SKIPTUBE_STATE', state: 'loading', videoId }).catch(() => {});
  if (generation !== loadGeneration) return;
  const whitelisted = isWhitelisted({ videoId, channelId: currentChannelId(), whitelistVideos: settings.whitelistVideos, whitelistChannels: settings.whitelistChannels });
  if (whitelisted || !mayRequestSegments(settings)) { engineState = whitelisted ? 'whitelisted' : 'disabled'; chrome.runtime.sendMessage({ type: 'SKIPTUBE_STATE', state: engineState, videoId }).catch(() => {}); return; }
  try {
    const enabledCategories = Object.keys(settings.categories).filter(key => settings.categories[key]);
    debugLog('segments-request', { requestedCategories: enabledCategories });
    if (!enabledCategories.length) { engineState = 'ready'; chrome.runtime.sendMessage({ type: 'SKIPTUBE_STATE', state: 'ready', videoId, count: 0 }).catch(() => {}); renderMarkers(); return; }
    const requestedVideoId = videoId;
    segments = await getSegments(videoId, enabledCategories, { videoDuration: video.duration,
      onDiagnostics: ({ source, requestedCategories, segments: received }) => {
        const receivedByCategory = Object.create(null);
        for (const segment of received) receivedByCategory[segment.category] = (receivedByCategory[segment.category] || 0) + 1;
        debugLog('segments-response', {
          videoId: requestedVideoId, source, requestedCategories,
          returnedCount: received.length, returnedByCategory: receivedByCategory,
          selfpromoReceived: receivedByCategory.selfpromo || 0
        });
      }
    });
    if (generation !== loadGeneration) return;
    const currentEnabledCategories = Object.keys(currentSettings?.categories || {}).filter(key => currentSettings.categories[key]);
    const filterResult = filterSegmentsByCategories(segments, currentEnabledCategories);
    segments = resolveFullVideoSegments(filterResult.segments, video?.duration);
    debugLog('segments-filter', { videoId: requestedVideoId, receivedCount: filterResult.diagnostics.receivedCount, receivedByCategory: filterResult.diagnostics.receivedByCategory, selfpromoReceived: filterResult.diagnostics.selfpromoReceived, selfpromoFilteredOut: filterResult.diagnostics.selfpromoFilteredOut });
    engineState = 'ready';
    chrome.runtime.sendMessage({ type: 'SKIPTUBE_STATE', state: 'ready', videoId, count: segments.length }).catch(() => {});
    renderMarkers();
    if (markerObserver) markerObserver.disconnect();
    markerObserver = new MutationObserver(() => {
      if (!document.querySelector('.ytp-progress-bar')) return;
      markerObserver.disconnect(); renderMarkers();
    });
    const player = document.querySelector('.html5-video-player');
    if (player) markerObserver.observe(player, { childList: true, subtree: true });
  } catch (error) {
    if (generation !== loadGeneration) return;
    engineState = 'error';
    chrome.runtime.sendMessage({ type: 'SKIPTUBE_STATE', state: 'error', videoId, error: error.message }).catch(() => {});
  }
}

function requestCurrentState() {
  const activeId = videoIdFromUrl();
  const snapshot = stateForVideo(activeId, engineState, segments);
  if (activeId !== videoId || document.querySelector('video.html5-main-video') !== video) loadVideo();
  chrome.runtime.sendMessage({ type: 'SKIPTUBE_STATE', ...snapshot }).catch(() => {});
}

async function checkPlayback() {
  if (!video || inFlight || video.paused || video.seeking) return;
  const activeVideo = video, activeId = videoId;
  const settings = currentSettings;
  if (!settings) return;
  if (activeVideo !== video || activeId !== videoId || activeVideo.paused || activeVideo.seeking) return;
  if (!settings.enabled || !settings.autoSkip) return;
  const channel = currentChannelId();
  if (isWhitelisted({ videoId, channelId: channel, whitelistVideos: settings.whitelistVideos, whitelistChannels: settings.whitelistChannels })) return;
  const currentVideoId = videoId;
  const segment = shouldSkipAtTime(segments, video.currentTime, skipped, .12, settings.categories);
  if (!segment) return;
  if (settings.manualConfirmation) {
    const key = segment.uuid || `${segment.start}-${segment.end}`; skipped.add(key);
    const proceed = window.confirm(`Skip ${title(segment.category)} segment (${formatTime(segment.start)}–${formatTime(segment.end)})?`);
    if (proceed) {
      if (activeVideo !== video || activeId !== videoId) { skipped.delete(key); return; }
      const saved = Math.max(0, segment.end - activeVideo.currentTime);
      try {
        activeVideo.currentTime = Math.min(segment.end + .05, Number.isFinite(activeVideo.duration) ? activeVideo.duration : segment.end + .05);
        const latest = await chrome.storage.local.get(['skippedCount', 'savedSeconds']);
        await chrome.storage.local.set({ skippedCount: (latest.skippedCount || 0) + 1, savedSeconds: (latest.savedSeconds || 0) + saved });
        recordSkippedSegment(segment, settings, saved);
      } catch (error) { console.warn('SkipTube could not complete the confirmed skip:', error); skipped.delete(key); }
    }
    return;
  }
  inFlight = true; const key = segment.uuid || `${segment.start}-${segment.end}`; skipped.add(key);
  const saved = Math.max(0, segment.end - activeVideo.currentTime);
  try {
    if (activeVideo !== video || currentVideoId !== videoId) { skipped.delete(key); return; }
    activeVideo.currentTime = Math.min(segment.end + .05, Number.isFinite(activeVideo.duration) ? activeVideo.duration : segment.end + .05);
    const latest = await chrome.storage.local.get(['skippedCount', 'savedSeconds']);
    await chrome.storage.local.set({ skippedCount: (latest.skippedCount || 0) + 1, savedSeconds: (latest.savedSeconds || 0) + saved });
    recordSkippedSegment(segment, settings, saved);
  } catch (error) { console.warn('SkipTube could not complete the skip:', error); skipped.delete(key); }
  finally { setTimeout(() => { inFlight = false; }, 450); }
}

function installSubmissionPanel() {
  if (submitPanel) return;
  submitPanel = document.createElement('section'); submitPanel.id = 'skiptube-submit';
  submitPanel.innerHTML = `<strong>SkipTube · Segment submission</strong><div class="skiptube-submit-row"><button data-action="start">Mark start</button><button data-action="end">Mark end</button><span class="skiptube-range">Not marked</span></div><div class="skiptube-submit-row"><select aria-label="Segment category">${Object.entries({ sponsor: 'Sponsor', selfpromo: 'Self-promotion', interaction: 'Interaction reminder', intro: 'Intro', outro: 'Outro', preview: 'Preview / recap', filler: 'Filler', music_offtopic: 'Non-music section' }).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select><button data-action="submit">Review & submit</button><button data-action="close" aria-label="Close">×</button></div><small class="skiptube-submit-status">Submission requires your confirmation.</small>`;
  document.body.append(submitPanel);
  submitPanel.addEventListener('click', async event => {
    const action = event.target.dataset.action; if (!action || !video) return;
    const range = submitPanel.querySelector('.skiptube-range'), status = submitPanel.querySelector('.skiptube-submit-status');
    if (action === 'start') { markedStart = video.currentTime; range.textContent = `${formatTime(markedStart)} → …`; }
    if (action === 'end') { submitPanel.dataset.end = String(video.currentTime); range.textContent = markedStart == null ? `Start not marked → ${formatTime(video.currentTime)}` : `${formatTime(markedStart)} → ${formatTime(video.currentTime)}`; }
    if (action === 'close') { submitPanel.remove(); submitPanel = null; }
    if (action === 'submit') {
      const end = Number(submitPanel.dataset.end), category = submitPanel.querySelector('select').value;
      if (markedStart == null || !Number.isFinite(markedStart) || markedStart < 0 || !Number.isFinite(end) || end <= markedStart || !Number.isFinite(video.duration) || end > video.duration) { status.textContent = 'Mark a valid start and end within this video first.'; return; }
      const summary = `${title(category)} · ${formatTime(markedStart)}–${formatTime(end)}`;
      if (!window.confirm(`Submit this segment to SponsorBlock?\n\n${summary}\n\nThis is a public community submission.`)) return;
      status.textContent = 'Submitting…';
      try {
        const { submitSegment } = await import('./api/sponsorblock.js');
        const { submissionUserId } = await chrome.storage.local.get('submissionUserId');
        if (!submissionUserId) throw new Error('Submission ID is not ready. Reload this page and try again.');
        const submittedVideoId = videoId;
        await submitSegment({ videoId: submittedVideoId, start: markedStart, end, category, videoDuration: video.duration, userId: submissionUserId });
        if (submittedVideoId !== videoId) throw new Error('The video changed during submission. Check SponsorBlock before retrying.');
        status.textContent = 'Segment submitted. Thank you!'; segments.push({ start: markedStart, end, category }); renderMarkers();
      } catch (error) { status.textContent = error.message; }
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SKIPTUBE_SUBMISSION_OPEN') installSubmissionPanel();
  if (message?.type === 'SKIPTUBE_SYNC_SETTINGS') loadVideo(true);
  if (message?.type === 'SKIPTUBE_GET_STATE') {
    sendResponse(stateForVideo(videoId, engineState, segments));
  }
});

document.addEventListener('yt-navigate-finish', () => { clearTimeout(routeTimer); routeTimer = setTimeout(loadVideo, 150); });
window.addEventListener('popstate', () => { clearTimeout(routeTimer); routeTimer = setTimeout(loadVideo, 250); });
document.addEventListener('timeupdate', checkPlayback, true);
document.addEventListener('durationchange', () => { segments = resolveFullVideoSegments(segments, video?.duration); renderMarkers(); }, true);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (currentSettings) {
    for (const [key, change] of Object.entries(changes)) {
      if (key === 'categories') currentSettings.categories = { ...currentSettings.categories, ...(change.newValue || {}) };
      else if (key in currentSettings) currentSettings[key] = change.newValue;
    }
  }
  if (Object.keys(changes).some(key => ['dataConsent', 'enabled', 'categories', 'whitelistVideos', 'whitelistChannels'].includes(key))) loadVideo(true);
});
const routeObserver = new MutationObserver(() => {
  if (videoIdFromUrl() !== videoId || document.querySelector('video.html5-main-video') !== video) {
    clearTimeout(routeTimer); routeTimer = setTimeout(loadVideo, 200);
  }
});
routeObserver.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('pageshow', requestCurrentState);
document.addEventListener('visibilitychange', () => { if (!document.hidden) requestCurrentState(); });
loadVideo();
