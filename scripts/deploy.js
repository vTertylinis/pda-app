// TABLET branch: copies the production build (www/, built with
// --base-href /tablet/) into pda-server/pda-app-tablet/. The shop server
// serves it at /tablet and reloads the tablet when it sees the new build.
// Run via: npm run deploy
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'www');
const dest = path.join(__dirname, '..', '..', 'pda-server', 'pda-app-tablet');

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error(`No build found at ${src} — run "npm run deploy" (not plain build).`);
  process.exit(1);
}

// The build must have been made with --base-href /tablet/ or the served app
// would request its js/css from the phone app's paths and break both.
const index = fs.readFileSync(path.join(src, 'index.html'), 'utf-8');
if (!index.includes('<base href="/tablet/"')) {
  console.error('Build is missing <base href="/tablet/"> — use "npm run deploy" so ng build gets --base-href /tablet/.');
  process.exit(1);
}

// Replace the old build atomically-ish: stage next to the target, then swap,
// so the tablet loading mid-deploy never sees a half-copied folder.
const staging = dest + '.staging';
fs.rmSync(staging, { recursive: true, force: true });
fs.cpSync(src, staging, { recursive: true });
const old = dest + '.old';
fs.rmSync(old, { recursive: true, force: true });
if (fs.existsSync(dest)) fs.renameSync(dest, old);
fs.renameSync(staging, dest);
fs.rmSync(old, { recursive: true, force: true });
console.log(`Deployed tablet build to ${dest}`);
console.log('Commit & push pda-server, then pull on the shop PC — its server');
console.log('will spot the new build and reload the tablet automatically.');
