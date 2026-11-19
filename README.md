# SkipTube

**YouTube, uninterrupted.**

SkipTube is a lightweight, privacy-conscious YouTube segment skipping extension powered by community-submitted SponsorBlock data. It is an independent project and is not affiliated with YouTube, Google, or SponsorBlock.

Created by Prince Kushwaha.

> Publication status: source code is publicly available in the [GitHub repository](https://github.com/p4prince2/SkipTube). The Chrome Web Store listing is pending. Live Chrome and Brave release-candidate tests and genuine product screenshots remain outstanding.

## Features

- Automatically skips enabled SponsorBlock segments and shows a brief notice.
- Supports Sponsor, Self-promotion, Interaction reminder, Intro, Outro, Preview/recap, Filler, and Non-music section categories.
- Displays category-colored segment markers on YouTube's progress bar.
- Stores preferences, whitelist entries, the response cache, skip totals, and local submission identity in browser extension storage.
- Supports per-category preferences, automatic skip control, optional skip confirmation, notification duration, channel/video whitelists, and optional local diagnostics.
- Lets the user mark timestamps, select a category, review, and explicitly confirm public SponsorBlock submissions.
- Handles YouTube single-page navigation and caches segment responses for 30 minutes (empty responses for 5 minutes).

SponsorBlock is community-driven. SkipTube cannot detect a segment that has not been submitted to SponsorBlock and does not invent timestamps.

## Browser support

The extension targets Chrome Manifest V3 and is intended for Chrome and Chromium-based Brave. The source has not yet passed live Chrome or Brave release-candidate testing. See the manual test checklist below before public distribution.

## Install from the public source

The source code is publicly available at [github.com/p4prince2/SkipTube](https://github.com/p4prince2/SkipTube). The Chrome Web Store listing has not been published yet.

1. Clone the repository with `git clone https://github.com/p4prince2/SkipTube.git`, or download its source archive.
2. Open the cloned/extracted project folder.
3. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
4. Enable **Developer mode**.
5. Choose **Load unpacked** and select the project directory containing `manifest.json`.
6. Open a YouTube video and pin SkipTube from the extensions menu.

After editing extension files, reload SkipTube on the extensions page. Existing pages may need a refresh to load updated extension code. Chrome Web Store installation will be available only after the listing is published.

## Configure

Use the popup to turn the extension on/off and toggle each category. Open **Settings** for auto-skip, confirmation, notification duration, whitelists, and optional developer diagnostics. Diagnostics write the current video ID and segment counts to the YouTube console; they are off by default.

To submit a segment, open Settings on a YouTube video, choose **Open submission controls on YouTube**, mark start and end, choose a category, and confirm the submission review. SkipTube never submits automatically. Accepted submissions are public contributions to SponsorBlock.

## Privacy and permissions

On first use, the popup explains that the current YouTube video ID and enabled categories are sent to SponsorBlock and waits for your affirmative consent before segment lookup begins.

The extension makes segment lookup requests to `https://sponsor.ajay.app` for the current video ID, selected categories, and requested action types. SponsorBlock receives those values and ordinary network metadata. On explicit submission, the request also includes timestamps, category, duration, a random local submission ID, and a SkipTube client identifier.

Preferences, whitelist entries, segment cache, aggregate skip totals, and submission identity remain in browser-local extension storage. Skip statistics are not sent to a SkipTube server (none exists) or SponsorBlock. The extension does not include analytics, ads, remote executable code, or third-party tracking scripts.

See the full [Privacy Policy](docs/privacy.html) and [permission/data-use notes](STORE_LISTING.md).

## Project structure

```text
manifest.json             MV3 permissions, worker, popup, options, content injection
background.js             submission ID setup, per-tab state, settings notifications
content.js                guarded module bootstrap
content-app.js             YouTube SPA, segment fetch, playback, markers, submission UI
api/sponsorblock.js        SponsorBlock reads, cache, and user-confirmed submissions
utils/                     settings, YouTube parsing, segment validation, lifecycle helpers
popup.*                    extension popup
options.*                  settings page
tests/                     Node.js unit tests
scripts/                   source checks, ZIP packaging and ZIP validation
docs/                      static GitHub Pages site and privacy policy
icons/                     original SkipTube PNG icons
```

## Development and validation

Requires Node.js 20 or later. There are no runtime or development dependencies.

```sh
npm test
npm run check
npm run package
npm run check:package
```

`npm run package` creates `dist/SkipTube-<manifest-version>.zip`. The independent package validator checks that `manifest.json` is at the ZIP root, required runtime files and module imports are present, file checksums match, and test/development files are excluded.

## Manual release-candidate testing

Run these checks in current Chrome and Brave builds:

1. Install the unpacked extension and confirm the popup, options, and icons load.
2. Open a video with known SponsorBlock segments; verify each enabled category, marker placement, and skipping.
3. Confirm videos with no community segments continue playing normally.
4. Toggle categories, master enable, automatic skipping, confirmation, and both whitelists while a video is open.
5. Navigate between videos in YouTube and with Back/Forward; confirm data follows the current video.
6. Close/reopen the popup repeatedly and wait for the Manifest V3 service worker to become idle; confirm existing-tab playback continues and popup status resynchronizes.
7. Test network offline, API 404, rate limit, and malformed response handling.
8. Test manual submission validation. Do not send a real public test submission unless you intend to contribute it.
9. Inspect Developer Tools for MV3/content script errors and verify no unexpected network requests.
10. Capture genuine product screenshots after QA for the store listing and website.

## Documentation and release files

- [Contribution guide](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security reporting](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [v1.0.0 release notes](RELEASE_NOTES_v1.0.0.md)
- [Installation from release ZIP](INSTALLATION.md)
- [GitHub setup metadata](GITHUB_SETUP.md)
- [Third-party code and asset review](THIRD_PARTY_NOTICES.md)
- [v1.0.0 QA record](RELEASE_QA_v1.0.0.md)
- [Release versioning](RELEASE_PROCESS.md)
- [Chrome Web Store listing and submission checklist](STORE_LISTING.md)
- [GitHub Pages instructions](PAGES_DEPLOYMENT.md)

## License

The project source is prepared under the MIT License. Review the copyright holder and contributor agreement before publishing; see [LICENSE](LICENSE).
