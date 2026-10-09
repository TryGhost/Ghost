import assert from 'node:assert/strict';
import type { Knex } from 'knex';
// @ts-expect-error This module lacks type definitions.
import * as commands from '../../../core/server/data/schema/commands';

const testUtils = require('../../utils');
const { knex }: { knex: Knex } = require('../../../core/server/data/db');

const FIELDS = 'test_fk_fields';
const VALUES = 'test_fk_field_values';

describe('A foreign key over several columns on MySQL', function () {
  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    await knex.schema.dropTableIfExists(VALUES);
    await knex.schema.dropTableIfExists(FIELDS);

    await commands.createTable(FIELDS, knex, {
      namespace: { type: 'string', maxlength: 191, nullable: false },
      key: { type: 'string', maxlength: 191, nullable: false },
      '@@UNIQUE_CONSTRAINTS@@': [['namespace', 'key']],
    });
    await commands.createTable(VALUES, knex, {
      field_namespace: { type: 'string', maxlength: 191, nullable: false },
      field_key: { type: 'string', maxlength: 191, nullable: false },
      value: { type: 'string', maxlength: 191, nullable: false },
      '@@FOREIGN_KEYS@@': [
        {
          columns: ['field_namespace', 'field_key'],
          references: { table: FIELDS, columns: ['namespace', 'key'] },
          constraintName: 'test_fk_field_values_field_foreign',
          cascadeDelete: true,
        },
      ],
    });

    await knex(FIELDS).insert([
      { namespace: 'custom', key: 'company' },
      { namespace: 'app', key: 'phone' },
    ]);
  });

  afterAll(async function () {
    await knex.schema.dropTableIfExists(VALUES);
    await knex.schema.dropTableIfExists(FIELDS);
  });

  it('takes a row with it when the row it references is deleted', async function () {
    await knex(VALUES).insert([
      { field_namespace: 'custom', field_key: 'company', value: 'Ghost' },
      { field_namespace: 'app', field_key: 'phone', value: '+44' },
    ]);

    await knex(FIELDS).where({ namespace: 'custom', key: 'company' }).del();

    assert.deepEqual(await knex(VALUES).pluck('value'), ['+44']);
  });

  it('refuses a row that matches a referenced row one column at a time but not as a pair', async function () {
    await assert.rejects(
      knex(VALUES).insert({ field_namespace: 'custom', field_key: 'phone', value: '+44' }),
      /foreign key constraint fails/,
    );
  });
});
