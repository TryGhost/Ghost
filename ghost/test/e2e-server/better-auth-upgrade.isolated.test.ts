import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import net from 'node:net';
import path from 'node:path';
import request from 'supertest';

const { startGhost, fixtureManager, configUtils } = require('../utils/e2e-framework');
const db = require('../../core/server/data/db');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const owner = DataGenerator.Content.users[0];
const GHOST_ROOT = path.join(__dirname, '../..');
const BOOT_TIMEOUT_MS = 90_000;

type Engine = 'legacy' | 'better-auth';

async function freePort(): Promise<number> {
  const server = net.createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as net.AddressInfo;
  server.close();
  await once(server, 'close');
  return port;
}

/**
 * Boots Ghost in its own process on the test database: the engine is chosen
 * once at module load, so switching it takes a restart, as on a real site
 */
async function bootGhost(engine: Engine, contentPath: string, port: number) {
  const url = `http://127.0.0.1:${port}`;
  let output = '';
  const child: ChildProcess = spawn(
    process.execPath,
    ['--conditions=source', '--import=tsx', 'index.js'],
    {
      cwd: GHOST_ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'testing-mysql',
        url: `${url}/`,
        server__port: String(port),
        paths__contentPath: contentPath,
        auth__engine: engine,
        auth__betterAuthDev: 'true',
        createInDevelopmentTables: 'true',
        security__staffDeviceVerification: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stdout?.on('data', (chunk) => (output += chunk));
  child.stderr?.on('data', (chunk) => (output += chunk));

  const exited = once(child, 'exit').then(([code]) => {
    throw new Error(`Ghost (${engine}) exited with ${code} during boot:\n${output}`);
  });
  const ready = (async () => {
    const deadline = Date.now() + BOOT_TIMEOUT_MS;
    while (Date.now() < deadline && !exitedAlready(child)) {
      // Bounded, so a stalled response can't outlast the boot deadline
      const ok = await fetch(`${url}/ghost/api/admin/site/`, {
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      })
        .then((res) => res.ok)
        .catch(() => false);
      if (ok) {
        return;
      }
      await sleep(250);
    }
    throw new Error(`Ghost (${engine}) did not boot in time:\n${output}`);
  })();
  try {
    await Promise.race([ready, exited]);
  } catch (err) {
    child.kill('SIGKILL');
    throw err;
  }
  exited.catch(() => {});

  return {
    url,
    async stop() {
      if (exitedAlready(child)) {
        return;
      }
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 15_000);
      await stopped;
      clearTimeout(timer);
    },
  };
}

// A child killed by a signal has a signalCode and no exitCode
const exitedAlready = (child: ChildProcess) => child.exitCode !== null || child.signalCode !== null;

const cookieOf = (response: request.Response) =>
  [response.headers['set-cookie']].flat().map((c: string) => c.split(';')[0]);

// Plan §7: a signed-in staff user upgrades to better-auth, signs in once, and a
// rollback to legacy honours their old session (§8)
describe.skipIf(isSQLite)('Upgrading auth:engine from legacy to better-auth', function () {
  let contentPath: string;
  // One site URL throughout: sessions are pinned to their origin
  let port: number;
  let ghost: Awaited<ReturnType<typeof bootGhost>> | undefined;

  const restart = async (engine: Engine) => {
    await ghost?.stop();
    ghost = undefined;
    ghost = await bootGhost(engine, contentPath, port);
  };

  const signIn = async () => {
    const response = await request(ghost!.url)
      .post('/ghost/api/admin/session/')
      .set('Origin', ghost!.url)
      .send({ username: owner.email, password: owner.password })
      .expect(201);
    return cookieOf(response);
  };

  const me = (cookie: string[]) =>
    request(ghost!.url)
      .get('/ghost/api/admin/users/me/')
      .set('Origin', ghost!.url)
      .set('Cookie', cookie);

  beforeAll(async function () {
    // The test database with fixture users; each engine then boots on it in its own process
    await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
    contentPath = configUtils.config.get('paths:contentPath');
    port = await freePort();
    await jobsService.shutdown();
  }, BOOT_TIMEOUT_MS);

  afterAll(async function () {
    await ghost?.stop();
    try {
      await jobsService.shutdown();
    } finally {
      await stripe.shutdown();
      await configUtils.restore();
    }
  }, 30_000);

  // One test: each step uses the cookies the step before it issued
  it(
    'signs in once after the upgrade and keeps the old session for a rollback',
    async function () {
      await restart('legacy');
      const legacyCookie = await signIn();
      await me(legacyCookie).expect(200);

      // Signed out once; the existing password still works
      await restart('better-auth');
      await me(legacyCookie).expect(403);
      const betterAuthCookie = await signIn();
      await me(betterAuthCookie).expect(200);
      // Kept for a rollback; only security events delete legacy rows
      assert.equal((await db.knex('sessions').where({ user_id: owner.id })).length, 1);

      // Not asked again after a restart
      await restart('better-auth');
      await me(betterAuthCookie).expect(200);

      // Rollback honours the old session; sessions since the flip aren't legacy sessions
      await restart('legacy');
      await me(legacyCookie).expect(200);
      await me(betterAuthCookie).expect(403);
    },
    4 * BOOT_TIMEOUT_MS,
  );
});
