# Release versioning and process

SkipTube uses Semantic Versioning: `MAJOR.MINOR.PATCH`.

- **Patch:** backward-compatible bug or security fix.
- **Minor:** backward-compatible user-facing feature.
- **Major:** incompatible behavior, settings, or data format change.

## Release steps

1. Confirm the release is tested in Chrome and Brave and update the changelog.
2. Update `manifest.json` version and `package.json` version together. Use Chrome's three-part numeric version format (`MAJOR.MINOR.PATCH`); avoid a fourth segment.
3. Run `npm test`, `npm run check`, `npm run package`, and `npm run check:package`.
4. Inspect ZIP contents and compare listing/privacy disclosures against implementation.
5. Capture real store screenshots and verify all support, repository, privacy, and store URLs.
6. Publish only after project owner approval. Never include credentials, source maps, test fixtures with personal data, or development files in the extension package.

This workspace is currently prepared as version 1.0.0 but has not been published or tagged.
