const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pda-deploy-test-'));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('pda-deploy-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const frontend = path.join(root, 'pda-app');
  fs.mkdirSync(path.join(frontend, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(frontend, 'www'));
  fs.writeFileSync(path.join(frontend, 'www', 'index.html'), 'new build');
  const script = path.join(frontend, 'scripts', 'deploy.js');
  fs.copyFileSync(path.join(__dirname, 'deploy.js'), script);
  return {
    root,
    backend(name) {
      const dir = path.join(root, name);
      fs.mkdirSync(path.join(dir, 'pda-app'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'server.js'), '// server');
      fs.writeFileSync(path.join(dir, 'pda-app', 'index.html'), 'old build');
      fs.writeFileSync(path.join(dir, 'carts.json'), 'keep');
      return dir;
    },
    run(serverDir = '') {
      return spawnSync(process.execPath, [script], {
        cwd: root, encoding: 'utf8', env: { ...process.env, PDA_SERVER_DIR: serverDir },
      });
    },
  };
}

test('shop override deploys to restaurant-backend, not the default sibling', t => {
  const f = fixture(t);
  const correct = f.backend('restaurant-backend');
  const other = f.backend('pda-server');
  const result = f.run(correct);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(correct, 'pda-app', 'index.html'), 'utf8'), 'new build');
  assert.equal(fs.readFileSync(path.join(other, 'pda-app', 'index.html'), 'utf8'), 'old build');
  assert.equal(fs.readFileSync(path.join(correct, 'carts.json'), 'utf8'), 'keep');
});

test('existing default layout still works, including spaces in path', t => {
  const f = fixture(t);
  const dir = f.backend('pda-server');
  assert.equal(f.run().status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'pda-app', 'index.html'), 'utf8'), 'new build');
  assert.equal(f.run(f.backend('backend with spaces')).status, 0);
});

test('wrong or relative destination fails without creating folders', t => {
  const f = fixture(t);
  const missing = path.join(f.root, 'wrong-repo');
  const result = f.run(missing);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /server.js not found/);
  assert.equal(fs.existsSync(missing), false);
  assert.notEqual(f.run('relative/backend').status, 0);
});
