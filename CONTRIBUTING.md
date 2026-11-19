# Contributing to SkipTube

Thanks for considering a contribution. SkipTube is a small browser extension; changes should keep its purpose narrow and its privacy behavior explicit.

## Before you start

- Check existing issues and discussions once the public repository is configured.
- For substantial behavior changes, describe the problem and proposed approach before investing in a large patch.
- Do not include credentials, private data, personal video histories, or real SponsorBlock user IDs in examples or logs.
- Do not submit test segments to SponsorBlock unless you intend them to be public contributions.

## Development

- Use JavaScript modules and browser APIs already used by the project.
- Avoid dependencies unless they solve a concrete need and can be maintained safely.
- Keep extension permissions narrow. Explain any permission or host change in the pull request.
- Keep all external requests limited to the documented SponsorBlock API. Do not add analytics or remote executable code.
- Preserve user confirmation for public segment submissions.
- Keep UI changes responsive, accessible, and consistent with the dark SkipTube interface.

## Checks

Run the applicable checks before opening a pull request:

```sh
npm test
npm run check
npm run package
npm run check:package
```

For playback, navigation, permission, or UI changes, manually test in current Chrome and Brave and include the browser versions and steps. Do not report a test as passed if it was not run.

## Pull requests

Include a concise description, reason, user-visible behavior, test results, permissions/network impact, and screenshots for visible UI changes. Keep unrelated refactors out of feature or bug-fix patches.

By submitting a contribution, you agree that it may be distributed under the project license. Do not submit code you do not have the right to contribute.
