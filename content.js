if (!globalThis.__SKIPTUBE_BOOTSTRAPPED__) {
  globalThis.__SKIPTUBE_BOOTSTRAPPED__ = true;
  import(chrome.runtime.getURL('content-app.js')).catch(error => {
    globalThis.__SKIPTUBE_BOOTSTRAPPED__ = false;
    console.error('SkipTube failed to start:', error);
  });
}
