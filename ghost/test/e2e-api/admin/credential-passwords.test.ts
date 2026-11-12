import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import { BASE_PATH, createAuth } from '../../../core/server/auth/better-auth/create-auth';
import { PASSWORD_PLACEHOLDER } from '../../../core/server/auth/better-auth/credential-password';

const {
  agentProvider,
  fixtureManager,
  configUtils,
  resetRateLimits,
} = require('../../utils/e2e-framework');
const { mockMail, restore } = require('../../utils/e2e-framework-mock-manager');
const db = require('../../../core/server/data/db');
const dataImporter = require('../../../core/server/data/importer/importers/data');
const urlUtils = require('../../../core/shared/url-utils').default;
const DataGenerator = require('../../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

type Agent = {
  get(path: string): any;
  post(path: string): any;
  put(path: string): any;
  loginAs(email: string, password: string): Promise<unknown>;
  loginAsOwner(): Promise<void>;
  clearCookies(): void;
};

// Never blocks; the rate limits have their own tests
const allow = () => ({ consume: async () => ({ allowed: true as const }), reset: async () => {} });

// Better Auth isn't mounted under legacy, so its native routes run on an instance of its own
function betterAuth() {
  const auth = createAuth({
    db: db.knex,
    secret: 'a'.repeat(64),
    sessionMaxAgeMs: configUtils.config.get('admin:sessionMaxAgeMs'),
    urlUtils,
    password: security.password,
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    limiters: { globalBlock: allow, globalReset: allow, userLogin: allow, userReset: allow },
    sendPasswordResetEmail: async () => {},
  });
  const origin = urlUtils.getAdminOrigin();

  const post = (path: string, body: object, cookie?: string) =>
    auth.handler(
      new Request(`${origin}${BASE_PATH}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      }),
    );

  return {
    signIn: (email: string, password: string) => post('/sign-in/email', { email, password }),
    async changePassword(email: string, currentPassword: string, newPassword: string) {
      const signedIn = await post('/sign-in/email', { email, password: currentPassword });
      assert.equal(signedIn.status, 200);
      const cookie = signedIn.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
      const changed = await post('/change-password', { currentPassword, newPassword }, cookie);
      assert.equal(changed.status, 200);
    },
  };
}

async function credentialHash(id: string): Promise<string | undefined> {
  const row = await db
    .knex('user_accounts')
    .where({ provider_id: 'credential', account_id: id })
    .first('user_id', 'password');
  assert.equal(row?.user_id, id);
  return row?.password;
}

async function userId(email: string): Promise<string> {
  const user = await db.knex('users').where({ email }).first('id');
  assert.ok(user, `no user ${email}`);
  return user.id;
}

/** The credential row has the hash, users.password the placeholder, and both engines sign in */
async function assertPasswordInCredentialRow(agent: Agent, email: string, password: string) {
  const id = await userId(email);
  assert.equal(await security.password.compare(password, (await credentialHash(id)) ?? ''), true);
  const user = await db.knex('users').where({ id }).first('password');
  assert.equal(user.password, PASSWORD_PLACEHOLDER);

  // Throws unless POST /session succeeds
  await agent.loginAs(email, password);
  agent.clearCookies();

  const response = await betterAuth().signIn(email, password);
  assert.equal(response.status, 200);
}

describe.skipIf(isSQLite)('Legacy passwords in user_accounts', function () {
  let agent: Agent;
  let mail: { getSentEmail(): { text: string } };

  beforeEach(async function () {
    mail = mockMail();
    await resetRateLimits();
  });

  afterEach(function () {
    restore();
  });

  async function requestResetToken(email: string) {
    await agent
      .post('authentication/password_reset')
      .body({ password_reset: [{ email }] })
      .expectStatus(200);
    const link = mail.getSentEmail().text.match(/\/reset\/([^/]+)\//);
    assert.ok(link, 'the email should contain a password reset link');
    return link[1];
  }

  const redeemResetToken = (token: string, newPassword: string) =>
    agent.put('authentication/password_reset').body({
      password_reset: [{ token, newPassword, ne2Password: newPassword }],
    });

  describe('setup', function () {
    beforeAll(async function () {
      agent = await agentProvider.getAdminAPIAgent();
    });

    it('stores the owner password in the credential row', async function () {
      const email = 'setup-owner@example.com';
      const password = 'thisissupersafe';

      await agent
        .post('authentication/setup')
        .body({ setup: [{ name: 'Owner', email, password, blogTitle: 'A blog' }] })
        .expectStatus(201);

      await assertPasswordInCredentialRow(agent, email, password);
    });
  });

  describe('invitation', function () {
    beforeAll(async function () {
      agent = await agentProvider.getAdminAPIAgent();
      await fixtureManager.init('invites');
    });

    it('creates the new user with a credential row', async function () {
      const invite = fixtureManager.get('invites', 0);
      const password = 'invited-user-1234';

      await agent
        .post('authentication/invitation')
        .body({
          invitation: [{ token: invite.token, password, email: invite.email, name: 'Invited' }],
        })
        .expectStatus(200);

      await assertPasswordInCredentialRow(agent, invite.email, password);
    });
  });

  describe('import', function () {
    beforeAll(async function () {
      agent = await agentProvider.getAdminAPIAgent();
      await fixtureManager.init('users');
    });

    it('keeps an imported hash in the credential row with importPersistUser', async function () {
      const email = 'imported@example.com';
      const password = 'imported-user-1234';
      const exportData = {
        meta: { version: '6.0.0' },
        data: {
          users: [
            DataGenerator.forKnex.createUser({
              email,
              slug: 'imported',
              password: await security.password.hash(password),
            }),
          ],
        },
      };

      await dataImporter.doImport(exportData, { importPersistUser: true });

      await assertPasswordInCredentialRow(agent, email, password);
    });

    it('locks other imported users with a random password in the credential row', async function () {
      const email = 'imported-locked@example.com';
      const exportData = {
        meta: { version: '6.0.0' },
        data: {
          users: [DataGenerator.forKnex.createUser({ email, slug: 'imported-locked' })],
        },
      };

      await dataImporter.doImport(exportData, {});

      const id = await userId(email);
      assert.match((await credentialHash(id)) ?? '', /^\$2[ayb]\$/);
      const user = await db.knex('users').where({ id }).first('password', 'status');
      assert.equal(user.password, PASSWORD_PLACEHOLDER);
      assert.equal(user.status, 'locked');
    });
  });

  describe('password changes and resets', function () {
    const owner = DataGenerator.Content.users[0];
    let password: string;

    beforeAll(async function () {
      agent = await agentProvider.getAdminAPIAgent();
      await fixtureManager.init('users');
      password = owner.password;
    });

    async function changePasswordThroughLegacy(newPassword: string) {
      await agent.loginAs(owner.email, password);
      await agent
        .put('users/password/')
        .body({
          password: [
            {
              user_id: owner.id,
              oldPassword: password,
              newPassword,
              ne2Password: newPassword,
            },
          ],
        })
        .expectStatus(200);
      agent.clearCookies();
      password = newPassword;
    }

    it('stores a changed password in the credential row', async function () {
      await changePasswordThroughLegacy('changed-through-legacy-1');

      await assertPasswordInCredentialRow(agent, owner.email, password);
    });

    it('stores a reset password in the credential row', async function () {
      const token = await requestResetToken(owner.email);
      const newPassword = 'reset-through-legacy-1';

      await redeemResetToken(token, newPassword).expectStatus(200);
      agent.clearCookies();
      password = newPassword;

      await assertPasswordInCredentialRow(agent, owner.email, password);
    });

    it('signs in through legacy with a password changed through Better Auth', async function () {
      const newPassword = 'changed-through-better-auth-1';
      await betterAuth().changePassword(owner.email, password, newPassword);
      password = newPassword;

      await assertPasswordInCredentialRow(agent, owner.email, password);
    });

    it('invalidates a reset link when the password changes through legacy', async function () {
      const token = await requestResetToken(owner.email);
      await changePasswordThroughLegacy('changed-through-legacy-2');

      const { body } = await redeemResetToken(token, 'never-applied-1234').expectStatus(400);
      assert.equal(body.errors[0].context, 'Password reset link has already been used.');
    });

    it('invalidates a reset link when the password changes through Better Auth', async function () {
      const token = await requestResetToken(owner.email);
      const newPassword = 'changed-through-better-auth-2';
      await betterAuth().changePassword(owner.email, password, newPassword);
      password = newPassword;

      const { body } = await redeemResetToken(token, 'never-applied-1234').expectStatus(400);
      assert.equal(body.errors[0].context, 'Password reset link has already been used.');
      await assertPasswordInCredentialRow(agent, owner.email, password);
    });
  });
});
