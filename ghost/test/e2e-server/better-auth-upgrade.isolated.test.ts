import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import request from 'supertest';
import { SESSION_COOKIE_NAME as SESSION_COOKIE } from '../../core/server/auth/better-auth/create-auth';
import { getInDevelopmentTables } from '../../core/server/data/schema/in-development';

const { startGhost, fixtureManager, configUtils } = require('../utils/e2e-framework');
const db = require('../../core/server/data/db');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const owner = DataGenerator.Content.users[0];
const GHOST_ROOT = path.join(__dirname, '../..');
const MIGRATIONS = path.join(GHOST_ROOT, 'core/server/data/migrations/versions');
const BOOT_TIMEOUT_MS = 90_000;
const AUTH_TABLES = ['verifications', 'user_sessions', 'user_accounts'];
const OAUTH_TABLES = [
  'oauth_clients',
  'oauth_resources',
  'oauth_client_resources',
  'oauth_refresh_tokens',
  'oauth_access_tokens',
  'oauth_consents',
  'oauth_client_assertions',
  'oauth_jwks',
];
// The migrations that graduated the auth tables (plan Phase 3, step 5) and the
// OAuth provider's tables
const GRADUATION =
  /-(add-better-auth-tables|backfill-credential-accounts|add-oauth-provider-tables)\.ts$/;

type Engine = 'legacy' | 'better-auth';
type BootOptions = { deviceVerification?: boolean; smtpPort?: number };

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
async function bootGhost(
  engine: Engine,
  contentPath: string,
  port: number,
  { deviceVerification = false, smtpPort }: BootOptions = {},
) {
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
        // As in production: the auth tables come from migrations
        createInDevelopmentTables: 'false',
        security__staffDeviceVerification: String(deviceVerification),
        ...(smtpPort
          ? {
              mail__transport: 'SMTP',
              mail__from: 'ghost@example.com',
              mail__options__host: '127.0.0.1',
              mail__options__port: String(smtpPort),
              mail__options__ignoreTLS: 'true',
            }
          : {}),
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
  [response.headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((c: string) => c.split(';')[0]);

/** A browser's cookie jar: a later cookie replaces one with the same name */
const mergeCookies = (jar: string[], cookies: string[]) => {
  const names = new Set(cookies.map((c) => c.split('=')[0]));
  return [...jar.filter((c) => !names.has(c.split('=')[0])), ...cookies];
};

/**
 * Puts the test database back as a release from before the auth tables
 * graduated left it: hashes in `users.password`, no auth or OAuth tables, and
 * the graduation migrations not yet run
 */
async function toPreGraduationDatabase() {
  const accounts = await db
    .knex('user_accounts')
    .where({ provider_id: 'credential' })
    .select('user_id', 'password');
  for (const account of accounts) {
    await db.knex('users').where({ id: account.user_id }).update({ password: account.password });
  }
  // Newer than the auth tables and some reference them, so they go first. The
  // Ghost these tests boot doesn't create in-development tables, so they stay gone
  for (const table of [...getInDevelopmentTables(), ...OAUTH_TABLES].toReversed()) {
    await db.knex.schema.dropTableIfExists(table);
  }
  for (const table of AUTH_TABLES) {
    await db.knex.schema.dropTableIfExists(table);
  }

  const graduation = fs
    .readdirSync(MIGRATIONS)
    .flatMap((version) => fs.readdirSync(path.join(MIGRATIONS, version)))
    .filter((name) => GRADUATION.test(name))
    // knex-migrator records a .ts migration under its .js name
    .map((name) => name.replace(/\.ts$/, '.js'));
  assert.equal(graduation.length, 3, 'finds the graduation migrations');
  assert.equal(await db.knex('migrations').whereIn('name', graduation).del(), 3);
}

/** A minimal SMTP server that keeps every message it receives */
async function startSmtpSink() {
  const messages: { to: string[]; data: string }[] = [];
  const server = net.createServer((socket) => {
    let buffer = '';
    let to: string[] = [];
    let data: string | null = null;
    // A reset from Ghost's side would otherwise crash the test process
    socket.on('error', () => socket.destroy());
    socket.write('220 sink\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data !== null) {
          if (line === '.') {
            messages.push({ to, data });
            to = [];
            data = null;
            socket.write('250 ok\r\n');
          } else {
            data += `${line}\n`;
          }
          continue;
        }
        const command = line.slice(0, 4).toUpperCase();
        if (command === 'RCPT') {
          to.push((line.match(/<([^>]*)>/)?.[1] ?? '').toLowerCase());
        }
        if (command === 'DATA') {
          data = '';
          socket.write('354 go\r\n');
        } else if (command === 'QUIT') {
          socket.end('221 bye\r\n');
        } else {
          socket.write('250 ok\r\n');
        }
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  return {
    port: (server.address() as net.AddressInfo).port,
    /** The sign-in codes sent to an address, oldest first */
    codesFor: (email: string) =>
      messages
        .filter((message) => message.to.includes(email.toLowerCase()))
        .map(
          (message) => message.data.match(/(\d{6}) is your Ghost sign in verification code/)?.[1],
        )
        .filter((code): code is string => Boolean(code)),
    async close() {
      server.close();
      await once(server, 'close');
    },
  };
}

async function waitFor<T>(read: () => T, done: (value: T) => boolean, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let value = read();
  while (!done(value) && Date.now() < deadline) {
    await sleep(100);
    value = read();
  }
  return value;
}

// Plan §7: a site upgrades from before the auth tables graduated, a signed-in
// staff user moves to better-auth and signs in once, and a rollback to legacy
// honours their old session (§8)
describe.skipIf(isSQLite)('Upgrading auth:engine from legacy to better-auth', function () {
  let contentPath: string;
  // One site URL throughout: sessions are pinned to their origin
  let port: number;
  let ghost: Awaited<ReturnType<typeof bootGhost>> | undefined;

  let smtp: Awaited<ReturnType<typeof startSmtpSink>> | undefined;
  let preGraduationHashes: Record<string, string>;

  const restart = async (engine: Engine, options?: BootOptions) => {
    await ghost?.stop();
    ghost = undefined;
    ghost = await bootGhost(engine, contentPath, port, options);
  };

  // Ghost trusts X-Forwarded-For from loopback, so `ip` is the client's address
  const postSession = (email: string, cookie: string[] = [], ip = '127.0.0.1') =>
    request(ghost!.url)
      .post('/ghost/api/admin/session/')
      .set('Origin', ghost!.url)
      .set('X-Forwarded-For', ip)
      .set('Cookie', cookie)
      .send({ username: email, password: owner.password });

  const signIn = async () => cookieOf(await postSession(owner.email).expect(201));

  const me = (cookie: string[]) =>
    request(ghost!.url)
      .get('/ghost/api/admin/users/me/')
      .set('Origin', ghost!.url)
      .set('Cookie', cookie);

  const meIs = async (cookie: string[], email: string) => {
    const { body } = await me(cookie).expect(200);
    assert.equal(body.users[0].email, email);
  };

  beforeAll(async function () {
    // The test database with fixture users; each engine then boots on it in its own process
    await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
    await toPreGraduationDatabase();
    preGraduationHashes = Object.fromEntries(
      (await db.knex('users').select('id', 'password')).map(
        (user: { id: string; password: string }) => [user.id, user.password],
      ),
    );
    contentPath = configUtils.config.get('paths:contentPath');
    port = await freePort();
    await jobsService.shutdown();
  }, BOOT_TIMEOUT_MS);

  afterAll(async function () {
    await ghost?.stop();
    await smtp?.close();
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
      // Boot migrates: every staff password is copied into a credential row
      await restart('legacy');
      for (const table of OAUTH_TABLES) {
        assert.ok(await db.knex.schema.hasTable(table), `creates ${table}`);
      }
      const credentials = await db
        .knex('user_accounts')
        .where({ provider_id: 'credential' })
        .select('user_id', 'account_id', 'password');
      assert.deepEqual(
        Object.fromEntries(
          credentials.map((row: { user_id: string; password: string }) => [
            row.user_id,
            row.password,
          ]),
        ),
        preGraduationHashes,
      );
      for (const row of credentials) {
        assert.equal(row.account_id, row.user_id);
      }
      // users.password is left as it was, for a rollback to an earlier release
      for (const [id, password] of Object.entries(preGraduationHashes)) {
        assert.equal((await db.knex('users').where({ id }).first('password')).password, password);
      }

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

  it(
    'asks each staff user for one code after a switch with device verification on',
    async function () {
      smtp = await startSmtpSink();
      // Staff who have signed in before, so their first sign-in isn't trusted
      await db.knex('users').update({ last_seen: new Date(Date.now() - 60 * 60 * 1000) });
      // The fixture staff, who share a password
      const staff: { email: string }[] = await db
        .knex('users')
        .where({ status: 'active' })
        .whereIn(
          'email',
          DataGenerator.Content.users.map((user: { email: string }) => user.email),
        )
        .select('email');
      assert.ok(staff.length > 1, 'has several staff users');

      // Upgraded under legacy first, then switched
      await restart('legacy');
      await restart('better-auth', { deviceVerification: true, smtpPort: smtp.port });

      const browsers: Record<string, string[]> = {};
      // Each from their own address: testing config allows 5 sign-ins per IP
      for (const [index, { email }] of staff.entries()) {
        const ip = `10.0.0.${index + 1}`;
        const unverified = await postSession(email, [], ip).expect(403);
        assert.equal(unverified.body.errors[0].type, 'Needs2FAError');
        let jar = cookieOf(unverified);

        const [code] = await waitFor(
          () => smtp!.codesFor(email),
          (codes) => codes.length > 0,
        );
        assert.ok(code, `emails ${email} a code`);
        const verified = await request(ghost!.url)
          .put('/ghost/api/admin/session/verify/')
          .set('Origin', ghost!.url)
          .set('X-Forwarded-For', ip)
          .set('Cookie', jar)
          .send({ token: code })
          .expect(200);
        jar = mergeCookies(jar, cookieOf(verified));
        await meIs(jar, email);

        // The same browser signs in again without a code, on its device cookie alone
        const device = jar.filter((cookie) => !cookie.startsWith(`${SESSION_COOKIE}=`));
        const again = cookieOf(await postSession(email, device, ip).expect(201));
        assert.ok(
          again.some((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`)),
          'issues a new session',
        );
        jar = mergeCookies(device, again);
        await meIs(jar, email);
        browsers[email] = jar;
      }

      // Still signed in after a restart, and no one got a second code
      await restart('better-auth', { deviceVerification: true, smtpPort: smtp.port });
      for (const { email } of staff) {
        await meIs(browsers[email], email);
        assert.equal(smtp.codesFor(email).length, 1, `${email} gets one code`);
      }
    },
    4 * BOOT_TIMEOUT_MS,
  );
});
