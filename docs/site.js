(() => {
  const repositoryUrl = window.SKIPTUBE_SITE?.repositoryUrl?.trim();
  const storeUrl = window.SKIPTUBE_SITE?.chromeWebStoreUrl?.trim();
  if (repositoryUrl && /^https:\/\/(www\.)?github\.com\//i.test(repositoryUrl)) {
    const normalizedRepositoryUrl = repositoryUrl.replace(/\/+$/, '');
    document.querySelectorAll('[data-repo-link]').forEach(link => {
      link.href = link.classList.contains('contribute-link') ? `${normalizedRepositoryUrl}/issues/new` : normalizedRepositoryUrl;
      link.hidden = false;
      link.rel = 'noreferrer';
    });
  }
  if (storeUrl && /^https:\/\/chromewebstore\.google\.com\//i.test(storeUrl)) {
    document.querySelectorAll('[data-store-link]').forEach(link => { link.href = storeUrl; link.hidden = false; link.rel = 'noreferrer'; });
  }
})();
