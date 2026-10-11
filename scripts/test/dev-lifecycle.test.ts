import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it, type TestContext } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { createCodexMarker, endCodexSession, watchedDevCommand } from '../lib/dev-lifecycle.ts';
import { isListening } from '../lib/dev-stack.ts';

function checkout(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'ghost-dev-lifecycle-'));
  writeFileSync(join(root, '.git'), '');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

async function waitFor(check: () => boolean | Promise<boolean>, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for the process');
    await sleep(25);
  }
}

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

async function stack(
  t: TestContext,
  options: { claudePid?: number; codex?: boolean; resistTerm?: boolean; task?: boolean } = {},
) {
  const root = checkout(t);
  const marker = createCodexMarker(root, options.codex ? 'owner' : undefined);
  const infoFile = join(root, 'server.json');
  const server = `
    const net = require('node:net');
    const fs = require('node:fs');
    ${options.resistTerm ? "process.on('SIGTERM', () => {});" : ''}
    const server = net.createServer(socket => socket.end());
    server.listen(0, '127.0.0.1', () => fs.writeFileSync(${JSON.stringify(infoFile)},
      JSON.stringify({port: server.address().port, pid: process.pid})));
  `;
  // As an Nx task, the listener leads its own process group under a leader that stays up
  const task = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(server)}],
    {detached: true, stdio: 'inherit'}); setInterval(() => {}, 1000);`;
  const command = options.task
    ? `exec ${quote(process.execPath)} -e ${quote(task)}`
    : `${quote(process.execPath)} -e ${quote(server)} & wait`;
  const logFile = join(root, 'watcher.log');
  // The shell stays the leader and the listener is its child, as with Nx's dev tasks.
  const child = spawn(
    'sh',
    ['-c', watchedDevCommand, 'sh', root, command, String(options.claudePid ?? ''), marker],
    {
      cwd: root,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let log = '';
  child.stdout.on('data', (chunk) => {
    log += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    log += String(chunk);
  });
  t.after(() => {
    try {
      process.kill(-child.pid!, 'SIGKILL');
    } catch {
      // Already stopped.
    }
  });
  await waitFor(() => existsSync(infoFile));
  const { port, pid } = JSON.parse(readFileSync(infoFile, 'utf8')) as { port: number; pid: number };
  t.after(() => {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already stopped.
    }
  });
  await waitFor(() => isListening(port));
  return {
    root,
    marker,
    child,
    port,
    async stopped(reason: string) {
      await waitFor(async () => !(await isListening(port)), 18_000);
      assert.match(log, new RegExp(reason));
      writeFileSync(logFile, log);
    },
  };
}

describe('Codex session markers', () => {
  it('removes only the ending session markers, including multiple starts', (t) => {
    const root = checkout(t);
    const first = createCodexMarker(root, 'owner');
    const second = createCodexMarker(root, 'owner');
    const other = createCodexMarker(root, 'another-session');
    assert.notEqual(first, second);
    endCodexSession(root, { session_id: 'owner' });
    assert.equal(existsSync(first), false);
    assert.equal(existsSync(second), false);
    assert.equal(existsSync(other), true);
    endCodexSession(root, { session_id: 'owner' });
  });

  it('leaves markers alone for missing or invalid session input', (t) => {
    const root = checkout(t);
    const marker = createCodexMarker(root, 'owner');
    for (const input of [null, {}, { session_id: '' }, { session_id: 123 }]) {
      endCodexSession(root, input);
    }
    assert.equal(existsSync(marker), true);
    assert.equal(createCodexMarker(root, undefined), '');
  });

  it('does nothing when this checkout has no Codex stack', (t) => {
    endCodexSession(checkout(t), { session_id: 'owner' });
  });

  it(
    'runs the configured hook from a checkout subdirectory',
    { skip: process.platform === 'win32' },
    (t) => {
      const root = checkout(t);
      rmSync(join(root, '.git'));
      const init = spawnSync('git', ['init', '--quiet', root]);
      assert.equal(init.status, 0);
      for (const file of ['dev-session-end.ts', 'lib/dev-lifecycle.ts', 'lib/ghost-dev-env.ts']) {
        const target = join(root, 'scripts', file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(new URL(`../${file}`, import.meta.url), target);
      }
      writeFileSync(join(root, 'package.json'), '{"type":"module"}');
      const marker = createCodexMarker(root, 'owner');
      const other = createCodexMarker(root, 'other');
      const config = JSON.parse(
        readFileSync(new URL('../../.codex/hooks.json', import.meta.url), 'utf8'),
      ) as {
        hooks: { SessionEnd: { hooks: { command: string; timeout: number }[] }[] };
      };
      const hook = config.hooks.SessionEnd[0]!.hooks[0]!;
      const result = spawnSync('sh', ['-c', hook.command], {
        cwd: join(root, 'scripts'),
        input: JSON.stringify({ session_id: 'owner', hook_event_name: 'SessionEnd' }),
        timeout: hook.timeout * 1000,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(existsSync(marker), false);
      assert.equal(existsSync(other), true);
    },
  );
});

describe('dev process watcher', { concurrency: true, skip: process.platform === 'win32' }, () => {
  it('stops the stack when the checkout .git is removed', async (t) => {
    const dev = await stack(t);
    rmSync(join(dev.root, '.git'));
    await dev.stopped('was deleted');
  });

  it('stops the stack when its Claude process exits', async (t) => {
    const owner = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
    });
    t.after(() => owner.kill());
    const dev = await stack(t, { claudePid: owner.pid! });
    const exit = once(owner, 'exit');
    owner.kill();
    await exit;
    await dev.stopped('Claude Code');
  });

  it('stops the stack when its Codex session ends', async (t) => {
    const dev = await stack(t, { codex: true });
    endCodexSession(dev.root, { session_id: 'owner' });
    await dev.stopped('Codex session ended');
  });

  it('keeps running after another Codex session ends and stops on group TERM', async (t) => {
    const dev = await stack(t, { codex: true });
    endCodexSession(dev.root, { session_id: 'another-session' });
    await sleep(5500);
    assert.equal(await isListening(dev.port), true);
    process.kill(-dev.child.pid!, 'SIGTERM');
    await waitFor(async () => !(await isListening(dev.port)));
  });

  it('stops surviving children when the leader exits', async (t) => {
    const dev = await stack(t);
    const exit = once(dev.child, 'exit');
    dev.child.kill();
    await exit;
    assert.equal(await isListening(dev.port), true);
    await dev.stopped('process group leader exited');
  });

  it('stops tasks in their own process groups and removes the pid file', async (t) => {
    const dev = await stack(t, { codex: true, task: true });
    writeFileSync(join(dev.root, '.ghost-dev.pid'), `${dev.child.pid}\n`);
    endCodexSession(dev.root, { session_id: 'owner' });
    await dev.stopped('Codex session ended');
    assert.equal(existsSync(join(dev.root, '.ghost-dev.pid')), false);
  });

  it('stops tasks in their own process groups after the leader exits', async (t) => {
    const dev = await stack(t, { task: true });
    // The watcher records the tree on its next poll
    await sleep(5500);
    const exit = once(dev.child, 'exit');
    dev.child.kill('SIGKILL');
    await exit;
    assert.equal(await isListening(dev.port), true);
    await dev.stopped('process group leader exited');
  });

  it('kills children that ignore TERM after the shutdown grace period', async (t) => {
    const dev = await stack(t, { codex: true, resistTerm: true });
    endCodexSession(dev.root, { session_id: 'owner' });
    await sleep(6500);
    assert.equal(await isListening(dev.port), true);
    await dev.stopped('Codex session ended');
  });
});
