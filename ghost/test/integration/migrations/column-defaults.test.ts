import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import * as commands from '../../../core/server/data/schema/commands';
import { defaultExpressionSql } from '../../../core/server/data/schema/lib/column-defaults';
import type { DateTimeColumn, IntegerColumn } from '../../../core/server/data/schema/types';

const testUtils = require('../../utils');
const { knex }: { knex: Knex } = require('../../../core/server/data/db');

const TABLE = 'test_column_defaults';
const id = { type: 'integer', nullable: false } satisfies IntegerColumn;
const createdAt = {
  type: 'dateTime',
  nullable: false,
  defaultExpression: 'now',
} satisfies DateTimeColumn;

const AT = new Date('2026-11-24T10:00:00.123Z');

/**
 * Runs `write` on a connection whose clock reads `AT`, in a time zone five hours ahead of UTC
 * as a site database's own time zone may be, then sets the connection back.
 */
async function writeAt(write: (trx: Knex.Transaction) => Promise<unknown>) {
  await knex.transaction(async (trx) => {
    await trx.raw("SET time_zone = '+05:00', timestamp = ?", [AT.getTime() / 1000]);
    try {
      await write(trx);
    } finally {
      await trx.raw('SET time_zone = DEFAULT, timestamp = DEFAULT');
    }
  });
}

/** The time the row `rowId` holds in `created_at`, as ISO 8601 text. */
async function createdAtOf(rowId: number): Promise<string> {
  const row: { created_at: Date } = await knex(TABLE).where({ id: rowId }).first('created_at');
  return row.created_at.toISOString();
}

describe('A column default expression on MySQL', function () {
  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    await knex.schema.dropTableIfExists(TABLE);
  });

  afterAll(async function () {
    await knex.schema.dropTableIfExists(TABLE);
  });

  // Ghost reads every datetime as UTC, and Ghost(Pro)'s site databases keep London time.
  it("fills in the time a row is added, in UTC whatever the connection's time zone", async function () {
    await commands.createTable(TABLE, knex, { id, created_at: createdAt });

    await writeAt((trx) => trx(TABLE).insert({ id: 1 }));

    assert.equal(await createdAtOf(1), '2026-11-24T10:00:00.000Z');
  });

  it("fills in the time to the column's precision", async function () {
    await commands.createTable(TABLE, knex, { id, created_at: { ...createdAt, precision: 3 } });

    await writeAt((trx) => trx(TABLE).insert({ id: 1 }));

    assert.equal(await createdAtOf(1), '2026-11-24T10:00:00.123Z');
  });

  it('keeps a time the insert gives', async function () {
    await commands.createTable(TABLE, knex, { id, created_at: createdAt });

    await knex(TABLE).insert({ id: 1, created_at: '2026-11-25 09:30:00' });

    assert.equal(await createdAtOf(1), '2026-11-25T09:30:00.000Z');
  });

  it('fills in the rows already in a table when the column is added', async function () {
    await commands.createTable(TABLE, knex, { id });
    await knex(TABLE).insert({ id: 1 });

    await writeAt((trx) => commands.addColumn(TABLE, 'created_at', trx, createdAt));

    assert.equal(await createdAtOf(1), '2026-11-24T10:00:00.000Z');
  });

  // The check that compares a migrated database with schema.ts reads defaults back this way.
  it('reads back from MySQL as the expression it was declared with', async function () {
    await commands.createTable(TABLE, knex, {
      id,
      created_at: createdAt,
      updated_at: { ...createdAt, precision: 3 },
    });

    const columns: { COLUMN_NAME: string; COLUMN_DEFAULT: string | null; EXTRA: string }[] =
      await knex('information_schema.COLUMNS')
        .where('TABLE_SCHEMA', knex.raw('DATABASE()'))
        .andWhere({ TABLE_NAME: TABLE })
        .whereIn('COLUMN_NAME', ['created_at', 'updated_at'])
        .orderBy('COLUMN_NAME')
        .select('COLUMN_NAME', 'COLUMN_DEFAULT', 'EXTRA');

    assert.deepEqual(
      columns.map((column) => [column.COLUMN_NAME, column.COLUMN_DEFAULT, column.EXTRA]),
      [
        ['created_at', defaultExpressionSql('now'), 'DEFAULT_GENERATED'],
        ['updated_at', defaultExpressionSql('now', 3), 'DEFAULT_GENERATED'],
      ],
    );
  });
});
