# GitHub Pages deployment

The public source repository is available at <https://github.com/p4prince2/SkipTube>. The initial source commit is published on `main`. GitHub Pages has **not** been enabled; the public website URL remains pending until deployment is completed and verified.

## Enable Pages after approval

1. In the repository, open **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Choose `main` and `/docs`, then save. This publishes the website; do this only after owner approval.
4. Wait for the deployment to finish and use the URL GitHub displays. Do not represent an assumed URL as live.
5. Check the homepage and `privacy.html` over HTTPS, including relative stylesheet, script, and favicon paths.
6. Confirm the GitHub source and issue links resolve correctly and that store installation remains unavailable until the Chrome Web Store listing is published.
7. After deployment, use the verified Pages URL for the repository website and store homepage/privacy-policy fields.

The repository URL is already configured in `docs/site-config.js` and the extension popup. `chromeWebStoreUrl` remains empty until the store listing is published. No backend, build tool, custom domain, or external font/CDN is needed. GitHub Pages can publish from `/docs`; see [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Free hosting for a public repository has no recurring infrastructure charge. GitHub may process ordinary website request metadata under its own privacy practices.
