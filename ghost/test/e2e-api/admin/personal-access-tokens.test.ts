import assert from 'node:assert/strict';
import { PAT_CONFIG_ID, PAT_PREFIX } from '../../../core/server/auth/bearer';

const { agentProvider, fixtureManager, configUtils } = require('../../utils/e2e-framework');
const db = require('../../../core/server/data/db');
const auth = require('../../../core/server/auth');
const DataGenerator = require('../../utils/fixtures/data-generator');

const isBetterAuth = configUtils.config.get('auth:engine') === 'better-auth';

const owner = DataGenerator.Content.users[0];
const contributor = DataGenerator.Content.users.find(
  (user: { email: string }) => user.email === 'contributor@ghost.org',
);

type Agent = {
  get(path: string): any;
  post(path: string): any;
  put(path: string): any;
  delete(path: string): any;
  loginAsOwner(): Promise<void>;
  clearCookies(): void;
};

describe.skipIf(isBetterAuth)('Personal Access Tokens under auth:engine legacy', function () {
  it('rejects every Bearer token as before', async function () {
    const agent: Agent = await agentProvider.getAdminAPIAgent();

    const { body } = await agent
      .get('users/me/')
      .header('Authorization', 'Bearer ghost_pat_abc')
      .expectStatus(401);
    assert.equal(body.errors[0].code, 'INVALID_AUTH_HEADER');
  });
});

describe.skipIf(!isBetterAuth)('Personal Access Tokens under auth:engine better-auth', function () {
  let agent: Agent;

  // No HTTP endpoint creates tokens yet, so they're created server-side
  async function createToken(userId: string): Promise<{ id: string; key: string }> {
    return auth.betterAuth.service.api.createApiKey({
      body: { userId, configId: PAT_CONFIG_ID },
    });
  }

  const tokenRow = (id: string) => db.knex('api_tokens').where({ id });

  const me = (authorization: string) =>
    agent.get('users/me/').header('Authorization', authorization);

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
  });

  beforeEach(function () {
    agent.clearCookies();
  });

  afterEach(async function () {
    await db.knex('api_tokens').del();
    await db.knex('users').where({ id: contributor.id }).update({ status: 'active' });
  });

  it('stores only a hash of a ghost_pat_ token, with an expiry', async function () {
    const { id, key } = await createToken(owner.id);
    const row = await tokenRow(id).first();

    assert.ok(key.startsWith(PAT_PREFIX));
    assert.notEqual(row.key, key);
    assert.equal(row.reference_id, owner.id);
    assert.equal(row.config_id, PAT_CONFIG_ID);
    assert.ok(new Date(row.expires_at).getTime() > Date.now());
  });

  it('authenticates as the token user', async function () {
    const { key } = await createToken(owner.id);

    const { body } = await me(`Bearer ${key}`).expectStatus(200);
    assert.equal(body.users[0].id, owner.id);
  });

  it('is never a Better Auth session', async function () {
    const { key } = await createToken(owner.id);
    const session = await auth.betterAuth.service.api.getSession({
      headers: new Headers({ authorization: `Bearer ${key}`, 'x-api-key': key }),
    });

    assert.equal(session, null);
  });

  it("is capped by the user's role", async function () {
    const { key } = await createToken(contributor.id);

    const { body } = await me(`Bearer ${key}`).expectStatus(200);
    assert.equal(body.users[0].id, contributor.id);
    await agent.get('members/').header('Authorization', `Bearer ${key}`).expectStatus(403);
  });

  it('cannot reach what staff tokens cannot, or staff tokens themselves', async function () {
    const { key } = await createToken(owner.id);
    const bearer = `Bearer ${key}`;

    await agent.delete('db/').header('Authorization', bearer).expectStatus(403);
    await agent.post('authentication/reset/').header('Authorization', bearer).expectStatus(403);
    await agent.get(`users/${owner.id}/token/`).header('Authorization', bearer).expectStatus(403);
    await agent.put(`users/${owner.id}/token/`).header('Authorization', bearer).expectStatus(403);
  });

  it('refuses an expired token', async function () {
    const { id, key } = await createToken(owner.id);
    await tokenRow(id).update({ expires_at: new Date(Date.now() - 1000) });

    const { body } = await me(`Bearer ${key}`).expectStatus(401);
    assert.equal(body.errors[0].code, 'BEARER_TOKEN_EXPIRED');
  });

  it('refuses a revoked token', async function () {
    const disabled = await createToken(owner.id);
    await tokenRow(disabled.id).update({ enabled: false });
    const deleted = await createToken(owner.id);
    await tokenRow(deleted.id).del();

    for (const { key } of [disabled, deleted]) {
      const { body } = await me(`Bearer ${key}`).expectStatus(401);
      assert.equal(body.errors[0].code, 'INVALID_BEARER_TOKEN');
    }
  });

  it("refuses a suspended user's token", async function () {
    const { key } = await createToken(contributor.id);
    await db.knex('users').where({ id: contributor.id }).update({ status: 'inactive' });

    await me(`Bearer ${key}`).expectStatus(401);
  });

  it('refuses unknown prefixes, empty tokens and session tokens', async function () {
    const sessionToken = 'a'.repeat(32);
    await db.knex('user_sessions').insert({
      id: 'b'.repeat(24),
      user_id: owner.id,
      token: sessionToken,
      expires_at: new Date(Date.now() + 60_000),
      origin: 'http://127.0.0.1:2369',
      verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    try {
      for (const token of ['ghost_app_abc', '', sessionToken]) {
        const { body } = await me(`Bearer ${token}`).expectStatus(401);
        assert.equal(body.errors[0].code, 'INVALID_BEARER_TOKEN');
      }
    } finally {
      await db.knex('user_sessions').where({ token: sessionToken }).del();
    }
  });

  it("has no HTTP routes of Better Auth's own", async function () {
    await agent.loginAsOwner();

    await agent.post('auth/api-key/create').body({}).expectStatus(404);
    await agent.get('auth/api-key/list').expectStatus(404);
  });

  it('never falls back to the session cookie', async function () {
    await agent.loginAsOwner();

    await me('Bearer ghost_pat_unknown').expectStatus(401);
  });

  it('rate limits each token', async function () {
    const { id, key } = await createToken(owner.id);
    await tokenRow(id).update({ rate_limit_max: 1 });

    await me(`Bearer ${key}`).expectStatus(200);
    const { body } = await me(`Bearer ${key}`).expectStatus(429);
    assert.equal(body.errors[0].code, 'BEARER_TOKEN_RATE_LIMITED');
  });
});
