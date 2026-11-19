# SkipTube 1.0.0 release QA record

## Automated checks — passed

- `npm test`: 24 tests passed, 0 failed. Covers segment utilities, all eight category IDs, selfpromo API normalization/filtering/cache/skip behavior, settings persistence, consent gating helper, popup lifecycle state, worker restart snapshots, tab synchronization, navigation state, and manual submission validation.
- `npm run check`: passed. Manifest/resources/icons validated; JavaScript syntax checked for 18 source and site files; website local links/resources, responsive CSS, reduced-motion support, and disabled publication links checked.
- `npm run package`: generated the production extension ZIP from runtime allowlists.
- `npm run check:package`: passed. Verified SHA-256 sidecar, root `manifest.json`, all required runtime entries, 19 archive files, relative module imports, CRCs, sizes, and excluded development files.
- Extracted the production ZIP to `dist/zip-extract-final`: 19 files extracted, required manifest resources present, and all 10 JavaScript files in the archive passed `node --check`.
- Repeated package generation produced the same SHA-256: `119f6f1345f7363a897cf1d2c462aa2d6f5d8b17c14bd01cc039ed1cad034142`.

## Live browser checks — not run

Chrome and Brave executables are installed, but no trustworthy browser test session was achieved. The desktop browser control selected a Brave window while capturing an unrelated Opera video window, so I stopped before changing browser state. A separate isolated Chrome launch request was blocked by the command policy. I did not install or exercise the final package in either browser.

The following remain unverified in both Chrome and Brave: loading the extracted folder, YouTube detection, real SponsorBlock API behavior in a player, sponsor/selfpromo seeking, all-category marker rendering, popup close/reopen, settings synchronization on an existing tab, service-worker idle/restart, SPA navigation, and live cache/statistics behavior. Do not treat the unit tests as substitutes for these tests.

## Manual acceptance checklist

- [ ] Install the extracted ZIP folder using `INSTALLATION.md`.
- [ ] Confirm first-use consent appears and no SponsorBlock segment lookup occurs before consent.
- [ ] Accept consent and verify current video detection and API lookup.
- [ ] Test known Sponsor and Self-promotion records; confirm interval boundaries, markers, and seeking. Do not submit test segments publicly.
- [ ] Check all eight categories and confirm videos with no community segment are not inferred or altered.
- [ ] Close and reopen the popup repeatedly; verify playback and state continue on the same tab.
- [ ] Change master/category/auto-skip settings while the video remains open.
- [ ] Let the MV3 worker become idle, then reopen the popup and change a setting; verify current-tab recovery.
- [ ] Navigate between videos with YouTube SPA navigation and Back/Forward; confirm IDs, segments, counts, and markers follow the active video.
- [ ] Verify local cache reuse/expiry and skip count/time-saved updates.
- [ ] Inspect console and network requests; test optional diagnostics and verify they remain local.
- [ ] Repeat in current Brave and Chrome stable builds; record versions and results before submission.
