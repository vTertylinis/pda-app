// Copies www/ into the backend's pda-app/. The running server watches index.html.
// Run via npm run deploy. Set PDA_SERVER_DIR to the absolute backend repo path
// on machines where it is not the sibling folder named pda-server.
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'www');
const configuredServer = process.env.PDA_SERVER_DIR?.trim();
if (configuredServer && !path.isAbsolute(configuredServer)) {
  console.error('PDA_SERVER_DIR must be an absolute path to the backend repo.');
  process.exit(1);
}
const serverDir = path.resolve(configuredServer || path.join(__dirname, '..', '..', 'pda-server'));
const dest = path.join(serverDir, 'pda-app');
const staging = dest + '.staging';
const old = dest + '.old';

console.log(`Build source: ${src}`);
console.log(`Backend repo: ${serverDir}`);
console.log(`Deploy destination: ${dest}`);

if (!fs.existsSync(path.join(serverDir, 'server.js')) || !fs.statSync(path.join(serverDir, 'server.js')).isFile()) {
  console.error(`Backend server.js not found in ${serverDir}. Nothing was copied.`);
  console.error('Set PDA_SERVER_DIR to the actual backend repo path, then retry.');
  process.exit(1);
}

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error(`No build found at ${src} — run "npm run build" first.`);
  process.exit(1);
}

// Verify all absolute mutation targets before any recursive removal or rename.
// Reject links/junctions so deployment cannot follow a redirected build folder.
for (const target of [dest, staging, old]) {
  if (path.dirname(target) !== serverDir ||
      (fs.existsSync(target) && (fs.lstatSync(target).isSymbolicLink() || !fs.lstatSync(target).isDirectory()))) {
    console.error(`Unsafe deployment target: ${target}. Nothing was copied.`);
    process.exit(1);
  }
}

// Replace the old build atomically-ish: stage next to the target, then swap,
// so a phone loading mid-deploy never sees a half-copied folder.
fs.rmSync(staging, { recursive: true, force: true });
fs.cpSync(src, staging, { recursive: true });
fs.rmSync(old, { recursive: true, force: true });
if (fs.existsSync(dest)) fs.renameSync(dest, old);
fs.renameSync(staging, dest);
fs.rmSync(old, { recursive: true, force: true });
console.log(`Deployed build to ${dest}`);
console.log('The backend running from this repo will detect the build and reload connected phones.');
console.log('If this is a development PC, transfer this backend build to the shop through your normal update process.');
