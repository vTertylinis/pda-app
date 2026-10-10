# PDA App Ordering System

## Screenshots

![first](screenshots/photo.png)
![second](screenshots/photo1.png)
![third](screenshots/photo2.png)

This is a full-stack ordering platform built with Angular, Ionic and Node.js.

## Features
- Customer ordering
- Automatic printing

## Tech Stack
- Angular
- Ionic
- Node.js

## Installing and testing

Use `npm ci` to install the versions in `package-lock.json`, and commit the
lockfile together with dependency changes. Run `npm test -- --watch=false` for
a single Vitest test run using jsdom. Ionic's loader is handled by
`vitest.config.mts`. The production build uses Angular's application builder and
still writes directly into `www/`; `npm run deploy` retains the `/tablet/` base
path and copies the build to the backend's `pda-app-tablet/` folder.
## Coordinated cart updates

Deploy and restart the updated backend before deploying this frontend. The new
cart write endpoints use stable item IDs and check the captured item contents.
A conflicting edit, removal or move returns HTTP 409 and refreshes the cart.
Legacy endpoints remain available for devices still running an older build;
those older builds retain their previous index-based behavior.

Quantities from 1 to 100 are added in one request, with one save and socket
update. Do not automatically retry an unconfirmed write; check the refreshed
cart first. Existing printer and persistence error handling is unchanged.
