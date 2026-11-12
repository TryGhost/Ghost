import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

describe('dev-wait-for-ghost', { skip: process.platform === 'win32' }, () => {
  it('stops waiting when the nx that started it exits', { timeout: 10_000 }, async (t) => {
    const root = mkdtempSync(join(tmpdir(), 'ghost-dev-wait-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
    for (const file of ['dev-wait-for-ghost.ts', 'lib/ghost-dev-env.ts']) {
      const target = join(root, 'tools/scripts', file);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(new URL(`../${file}`, import.meta.url), target);
    }
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');

    const nx = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    t.after(() => nx.kill('SIGKILL'));
    const wait = spawn(process.execPath, [join(root, 'tools/scripts/dev-wait-for-ghost.ts')], {
      stdio: 'ignore',
      env: {
        ...process.env,
        NX_INVOCATION_ROOT_PID: String(nx.pid),
        GHOST_DEV_BACKEND_PORT: '1',
        GHOST_DEV_BACKEND_PORT_2: '2',
      },
    });
    t.after(() => wait.kill('SIGKILL'));

    const exit = once(wait, 'exit');
    nx.kill('SIGKILL');
    const [code] = await exit;
    assert.equal(code, 1);
  });
});
