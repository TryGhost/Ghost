import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import { seedCredentialAccounts } from '../../../core/server/auth/better-auth/seed-credential-accounts';

const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');

type Credential = { user_id: string; account_id: string; password: string | null };

async function credentials(): Promise<Credential[]> {
  return db
    .knex('user_accounts')
    .where('provider_id', 'credential')
    .select('user_id', 'account_id', 'password');
}

describe('seedCredentialAccounts', function () {
  let users: { id: string; password: string }[];
  let bootRows: Credential[];

  function assertOneCredentialPerUser(rows: Credential[]) {
    assert.equal(rows.length, users.length);
    for (const user of users) {
      const row = rows.find((r) => r.user_id === user.id);
      assert(row, `user ${user.id} has no credential row`);
      assert.equal(row.account_id, user.id);
      assert.equal(row.password, user.password);
    }
  }

  beforeAll(async function () {
    await testUtils.startGhost();
    users = await db.knex('users').select('id', 'password');
    assert(users.length > 1, 'fixtures should provide more than one user');
    bootRows = await credentials();
  });

  beforeEach(async function () {
    await db.knex('user_accounts').del();
  });

  it('runs at boot', function () {
    assertOneCredentialPerUser(bootRows);
  });

  it('creates one credential row per user from users.password', async function () {
    await seedCredentialAccounts(db.knex);

    assertOneCredentialPerUser(await credentials());
  });

  it('adds nothing on a second run and keeps existing rows', async function () {
    const [kept] = users;
    const now = new Date();
    await db.knex('user_accounts').insert({
      id: new ObjectId().toHexString(),
      user_id: kept.id,
      account_id: kept.id,
      provider_id: 'credential',
      password: 'kept',
      created_at: now,
      updated_at: now,
    });

    await seedCredentialAccounts(db.knex);
    await seedCredentialAccounts(db.knex);

    const rows = await credentials();
    assert.equal(rows.length, users.length);
    assert.equal(rows.find((r) => r.user_id === kept.id)?.password, 'kept');
  });
});
