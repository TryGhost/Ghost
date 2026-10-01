import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'vitest';

const METAFIELDS_PATH = '../../../../../core/server/services/metafields';
const schema: {
  tables: Record<string, object>;
} = require('../../../../../core/server/data/schema');

const recordReference = { type: 'string', references: 'widgets.id' };

// Tables for an entity the schema would accept but whose metafields cannot be built: it
// ships no ceiling on its definitions. Listed after members, so members build first.
const WIDGET_TABLES = {
  widgets: { id: { type: 'string' } },
  widgets_metafields: { id: { type: 'string' } },
  widgets_metafield_values: { id: { type: 'string' }, widget_id: recordReference },
  widgets_metafield_change_events: { id: { type: 'string' }, widget_id: recordReference },
};

describe('metafields service', function () {
  let metafields: typeof import('../../../../../core/server/services/metafields');
  let previousModule: NodeModule | undefined;

  // init() keeps what it builds in module state, and the unit project shares the CommonJS
  // registry across files, so each test gets its own copy and the shared one is put back.
  beforeEach(function () {
    previousModule = require.cache[require.resolve(METAFIELDS_PATH)];
    delete require.cache[require.resolve(METAFIELDS_PATH)];
    metafields = require(METAFIELDS_PATH);
  });

  afterEach(function () {
    for (const table of Object.keys(WIDGET_TABLES)) {
      delete schema.tables[table];
    }
    delete require.cache[require.resolve(METAFIELDS_PATH)];
    if (previousModule) {
      require.cache[require.resolve(METAFIELDS_PATH)] = previousModule;
    }
  });

  it('serves nothing before init', function () {
    assert.throws(() => metafields.metafieldsFor('members'), /members has no metafields/);
    assert.equal(metafields.bindings, undefined);
  });

  it('builds the metafields of every entity the schema gives metafield tables', function () {
    metafields.init();

    const members = metafields.metafieldsFor('members');
    assert.equal(members.entity.table, 'members');
    assert.ok(members.definitions);
    assert.ok(members.values);
    assert.ok(metafields.bindings);
  });

  it('refuses an entity the schema gives no metafield tables', function () {
    metafields.init();

    assert.throws(() => metafields.metafieldsFor('tags'), /tags has no metafields/);
  });

  it('keeps the instances it built when init runs again', function () {
    metafields.init();
    const members = metafields.metafieldsFor('members');
    const bindings = metafields.bindings;

    metafields.init();

    assert.equal(metafields.metafieldsFor('members'), members);
    assert.equal(metafields.bindings, bindings);
  });

  it('keeps nothing from a build that fails part-way, so a later init starts again', function () {
    Object.assign(schema.tables, WIDGET_TABLES);

    assert.throws(() => metafields.init());
    assert.throws(() => metafields.metafieldsFor('members'), /members has no metafields/);
    assert.equal(metafields.bindings, undefined);

    for (const table of Object.keys(WIDGET_TABLES)) {
      delete schema.tables[table];
    }
    metafields.init();

    assert.equal(metafields.metafieldsFor('members').entity.table, 'members');
  });
});
