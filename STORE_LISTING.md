# Chrome Web Store preparation

Status: prepared for review; not submitted. Confirm the final listing, screenshots, disclosures, and developer account before submission.

## Listing copy

**Title**
SkipTube — YouTube, uninterrupted

**Short description**
Skip submitted YouTube segments with community-powered controls for categories, markers, and privacy-conscious preferences.

**Detailed description**

SkipTube helps you move past YouTube video segments submitted by the SponsorBlock community. Enable automatic skipping for Sponsor, Self-promotion, Interaction reminder, Intro, Outro, Preview/recap, Filler, and Non-music sections.

See category-colored markers on the YouTube progress bar, choose your own category preferences, and whitelist channels or videos. SkipTube stores settings, segment cache, and skip totals in your browser profile.

You can mark a segment and submit it only after reviewing and confirming. Confirmed submissions are public contributions to SponsorBlock. SkipTube does not invent segment timestamps; videos without submitted segments remain unmodified.

SkipTube makes segment requests to SponsorBlock for the current video ID and enabled categories. Optional diagnostics are off by default. Read the linked Privacy Policy for data and permission details.

On first use, SkipTube explains this data flow in its popup and waits for the user to select “Agree and continue” before requesting segment data.

SkipTube is an independent project. It is not affiliated with YouTube, Google, or SponsorBlock. YouTube is a trademark of Google LLC.

## Listing metadata

- **Recommended category:** Productivity. This matches the user-facing workflow utility; confirm the choices shown in the Developer Dashboard at submission time.
- **Language:** English (United States) for the initial listing; do not imply localization.
- **Store icon:** `icons/icon128.png` (128 × 128 PNG already present).
- **Screenshots:** required. Capture 1–5 genuine 1280 × 800 screenshots from the reviewed Chrome build. Suggested captures: popup and categories, settings/whitelist, markers on a video, explicit submission review. Do not use fake counters, fake reviews, or mockups presented as live functionality.
- **Small promotional tile:** optional, 440 × 280 PNG/JPEG.
- **Marquee promotional tile:** optional, 1400 × 560 PNG/JPEG.
- **Promotional video:** optional; no video is prepared.
- **Homepage URL:** set to the published GitHub Pages URL after owner/repository are known.
- **Support URL:** set to the public issue/support page after repository is configured.
- **Privacy Policy URL:** `https://<owner>.github.io/SkipTube/privacy.html` (placeholder; replace with and verify the published Pages URL).
- **Chrome Web Store URL:** configure `chromeWebStoreUrl` in `docs/site-config.js` only after publication.

Current Chrome Web Store listing guidance requires a 128×128 icon and at least one 1280×800 screenshot; promo tiles are optional. Check the [current official listing guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) before submission, as dashboard fields can change.

## Single purpose

“Retrieve community-submitted segment timestamps for the current YouTube video and skip enabled intervals according to the user's preferences.”

## Permission and host access justifications

- **`storage`:** save user-selected categories, playback settings, whitelists, segment cache, skip totals, local SponsorBlock submission ID, and temporary per-tab status.
- **YouTube host/content-script access:** detect the current video ID and channel for the requested feature, observe playback time/duration, seek over enabled segments, show segment markers/notices, and expose user-started submission controls. The content script runs only on YouTube host patterns in the manifest.
- **`https://sponsor.ajay.app/*`:** fetch segment records for the current video and send a segment only after the user has reviewed and confirmed a submission.
- **Remote code:** none. All executable code is packaged locally; API responses are data only.
- **Other permissions:** the manifest requests only `storage`; there is no `tabs`, `activeTab`, `scripting`, or broad all-sites permission.

## Privacy disclosures to reconcile in the dashboard

Use the Developer Dashboard's current definitions. Disclose at minimum:

- Current YouTube video ID and enabled categories are sent to SponsorBlock for segment lookup. This identifies the video being watched and is necessary for the core feature.
- The extension's first-run popup prominently explains segment lookup and requires the user to select “Agree and continue” before the first request. Include this disclosure and consent behavior in the listing review.
- Explicitly confirmed submissions additionally transmit timestamps, category, video duration, local random submission ID, and client identifier to SponsorBlock for public community submission.
- Settings, whitelist entries, cache, skip totals, and local random ID remain in browser-local storage. They are not transmitted to a SkipTube server; SkipTube has no backend.
- Optional diagnostics write the current video ID/category counts to the local page console only and are off by default.
- No analytics, advertising, third-party tracking, or remotely hosted executable code is used.

The listing and this project's [Privacy Policy](docs/privacy.html) must remain consistent with the shipped code. Chrome requires an accurate privacy policy and permission justifications for data-handling extensions; see [privacy field guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

## Pre-submission checklist

- [ ] Confirm license/copyright holder and contributor rights.
- [ ] Confirm provenance/redistribution rights for bundled icons listed in `THIRD_PARTY_NOTICES.md`.
- [x] Create the public GitHub repository and publish the source on `main`.
- [ ] Configure repository metadata, support route, and verified website/privacy URLs after Pages deployment.
- [ ] Enable a private vulnerability-reporting path before launch.
- [ ] Complete live Chrome and Brave QA using `README.md`.
- [ ] Capture at least one genuine 1280×800 screenshot after QA.
- [ ] Verify the required pre-install disclosure and affirmative consent flow in the extracted production package.
- [ ] Verify 128×128 store icon and optional promo tile dimensions.
- [ ] Build and independently validate `dist/SkipTube-<version>.zip`.
- [ ] Review extension host access and storage permission justifications.
- [ ] Complete data use declarations based on actual behavior and the current Dashboard categories.
- [ ] Register a Chrome Web Store developer account. Google currently documents a one-time registration fee; the dashboard shows the amount and required terms for the account's region.
- [ ] Review the Developer Agreement, choose distribution regions, and submit only after owner approval.
- [ ] After Chrome Web Store publication, set the real store URL in `docs/site-config.js` and website installation instructions.

## Submission sequence

1. In the Chrome Web Store Developer Dashboard, create a new item and upload `dist/SkipTube-1.0.0.zip`.
2. Enter the title, short and detailed descriptions, category, language, screenshots, and any selected promotional images.
3. Configure the homepage and privacy-policy URL only after GitHub Pages is enabled and the actual deployed URL has been verified. Configure a support URL only after its route is available.
4. Complete the current privacy/data-use fields and permission justifications from this document, reconciling each answer with the packaged code and live first-use disclosure.
5. Set distribution regions and visibility, save the draft, inspect the store preview, and submit for review only after the publisher approves the final disclosure and assets.
6. After approval, configure the real store URL in `docs/site-config.js`; rebuild only if extension files changed, then verify Chrome and Brave installation from the listing.

- [ ] Enable Google Account 2-Step Verification for the publishing account.
