import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

describe('with-ghost-dev-env', { skip: process.platform === 'win32' }, () => {
  it('stops its command when the nx that started it exits', { timeout: 10_000 }, async (t) => {
    const root = mkdtempSync(join(tmpdir(), 'ghost-dev-env-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
    for (const file of ['with-ghost-dev-env.ts', 'lib/dev-compose.ts', 'lib/ghost-dev-env.ts']) {
      const target = join(root, 'scripts', file);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(new URL(`../${file}`, import.meta.url), target);
    }
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');

    const nx = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    t.after(() => nx.kill('SIGKILL'));
    const command = 'console.log(process.pid); setInterval(() => {}, 1000)';
    const wrapper = spawn(
      process.execPath,
      [join(root, 'scripts/with-ghost-dev-env.ts'), process.execPath, '-e', command],
      {
        detached: true,
        stdio: ['ignore', 'pipe', 'inherit'],
        env: {
          ...process.env,
          NX_INVOCATION_ROOT_PID: String(nx.pid),
          DEV_COMPOSE_FILES: '',
          COMPOSE_PROFILES: '',
        },
      },
    );
    t.after(() => {
      try {
        process.kill(-wrapper.pid!, 'SIGKILL');
      } catch {
        // Already stopped.
      }
    });
    const [output] = (await once(wrapper.stdout, 'data')) as [Buffer];
    const pid = Number(String(output).trim());

    const exit = once(wrapper, 'exit');
    nx.kill('SIGKILL');
    await exit;
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  });
});
