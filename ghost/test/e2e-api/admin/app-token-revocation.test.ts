import assert from 'node:assert/strict';
import { generateTestAppKeys, type TestAppKeys } from '../../utils/app-identity';
import { insertTestInstallation } from '../../utils/app-installations';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';
import { passwordHashOf } from '../../utils/password-hash';
import * as security from '@tryghost/security';

const models = require('../../../core/server/models');
const settingsCache = require('../../../core/shared/settings-cache');
const configUtils = require('../../utils/config-utils');

// Apps get tokens from Better Auth's OAuth provider, registered only under its engine and only
// when the apps flag is on at boot
const appTokensAtBoot =
  configUtils.config.get('auth:engine') === 'better-auth' &&
  configUtils.config.get('labs:apps') === true;

describe.skipIf(!appTokensAtBoot)('App tokens on security events', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>> & {
    loginAsOwner(): Promise<void>;
    put(path: string): any;
    post(path: string): any;
    delete(path: string): any;
  };
  let keys: TestAppKeys;
  let installationId: string;
  const knex = () => models.Base.knex;
  const auth = () => require('../../../core/server/auth');
  const user = (index: number) => fixtureManager.get('users', index);
  const OWNER = 0;
  const ADMIN = 1;
  const EDITOR = 2;

  /** A token for the user, bound to a staff session of theirs, as an app session issues one. */
  async function tokenFor(userId: string) {
    let session = await knex()('user_sessions').where({ user_id: userId }).first();
    if (!session) {
      await auth().staffSessions.createVerifiedSession(userId);
      session = await knex()('user_sessions').where({ user_id: userId }).first();
    }
    await auth().appTokens.reconcileClient({
      id: installationId,
      active: true,
      scopes: ['post:browse'],
    });
    const issued = await auth().appTokens.issue({
      installationId,
      userId,
      sessionId: session.id,
      scopes: ['post:browse'],
    });
    assert.ok('accessToken' in issued, `refused: ${JSON.stringify(issued)}`);
    // Cut loose from its staff session, so ending sessions can't cascade to it and only an
    // explicit delete removes it
    await knex()('oauth_access_tokens').where({ user_id: userId }).update({ session_id: null });
    assert.ok((await tokenRowsOf(userId)) > 0);
    return issued.accessToken as string;
  }

  async function tokenRowsOf(userId: string) {
    return (await knex()('oauth_access_tokens').where({ user_id: userId })).length;
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    keys = await generateTestAppKeys();
    installationId = await insertTestInstallation(knex(), { scopes: ['post:browse'], keys });
    // Once: sign-ins are rate limited
    await agent.loginAsOwner();
    assert.equal(auth().appTokens.availability(), 'ready');
  });

  it("deletes a user's app tokens when they are suspended", async function () {
    const adminId = user(ADMIN).id;
    const token = await tokenFor(adminId);

    await agent
      .put(`users/${adminId}/`)
      .body({ users: [{ status: 'inactive' }] })
      .expectStatus(200);

    assert.equal(await tokenRowsOf(adminId), 0);
    assert.equal(await auth().appTokens.validate(token), null);
  });

  it("deletes a user's app tokens when they are deleted", async function () {
    const editorId = user(EDITOR).id;
    await tokenFor(editorId);

    await agent.delete(`users/${editorId}/`).expectStatus(204);

    assert.equal(await tokenRowsOf(editorId), 0);
  });

  it("deletes a user's app tokens when their password changes", async function () {
    const ownerId = user(OWNER).id;
    const token = await tokenFor(ownerId);

    await agent
      .put('users/password/')
      .body({
        password: [
          {
            newPassword: 'Sl1m3rson99-apps!',
            ne2Password: 'Sl1m3rson99-apps!',
            oldPassword: user(OWNER).password,
            user_id: ownerId,
          },
        ],
      })
      .expectStatus(200);

    assert.equal(await tokenRowsOf(ownerId), 0);
    assert.equal(await auth().appTokens.validate(token), null);
  });

  it("deletes a user's app tokens when they reset their password with an emailed token", async function () {
    const ownerId = user(OWNER).id;
    const token = await tokenFor(ownerId);
    const owner = await models.User.findOne({ id: ownerId }, { context: { internal: true } });
    const resetToken = security.tokens.resetToken.generateHash({
      expires: Date.now() + 24 * 60 * 60 * 1000,
      email: owner.get('email'),
      dbHash: settingsCache.get('db_hash'),
      passwordHash: await passwordHashOf(owner),
    });

    await agent
      .put('authentication/password_reset/')
      .body({
        password_reset: [
          {
            token: security.url.encodeBase64(resetToken),
            newPassword: 'Sl1m3rson99-reset!',
            ne2Password: 'Sl1m3rson99-reset!',
          },
        ],
      })
      .expectStatus(200);

    assert.equal(await tokenRowsOf(ownerId), 0);
    assert.equal(await auth().appTokens.validate(token), null);
  });

  // Last: it ends every session, the Owner's included
  it('deletes every app token on an authentication reset', async function () {
    await tokenFor(user(OWNER).id);

    await agent.post('authentication/reset/').expectStatus(200);

    assert.equal((await knex()('oauth_access_tokens')).length, 0);
  });
});
