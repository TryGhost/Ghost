import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import ObjectId from 'bson-objectid';
import { knex } from '../../../core/server/data/db';
import config from '../../../core/shared/config';
import urlUtils from '../../../core/shared/url-utils';
import { createAuth } from '../../../core/server/auth/better-auth/create-auth';
import { reconcileCredentialPasswords } from '../../../core/server/auth/better-auth/credential-passwords';
import { seedCredentialAccounts } from '../../../core/server/auth/better-auth/seed-credential-accounts';

const models = require('../../../core/server/models');
const passwordreset = require('../../../core/server/auth/passwordreset');
const dataImporter = require('../../../core/server/data/importer/importers/data');
// @ts-expect-error Test utilities do not have type definitions.
import testUtils from '../../utils';
const { exportedBodyV5 } = require('../../utils/fixtures/export/body-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(knex.client.config.client);

const NEW_PASSWORD = 'Correct-horse-battery-9';
const internal = { context: { internal: true } };

async function hashes(userId: string) {
  const user = await knex('users').where('id', userId).first('password');
  const account = await knex('user_accounts')
    .where({ user_id: userId, provider_id: 'credential' })
    .first('password');
  return { users: user?.password as string, accounts: account?.password as string | undefined };
}

async function assertInSync(userId: string, password: string) {
  const { users, accounts } = await hashes(userId);
  assert.equal(accounts, users, 'users.password and the credential hash differ');
  assert.ok(await security.password.compare(password, users));
}

// Fails every write to `table` until dropped
async function failWrites(table: string) {
  for (const event of ['INSERT', 'UPDATE']) {
    await knex.raw(
      `CREATE TRIGGER ?? BEFORE ${event} ON ?? FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced failure'`,
      [`fail_${table}_${event.toLowerCase()}`, table],
    );
  }
}

async function dropFailures() {
  for (const table of ['users', 'user_accounts']) {
    for (const event of ['insert', 'update']) {
      await knex.raw('DROP TRIGGER IF EXISTS ??', [`fail_${table}_${event}`]);
    }
  }
}

function build() {
  return createAuth({
    db: knex,
    secret: 'a'.repeat(64),
    sessionMaxAgeMs: config.get('admin:sessionMaxAgeMs'),
    urlUtils,
    password: security.password,
    logger: { debug() {}, info() {}, warn() {}, error() {} },
  });
}

async function signInBothEngines(email: string, password: string) {
  await models.User.check({ email, password });
  const result = await build().api.signInEmail({ body: { email, password } });
  assert.ok(result.token);
}

async function betterAuthSessionHeaders(email: string, password: string) {
  const { headers } = await build().api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const cookie = headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  return new Headers({ cookie });
}

describe.skipIf(isSQLite)('Credential password dual write', function () {
  const owner = testUtils.DataGenerator.Content.users[0];

  beforeEach(testUtils.teardownDb);
  beforeEach(testUtils.setup('users:roles'));
  beforeEach(async function () {
    await seedCredentialAccounts(knex);
  });
  afterEach(dropFailures);

  describe('legacy', function () {
    it('changing a password writes both hashes', async function () {
      await models.User.changePassword(
        { user_id: owner.id, oldPassword: owner.password, newPassword: NEW_PASSWORD },
        { context: { user: owner.id } },
      );

      await assertInSync(owner.id, NEW_PASSWORD);
    });

    it('resetting a password writes both hashes', async function () {
      const dbHash = (await knex('settings').where('key', 'db_hash').first('value')).value;
      const settingsAPI = { read: async () => ({ settings: [{ value: dbHash }] }) };
      const { resetToken } = await passwordreset.generateToken(owner.email, settingsAPI);
      const tokenParts = security.tokens.resetToken.extract({ token: resetToken });

      await passwordreset.doReset(
        {
          ...internal,
          data: {
            password_reset: [
              { token: resetToken, newPassword: NEW_PASSWORD, ne2Password: NEW_PASSWORD },
            ],
          },
        },
        tokenParts,
        settingsAPI,
      );

      await assertInSync(owner.id, NEW_PASSWORD);
    });

    it('setup writes both hashes', async function () {
      await models.User.setup(
        { name: 'Owner', email: owner.email, password: NEW_PASSWORD, blogTitle: 'Blog' },
        { ...internal, id: owner.id },
      );

      await assertInSync(owner.id, NEW_PASSWORD);
    });

    it('creates the credential row when it is missing', async function () {
      await knex('user_accounts').where('user_id', owner.id).del();

      await models.User.changePassword(
        { user_id: owner.id, oldPassword: owner.password, newPassword: NEW_PASSWORD },
        { context: { user: owner.id } },
      );

      await assertInSync(owner.id, NEW_PASSWORD);
    });

    it('importing a user writes both hashes', async function () {
      const hash = await security.password.hash(NEW_PASSWORD);
      const exportData = exportedBodyV5().db[0];
      const user = testUtils.DataGenerator.forKnex.createUser({
        email: 'import-dual-write@ghost.org',
        slug: 'import-dual-write',
        password: hash,
      });
      exportData.data.users = [user];

      await dataImporter.doImport(exportData, { importPersistUser: true });

      const imported = await knex('users').where('email', user.email).first('id');
      assert.ok(imported);
      await assertInSync(imported.id, NEW_PASSWORD);
    });

    it('a failed credential write rolls back the password change', async function () {
      const before = await hashes(owner.id);
      await failWrites('user_accounts');

      await assert.rejects(
        models.User.changePassword(
          { user_id: owner.id, oldPassword: owner.password, newPassword: NEW_PASSWORD },
          { context: { user: owner.id } },
        ),
        /forced failure/,
      );

      await dropFailures();
      assert.deepEqual(await hashes(owner.id), before);
      await signInBothEngines(owner.email, owner.password);
    });
  });

  describe('better-auth', function () {
    it('changing a password reaches users.password', async function () {
      const headers = await betterAuthSessionHeaders(owner.email, owner.password);

      await build().api.changePassword({
        body: { currentPassword: owner.password, newPassword: NEW_PASSWORD },
        headers,
      });

      await assertInSync(owner.id, NEW_PASSWORD);
      await signInBothEngines(owner.email, NEW_PASSWORD);
    });

    it('resetting a password reaches users.password', async function () {
      const now = new Date();
      await knex('verifications').insert({
        id: new ObjectId().toHexString(),
        identifier: 'reset-password:dual-write-token',
        value: owner.id,
        expires_at: new Date(now.getTime() + 60_000),
        created_at: now,
        updated_at: now,
      });

      await build().api.resetPassword({
        body: { token: 'dual-write-token', newPassword: NEW_PASSWORD },
      });

      await assertInSync(owner.id, NEW_PASSWORD);
    });

    it('a failed users write rolls back the password change', async function () {
      const headers = await betterAuthSessionHeaders(owner.email, owner.password);
      const before = await hashes(owner.id);
      await failWrites('users');

      await assert.rejects(
        build().api.changePassword({
          body: { currentPassword: owner.password, newPassword: NEW_PASSWORD },
          headers,
        }),
      );

      await dropFailures();
      assert.deepEqual(await hashes(owner.id), before);
      await signInBothEngines(owner.email, owner.password);
    });
  });

  describe('boot reconciliation', function () {
    async function seedMismatch() {
      const stale = await security.password.hash('Stale-password-123');
      await knex('user_accounts')
        .where({ user_id: owner.id, provider_id: 'credential' })
        .update({ password: stale });
      return stale;
    }

    it('copies users.password under legacy', async function () {
      await seedMismatch();

      await reconcileCredentialPasswords(knex, 'legacy');

      await assertInSync(owner.id, owner.password);
    });

    it('copies the credential hash under better-auth', async function () {
      await seedMismatch();

      await reconcileCredentialPasswords(knex, 'better-auth');

      await assertInSync(owner.id, 'Stale-password-123');
    });

    it('leaves matching users alone', async function () {
      const before = await knex('user_accounts').select('id', 'password', 'updated_at');

      await reconcileCredentialPasswords(knex, 'legacy');

      assert.deepEqual(await knex('user_accounts').select('id', 'password', 'updated_at'), before);
    });
  });
});
