// Copies the production build (www/) into pda-server/pda-app/, then tells the
// running server so every connected PDA reloads with the new version.
// Run via: npm run deploy
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'www');
const dest = path.join(__dirname, '..', '..', 'pda-server', 'pda-app');

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error(`No build found at ${src} — run "npm run build" first.`);
  process.exit(1);
}

// Replace the old build atomically-ish: stage next to the target, then swap,
// so a phone loading mid-deploy never sees a half-copied folder.
const staging = dest + '.staging';
fs.rmSync(staging, { recursive: true, force: true });
fs.cpSync(src, staging, { recursive: true });
const old = dest + '.old';
fs.rmSync(old, { recursive: true, force: true });
if (fs.existsSync(dest)) fs.renameSync(dest, old);
fs.renameSync(staging, dest);
fs.rmSync(old, { recursive: true, force: true });
console.log(`Deployed build to ${dest}`);
console.log('Commit & push pda-server, then pull on the shop PC — its server');
console.log('will spot the new build and reload every phone automatically.');
