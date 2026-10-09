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
