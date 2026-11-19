import assert from 'node:assert/strict';
import sinon from 'sinon';
import request from 'supertest';

const {
  startGhost,
  fixtureManager,
  configUtils,
  mockManager,
  resetRateLimits,
} = require('../utils/e2e-framework');
const db = require('../../core/server/data/db');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');
const DataGenerator = require('../utils/fixtures/data-generator');
const SettingsBREADService = require('../../core/server/services/settings/settings-bread-service');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const [owner, admin] = DataGenerator.Content.users;

// Under better-auth there is no req.session, so the OAuth state lives in
// `verifications`, one row per staff user, deleted once a save succeeds
describe.skipIf(isSQLite)('Stripe Connect under auth:engine better-auth', function () {
  const sandbox = sinon.createSandbox();
  const adminOrigin = 'http://localhost:2369';
  const host = new URL(adminOrigin).host;
  let app: Parameters<typeof request>[0];

  const cookieOf = (response: request.Response) =>
    [response.headers['set-cookie']].flat().map((c: string) => c.split(';')[0]);

  const adminApi = (method: 'get' | 'put' | 'post', path: string, cookie?: string[]) => {
    const agent = request(app);
    const req = agent[method](`/ghost/api/admin/${path}`)
      .set('Host', host)
      .set('Origin', adminOrigin);
    return cookie ? req.set('Cookie', cookie) : req;
  };

  const signIn = async (user: { email: string; password: string }) =>
    cookieOf(
      await adminApi('post', 'session/')
        .send({ username: user.email, password: user.password })
        .expect(201),
    );

  const stateRows = (userId: string) =>
    db.knex('verifications').where({ identifier: `stripe-connect:${userId}` });

  async function startConnect(cookie: string[]) {
    const response = await adminApi('get', 'members/stripe_connect/?mode=test', cookie).expect(302);
    const location = new URL(response.headers.location);
    assert.equal(location.origin, 'https://connect.stripe.com');
    // No legacy session cookie under better-auth
    assert.equal(response.headers['set-cookie'], undefined);
    const state = location.searchParams.get('state');
    assert.ok(state);
    return state;
  }

  // What stripe.ghost.org hands back for the user to paste into Admin
  const token = (state: string | null) =>
    Buffer.from(
      JSON.stringify({
        s: state,
        p: 'pk_test_stripeConnect',
        a: 'sk_test_stripeConnect',
        l: false,
        n: 'Test Account',
        i: 'acct_test_stripe_connect',
      }),
    ).toString('base64');

  const saveToken = (cookie: string[], value: string) =>
    adminApi('put', 'settings/', cookie).send({
      settings: [{ key: 'stripe_connect_integration_token', value }],
    });

  const setting = async (key: string) =>
    (await db.knex('settings').where({ key }).first())?.value ?? null;

  beforeAll(async function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('url', `${adminOrigin}/`);

    app = await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
  });

  beforeEach(async function () {
    // mockManager.restore() resets config, and the origin check reads the URL per request
    configUtils.set('url', `${adminOrigin}/`);
    configUtils.set('security:staffDeviceVerification', false);
    await resetRateLimits();
    await db.knex('verifications').where('identifier', 'like', 'stripe-connect:%').del();
    await db
      .knex('settings')
      .whereIn('key', ['stripe_connect_publishable_key', 'stripe_connect_secret_key'])
      .update({ value: null });
    mockManager.mockMail();
  });

  afterEach(function () {
    mockManager.restore();
  });

  afterAll(async function () {
    sandbox.restore();
    try {
      await jobsService.shutdown();
    } finally {
      await stripe.shutdown();
      await configUtils.restore();
    }
  });

  it('round-trips the state from the redirect to saving the token, once', async function () {
    const cookie = await signIn(owner);
    const state = await startConnect(cookie);

    const [row] = await stateRows(owner.id);
    assert.equal(row.value, state);
    const ttl = new Date(row.expires_at).getTime() - Date.now();
    assert.ok(ttl > 0 && ttl <= 60 * 60 * 1000, `unexpected expiry ${row.expires_at}`);

    const saved = await saveToken(cookie, token(state));
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(await setting('stripe_connect_publishable_key'), 'pk_test_stripeConnect');
    assert.equal((await stateRows(owner.id)).length, 0);

    // The state is single-use
    await saveToken(cookie, token(state)).expect(400);
  });

  it('keeps only the latest state, and keeps it after a mismatch', async function () {
    const cookie = await signIn(owner);
    const first = await startConnect(cookie);
    const second = await startConnect(cookie);

    assert.equal((await stateRows(owner.id)).length, 1);
    await saveToken(cookie, token(first)).expect(400);
    assert.equal((await stateRows(owner.id)).length, 1);
    await saveToken(cookie, token(second)).expect(200);
    assert.equal(await setting('stripe_connect_publishable_key'), 'pk_test_stripeConnect');
  });

  it('keeps the state when saving fails, so the same token can be retried', async function () {
    const cookie = await signIn(owner);
    const state = await startConnect(cookie);

    mockManager.mockLimitService('limitStripeConnect', {
      isLimited: true,
      errorIfWouldGoOverLimit: true,
    });
    await saveToken(cookie, token(state)).expect(403);
    assert.equal(await setting('stripe_connect_publishable_key'), null);
    assert.equal((await stateRows(owner.id)).length, 1);

    mockManager.restore();
    configUtils.set('url', `${adminOrigin}/`);
    const retried = await saveToken(cookie, token(state));
    assert.equal(retried.status, 200, JSON.stringify(retried.body));
    assert.equal(await setting('stripe_connect_publishable_key'), 'pk_test_stripeConnect');
    assert.equal((await stateRows(owner.id)).length, 0);
  });

  it("a save in flight doesn't clear a connection started in another tab", async function () {
    const cookie = await signIn(owner);
    const tabA = await startConnect(cookie);
    let tabB: string | undefined;

    // Tab B starts connecting after tab A's token is checked, before its save finishes
    const edit = SettingsBREADService.prototype.edit;
    const stub = sinon.stub(SettingsBREADService.prototype, 'edit').callsFake(async function (
      this: unknown,
      ...args: unknown[]
    ) {
      tabB = await startConnect(cookie);
      return edit.apply(this, args);
    });
    try {
      await saveToken(cookie, token(tabA)).expect(200);
    } finally {
      stub.restore();
    }

    assert.ok(tabB);
    const rows = await stateRows(owner.id);
    assert.deepEqual(
      rows.map((row: { value: string }) => row.value),
      [tabB],
    );
    await saveToken(cookie, token(tabB)).expect(200);
    assert.equal((await stateRows(owner.id)).length, 0);
  });

  it('rejects a token with a null state when no connection was started', async function () {
    const cookie = await signIn(owner);

    await saveToken(cookie, token(null)).expect(400);
    assert.equal(await setting('stripe_connect_publishable_key'), null);
  });

  it('rejects a mismatched state', async function () {
    const cookie = await signIn(owner);
    await startConnect(cookie);

    await saveToken(cookie, token('not-the-state')).expect(400);
    assert.equal(await setting('stripe_connect_publishable_key'), null);
  });

  it('rejects an expired state', async function () {
    const cookie = await signIn(owner);
    const state = await startConnect(cookie);
    await stateRows(owner.id).update({ expires_at: new Date(Date.now() - 1000) });

    await saveToken(cookie, token(state)).expect(400);
    assert.equal(await setting('stripe_connect_publishable_key'), null);
  });

  it("rejects another staff user's state", async function () {
    const ownerCookie = await signIn(owner);
    const adminCookie = await signIn(admin);
    const state = await startConnect(ownerCookie);

    await saveToken(adminCookie, token(state)).expect(400);
    assert.equal(await setting('stripe_connect_publishable_key'), null);
    // The owner's state is untouched
    assert.equal((await stateRows(owner.id)).length, 1);
  });
});
