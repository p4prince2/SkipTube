chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  if (!current.submissionUserId) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const userID = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    await chrome.storage.local.set({ submissionUserId: userID });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SKIPTUBE_STATE' && sender.tab?.id != null) {
    const state = { ...message, tabId: sender.tab.id, updatedAt: Date.now() };
    chrome.storage.session.set({ [`state:${sender.tab.id}`]: state }).catch(() => {});
    return;
  }
  if (message?.type === 'SKIPTUBE_GET_STATE' && sender.tab?.id != null) {
    chrome.storage.session.get(`state:${sender.tab.id}`).then(result => {
      const state = result[`state:${sender.tab.id}`];
      sendResponse(state?.videoId === message.videoId ? state : null);
    }).catch(() => sendResponse(null));
    return true;
  }
  if (message?.type === 'SKIPTUBE_SETTINGS_CHANGED') {
    // Broadcast is best-effort; content scripts also observe storage.onChanged,
    // so they recover when the worker is asleep or a tab is temporarily unavailable.
    chrome.tabs.query({ url: ['https://www.youtube.com/*', 'https://youtube.com/*'] }).then(tabs => {
      for (const tab of tabs) if (tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'SKIPTUBE_SYNC_SETTINGS' }).catch(() => {});
    }).catch(() => {});
    return;
  }
  if (message?.type === 'SKIPTUBE_STATS') {
    chrome.storage.local.get(['skippedCount', 'savedSeconds']).then(data => sendResponse(data));
    return true;
  }
});

chrome.tabs.onRemoved.addListener(tabId => { chrome.storage.session.remove(`state:${tabId}`).catch(() => {}); });
