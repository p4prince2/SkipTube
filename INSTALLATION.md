# Install SkipTube 1.0.0 from the release ZIP

The release ZIP is an unpacked-extension package. Extract it first; do not select the ZIP itself in the browser.

## Chrome

1. Download `SkipTube-1.0.0.zip` from the approved release.
2. Extract the archive to a folder you will keep, such as `SkipTube-1.0.0`.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder containing the root `manifest.json`.
5. Pin SkipTube from the Extensions menu, open a YouTube video, and open the SkipTube popup.
6. Review the first-use SponsorBlock data notice and select **Agree and continue** to enable segment lookups. Without consent, no lookup request is made.

## Brave

Follow the same steps using `brave://extensions` and **Load unpacked**. Chrome Web Store installation is not available until the listing is published.

## Updating

Extract a new version to a new folder, then use **Reload** on the extension's card or remove the old unpacked item and load the new folder. Refresh existing YouTube tabs after updating extension code so the tab loads the new content script.

## Troubleshooting

- Confirm the extracted folder has `manifest.json` at its top level.
- Check the extension card for load errors.
- Confirm SkipTube is enabled and first-use consent has been granted.
- Open the page and service-worker DevTools consoles to inspect runtime errors. Enable optional diagnostics in Settings only when needed; the logs include the current video ID and category counts.
- SponsorBlock has no segment for every video. An absent community segment is not something SkipTube can infer.
