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

Version 1.0.0 source is published on GitHub in commit `71f454b34d87b2c676b8f95c09680816c190ac8c`. The release has not been tagged or published to the Chrome Web Store; complete browser QA and owner approval before creating a release tag.
