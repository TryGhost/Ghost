import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');

const VERSIONS = path.join(__dirname, '../../../core/server/data/migrations/versions');

function loadMigration(slug: string) {
  const [file] = fs
    .readdirSync(VERSIONS)
    .flatMap((version) =>
      fs
        .readdirSync(path.join(VERSIONS, version))
        .map((name) => path.join(VERSIONS, version, name)),
    )
    .filter((candidate) => candidate.endsWith(`-${slug}.ts`));
  assert.ok(file, `finds the ${slug} migration`);
  return require(file).default;
}

const backfill = loadMigration('backfill-credential-accounts');

const run = (step: 'up' | 'down', migration: typeof backfill) =>
  db.knex.transaction((transacting: unknown) => migration[step]({ transacting }));

const credentials = async (): Promise<Record<string, string>> =>
  Object.fromEntries(
    (
      await db
        .knex('user_accounts')
        .where({ provider_id: 'credential' })
        .select('account_id', 'password')
    ).map((row: { account_id: string; password: string }) => [row.account_id, row.password]),
  );

const passwords = async (): Promise<Record<string, string>> =>
  Object.fromEntries(
    (await db.knex('users').select('id', 'password')).map(
      (row: { id: string; password: string }) => [row.id, row.password],
    ),
  );

describe('Credential backfill migrations', function () {
  let hashes: Record<string, string>;

  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    await testUtils.teardownDb();
    await testUtils.setup('users:roles')();
    // As before the tables graduated: hashes in users.password, no credential rows
    hashes = await credentials();
    await Promise.all(
      Object.entries(hashes).map(([id, password]) =>
        db.knex('users').where({ id }).update({ password }),
      ),
    );
    await db.knex('user_accounts').del();
  });

  it('copies every hash into a credential row, once', async function () {
    assert.ok(Object.keys(hashes).length > 1);

    await run('up', backfill);
    await run('up', backfill);

    assert.deepEqual(await credentials(), hashes);
    const rows = await db.knex('user_accounts').select('user_id', 'account_id');
    assert.equal(rows.length, Object.keys(hashes).length);
    for (const row of rows) {
      assert.equal(row.account_id, row.user_id);
    }
    // users.password stays as it was, for a release that still reads it
    assert.deepEqual(await passwords(), hashes);
  });

  it('keeps a credential row that already exists', async function () {
    const [existing] = Object.keys(hashes);
    const newer = '$2a$10$newernewernewernewernewernewernewernewernewernewerne';
    await db.knex('user_accounts').insert({
      id: 'a00000000000000000000001',
      user_id: existing,
      account_id: existing,
      provider_id: 'credential',
      password: newer,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await run('up', backfill);

    assert.deepEqual(await credentials(), { ...hashes, [existing]: newer });
    const kept = await db.knex('user_accounts').where({ account_id: existing });
    assert.equal(kept.length, 1);
    assert.equal(kept[0].id, 'a00000000000000000000001');
  });

  it('skips a user without a password', async function () {
    const [id] = Object.keys(hashes);
    await db.knex('users').where({ id }).update({ password: '!' });

    await run('up', backfill);

    assert.equal((await credentials())[id], undefined);
    assert.equal((await passwords())[id], '!');
  });

  it('copies changed hashes back into users.password when rolled back', async function () {
    await run('up', backfill);
    const [changed, unchanged, placeholder] = Object.keys(hashes);
    assert.ok(placeholder, 'has a third user');
    await db.knex('users').where({ id: changed }).update({ password: '!' });
    await db.knex('user_accounts').where({ account_id: placeholder }).update({ password: '!' });
    await db
      .knex('user_accounts')
      .where({ account_id: changed })
      .update({ password: '$2a$10$changedchangedchangedchangedchangedchangedchangedcha' });

    await run('down', backfill);
    await run('down', backfill);

    const after = await passwords();
    assert.equal(after[changed], '$2a$10$changedchangedchangedchangedchangedchangedchangedcha');
    assert.equal(after[unchanged], hashes[unchanged]);
    // A placeholder credential never overwrites a real hash
    assert.equal(after[placeholder], hashes[placeholder]);
  });
});
