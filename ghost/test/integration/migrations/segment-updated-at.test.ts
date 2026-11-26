import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ObjectID from 'bson-objectid';

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

type Migration = ReturnType<typeof loadMigration>;

/** The migrations that make every segment's `updated_at` a time, in the order they run. */
const migrations: Migration[] = [
  'backfill-segment-updated-at',
  'make-segment-updated-at-required',
].map(loadMigration);

/** Runs one step of `migration` as knex-migrator does: in a transaction when it asks for one. */
const run = (migration: Migration, step: 'up' | 'down') =>
  migration.config.transaction
    ? db.knex.transaction((transacting: unknown) => migration[step]({ transacting }))
    : migration[step]({ connection: db.knex });

async function migrate() {
  for (const migration of migrations) {
    await run(migration, 'up');
  }
}

async function rollBack() {
  for (const migration of [...migrations].reverse()) {
    await run(migration, 'down');
  }
}

const CREATED_AT = '2026-11-24 10:00:00';

/** Adds a segment to the table as it is, added at `CREATED_AT` and last edited at `updatedAt`. */
const insert = (name: string, updatedAt: string | null) =>
  db.knex('segments').insert({
    id: ObjectID().toHexString(),
    name,
    slug: name.toLowerCase(),
    filter: 'status:free',
    sort_order: 0,
    created_at: CREATED_AT,
    updated_at: updatedAt,
  });

type StoredTimes = { name: string; created_at: Date; updated_at: Date | null };

/** Each segment's name with its times as ISO 8601 text, in name order. */
const times = async (): Promise<[string, string, string | null][]> =>
  (await db.knex('segments').select('name', 'created_at', 'updated_at').orderBy('name')).map(
    ({ name, created_at: created, updated_at: updated }: StoredTimes) => [
      name,
      created.toISOString(),
      updated?.toISOString() ?? null,
    ],
  );

describe('Migrations: segment updated_at', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup());

  // Each test starts from the table as it was when `updated_at` could be null.
  beforeEach(async function () {
    await db.knex('segments').del();
    await rollBack();
  });

  // Leaves the table as the schema defines it for the suites that run after this one.
  afterAll(async function () {
    await db.knex('segments').del();
    await migrate();
  });

  it("gives each segment never renamed its created_at, and keeps a renamed segment's time", async function () {
    await insert('Gold', null);
    await insert('VIP', '2026-11-25 09:30:00');

    await migrate();

    assert.deepEqual(await times(), [
      ['Gold', '2026-11-24T10:00:00.000Z', '2026-11-24T10:00:00.000Z'],
      ['VIP', '2026-11-24T10:00:00.000Z', '2026-11-25T09:30:00.000Z'],
    ]);
  });

  it('makes updated_at required', async function () {
    await migrate();

    await assert.rejects(insert('Gold', null), /updated_at/);
  });

  it('changes nothing when it runs again', async function () {
    await insert('Gold', null);
    await migrate();
    const set = await times();

    await migrate();

    assert.deepEqual(await times(), set);
  });

  it('keeps the times when rolled back, with updated_at nullable again', async function () {
    await insert('Gold', null);
    await migrate();

    await rollBack();

    await insert('VIP', null);
    assert.deepEqual(await times(), [
      ['Gold', '2026-11-24T10:00:00.000Z', '2026-11-24T10:00:00.000Z'],
      ['VIP', '2026-11-24T10:00:00.000Z', null],
    ]);
  });
});
