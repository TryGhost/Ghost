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

/** The migrations that give segments slugs, in the order they run. */
const migrations: Migration[] = [
  'add-slug-to-segments',
  'backfill-segment-slugs',
  'make-segment-slugs-required',
  'add-unique-index-to-segment-slugs',
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

/** Adds a segment to the table as it is, without a slug unless `slug` is given. */
const insert = (name: string, position: number, slug?: string) =>
  db.knex('segments').insert({
    id: ObjectID().toHexString(),
    name,
    ...(slug === undefined ? {} : { slug }),
    filter: 'status:free',
    sort_order: position,
    created_at: '2026-11-24 10:00:00',
    updated_at: '2026-11-24 10:00:00',
  });

/** Whether the segments table has the unique index over its slugs. */
const hasSlugIndex = async (): Promise<boolean> => {
  const [indexes]: [{ Key_name: string }[]] = await db.knex.raw('SHOW INDEX FROM segments');
  return indexes.some(({ Key_name: name }) => name === 'segments_slug_unique');
};

/** Each segment's name and slug, in the order the segments API lists them. */
const slugs = async (): Promise<[string, string][]> =>
  (
    await db
      .knex('segments')
      .select('name', 'slug')
      .orderBy([{ column: 'sort_order' }, { column: 'created_at' }, { column: 'id' }])
  ).map(({ name, slug }: { name: string; slug: string }) => [name, slug]);

describe('Migrations: segment slugs', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup());

  // Each test starts from the table as it was before segments had slugs.
  beforeEach(async function () {
    await db.knex('segments').del();
    if (await db.knex.schema.hasColumn('segments', 'slug')) {
      await rollBack();
    }
  });

  it('mints a slug for each segment, in their saved order', async function () {
    await insert('All paid!', 1);
    await insert('All paid', 0);
    await insert('Café crème', 2);
    await insert('2024', 3);
    await insert('Null', 4);
    await insert('🎉', 5);
    await insert(`${'a'.repeat(185)} bcdef`, 6);

    await migrate();

    assert.deepEqual(await slugs(), [
      ['All paid', 'all-paid'],
      ['All paid!', 'all-paid-2'],
      ['Café crème', 'cafe-creme'],
      ['2024', 'segment-2024'],
      ['Null', 'segment-null'],
      ['🎉', 'segment'],
      [`${'a'.repeat(185)} bcdef`, 'a'.repeat(185)],
    ]);
  });

  it('makes the slug required, unique and in the format the service mints', async function () {
    await insert('VIP', 0);
    await migrate();

    await assert.rejects(insert('Gold', 1), /slug/);
    await assert.rejects(insert('Gold', 1, 'vip'), /Duplicate entry/);
    await assert.rejects(insert('Gold', 1, 'Gold'), /Check constraint/);
  });

  it('adds the unique index when the column already exists without it', async function () {
    // The column is added, and nothing after it has run
    await run(migrations[0], 'up');
    await insert('VIP', 0);
    assert.equal(await hasSlugIndex(), false);

    await migrate();

    assert.equal(await hasSlugIndex(), true);
    await assert.rejects(insert('Gold', 1, 'vip'), /Duplicate entry/);
  });

  it('keeps a slug a segment already has, and mints around it', async function () {
    await run(migrations[0], 'up');
    await insert('All paid', 0);
    await insert('Gold', 1, 'all-paid');

    await run(migrations[1], 'up');
    await run(migrations[2], 'up');

    assert.deepEqual(await slugs(), [
      ['All paid', 'all-paid-2'],
      ['Gold', 'all-paid'],
    ]);
  });

  it('gives a segment whose name mints only taken slugs a slug made from its id', async function () {
    await run(migrations[0], 'up');
    // Every slug the name "X" mints is taken: `x`, then `x-2` to `x-1000`
    const taken = Array.from({ length: 1000 }, (_, index) => ({
      id: ObjectID().toHexString(),
      name: `Taken ${index + 1}`,
      slug: index === 0 ? 'x' : `x-${index + 1}`,
      filter: 'status:free',
      sort_order: index,
      created_at: '2026-11-24 10:00:00',
      updated_at: '2026-11-24 10:00:00',
    }));
    await db.knex.batchInsert('segments', taken, 500);
    const id = ObjectID().toHexString();
    await db.knex('segments').insert({
      id,
      name: 'X',
      filter: 'status:free',
      sort_order: 1000,
      created_at: '2026-11-24 10:00:00',
      updated_at: '2026-11-24 10:00:00',
    });

    await run(migrations[1], 'up');

    const { slug } = await db.knex('segments').where({ id }).first('slug');
    assert.equal(slug, `segment-${id}`);
  });

  it('changes nothing when it runs again', async function () {
    await insert('VIP', 0);
    await insert('Free', 1);
    await migrate();
    const minted = await slugs();

    await migrate();

    assert.deepEqual(await slugs(), minted);
  });

  it('removes the slugs when rolled back', async function () {
    await insert('VIP', 0);
    await migrate();

    await rollBack();

    assert.equal(await db.knex.schema.hasColumn('segments', 'slug'), false);
    assert.equal(await hasSlugIndex(), false);
    assert.deepEqual(await db.knex('segments').pluck('name'), ['VIP']);
  });
});
