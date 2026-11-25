import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import createKnex, { type Knex } from 'knex';

// The migration suites run against MySQL. This covers what the migration does differently on
// SQLite: how the database reports a name that is taken, and what it counts as the same name.
// It also covers the roll backs the migration rejects itself. MySQL in strict mode rejects a
// value that is too long before the migration's own check can be told apart from it.

const VERSIONS = path.join(__dirname, '../../../../../core/server/data/migrations/versions');

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

const migration = loadMigration('move-saved-member-views-to-segments');

const memberView = (name: string, filter: string) => ({
  name,
  route: 'members',
  filter: { filter },
});

describe('Migration on SQLite: move saved member views to segments', function () {
  let knex: Knex;

  const run = (step: 'up' | 'down') =>
    knex.transaction((transacting) => migration[step]({ transacting }));

  const store = (value: string) =>
    knex('settings').where({ key: 'shared_views' }).update({ value });

  const stored = async (): Promise<string> =>
    (await knex('settings').where({ key: 'shared_views' }).first('value')).value;

  const segmentNames = async (): Promise<string[]> =>
    knex('segments').orderBy('sort_order').pluck('name');

  beforeEach(async function () {
    knex = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await knex.schema.createTable('settings', (table) => {
      table.string('id', 24).notNullable().primary();
      table.string('group', 50).notNullable();
      table.string('key', 50).notNullable().unique();
      table.text('value').nullable();
    });
    await knex.schema.createTable('actions', (table) => {
      table.string('id', 24).notNullable().primary();
      table.string('resource_id', 24).nullable();
      table.string('resource_type', 50).notNullable();
      table.string('event', 50).notNullable();
      table.text('context').nullable();
    });
    await knex.schema.createTable('segments', (table) => {
      table.string('id', 24).notNullable().primary();
      table.string('name', 191).notNullable().unique();
      table.text('filter').notNullable();
      table.integer('sort_order').notNullable().defaultTo(0);
      table.dateTime('created_at').notNullable();
      table.dateTime('updated_at').nullable();
    });
    await knex('settings').insert({
      id: 'views',
      group: 'views',
      key: 'shared_views',
      value: '[]',
    });
  });

  afterEach(async function () {
    await knex.destroy();
  });

  it('numbers a name another view has, and keeps names that differ by case or accent', async function () {
    await store(
      JSON.stringify([
        memberView('Cafe', 'label:cafe'),
        memberView('Cafe', 'label:again'),
        memberView('Café', 'label:accent'),
        memberView('cafe', 'label:lower'),
      ]),
    );

    await run('up');

    // SQLite compares names byte by byte, so only the second "Cafe" is taken.
    assert.deepEqual(await segmentNames(), ['Cafe', 'Cafe (2)', 'Café', 'cafe']);
    assert.equal(await stored(), '[]');
  });

  it('moves the segments back to the setting when rolled back', async function () {
    const views = [memberView('VIP', 'label:vip'), memberView('Free', 'status:free')];
    await store(JSON.stringify(views));

    await run('up');
    await run('down');

    assert.deepEqual(await segmentNames(), []);
    assert.equal(await stored(), JSON.stringify(views));
  });

  it('rejects a roll back when the setting cannot be read as views', async function () {
    await store(JSON.stringify([memberView('VIP', 'label:vip')]));
    await run('up');
    await store('"not a list"');

    await assert.rejects(run('down'), /cannot be read as views/);

    assert.deepEqual(await segmentNames(), ['VIP']);
  });

  it('rejects a roll back when the segments are longer than the setting can hold', async function () {
    const posts = [{ name: 'Drafts', route: 'posts', filter: { type: 'draft' } }];
    await store(JSON.stringify(posts));
    // A segment's filter can be as long as the setting's whole value, so two of them don't fit.
    await knex('segments').insert(
      ['a', 'b'].map((name, index) => ({
        id: `${name}`.repeat(24),
        name,
        filter: `label:${name.repeat(40000)}`,
        sort_order: index,
        created_at: '2026-11-23 10:00:00',
      })),
    );

    await assert.rejects(run('down'), /cannot hold every segment/);

    assert.deepEqual(await segmentNames(), ['a', 'b']);
    assert.equal(await stored(), JSON.stringify(posts));
  });
});
