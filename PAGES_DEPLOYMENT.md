# GitHub repository and Pages deployment

No repository or Pages URL is configured in this workspace. Do not use placeholders as live links. After the owner creates the repository:

## Create and publish the repository

1. Create a new **public** GitHub repository named **SkipTube** under the chosen owner/account. Use the description and topic list in [GITHUB_SETUP.md](GITHUB_SETUP.md). Do not generate a second README, license, or `.gitignore`; those are already prepared locally.
2. Review the license/copyright holder and confirm contributor rights.
3. Add the actual repository URL as `origin`, choose the default branch (normally `main`), and push the approved local source. This workspace has no commits yet; stage and commit locally before pushing.
4. Configure GitHub private vulnerability reporting or document another private security contact. The public launch checklist remains blocked until a reporting route exists.
5. In `docs/site-config.js`, set `repositoryUrl` to the real public repository URL. Keep `chromeWebStoreUrl` empty until the listing is published; then set its real URL.
6. In popup.js set the same real repository URL so the extension popup GitHub link appears. It is intentionally hidden until then.

## Enable free GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Choose the default branch and `/docs`, then save.
4. Wait for the Pages deployment workflow to finish. Use the site URL GitHub displays; project URLs follow `https://<owner>.github.io/<repository>/` and account sites use `https://<owner>.github.io/`.
5. Confirm `https://` works for the homepage, relative stylesheet/script/icon paths, and `privacy.html`.
6. Configure the published Pages URL as the Chrome Web Store homepage and privacy policy URL after verifying it.

The static site uses no backend, build tool, custom domain, or external font/CDN. GitHub Pages supports branch-and-folder publishing from `/docs`; see [GitHub's official publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). GitHub's free plan includes Pages for public repositories. Hosting has no recurring infrastructure charge under this plan; GitHub may log ordinary website request metadata under its own privacy practices.
