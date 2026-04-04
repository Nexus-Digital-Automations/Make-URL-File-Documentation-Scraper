---
title: Puppeteer Chrome Version Alignment
status: completed
created: 2026-04-04
---
## Vision
Align the puppeteer package version with the Chrome binary already present in
the local cache, eliminating the need to maintain two Chrome installations and
resolving the browser-launch failure.

## Requirements
- Puppeteer must launch Chrome without a "Could not find Chrome" error
- The Chrome binary used must be the one already cached at
  `~/.cache/puppeteer/chrome/mac_arm-146.0.7680.153`
- No additional Chrome download should be required after the change
- Existing scraper functionality must be unaffected

## Acceptance Criteria
- [x] `node main.js <url>` starts without a browser-launch error
- [x] Logs show `BROWSER_LAUNCH_SUCCESS` with the `146.0.7680.153` binary path
- [x] `npm test` exits 0
- [x] `npm run build` exits 0
- [x] `npm run lint` exits 0

## Technical Decisions
- Upgraded `puppeteer` from `^22.15.0` to `^24.40.0` — this release pins
  Chrome `146.0.7680.153`, matching the binary already in the local cache.
- Added explicit `puppeteer-core@^24.40.0` to keep peer versions in sync.
- Removed the separately-installed Chrome 127 (`mac_arm-127.0.6533.88`) that
  was downloaded as a workaround in the same session.

## Progress
- Retrospective spec — implementation commit: `c834181`
- Exception note: change was a direct user-directed dependency upgrade in
  response to a runtime failure; no design exploration was required.
