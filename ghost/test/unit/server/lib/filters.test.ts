import assert from 'node:assert/strict';
import knex from 'knex';
import { Filter, transformerStep } from '../../../../core/server/lib/filters';
import { combineNeFilters } from '../../../../core/server/lib/filters/nql-utils';

// Every transformer Ghost passes returns a filter, so no API request reaches the rejection of one
// that doesn't. A transformer that returned nothing would otherwise leave a query without any
// condition, selecting every row.
describe('Unit: lib/filters', function () {
  it('rejects a transformer that returns something other than a filter', async function () {
    await assert.rejects(Filter.resolve('status:paid', [transformerStep(() => undefined)], {}), {
      name: 'BadRequestError',
      message: 'Error parsing filter',
    });
  });

  // The Admin API adds its own condition to every mentions filter, the only model with a default
  // filter on this path, so no API request resolves a default filter without filter text. A
  // query without a filter still has the default's conditions.
  it('adds the default filter when there is no filter text', async function () {
    const db = knex({ client: 'mysql2' });
    try {
      const filter = await Filter.resolve(undefined, [], {}, 'deleted:false');
      const qb = db('mentions');
      filter.querySQL(qb, { relations: {} });
      const { sql, bindings } = qb.toSQL();
      assert.equal(sql, 'select * from `mentions` where `mentions`.`deleted` = ?');
      assert.deepEqual(bindings, [false]);
    } finally {
      await db.destroy();
    }
  });

  // The parser never writes a `$ne` beside another operator or key, so no API request reaches
  // these statements. Combining `$ne` statements into one `$nin` takes only the statements that
  // are a single `$ne`, and leaves the others, with every condition they carry, as they are.
  it('combines only statements that are a single `$ne`, keeping every other condition', function () {
    assert.deepEqual(
      combineNeFilters({
        $and: [
          { a: { $ne: 1 } },
          { a: { $ne: 2, $gt: 0 } },
          { a: { $ne: 3 }, b: 4 },
          { a: { $ne: 5 } },
        ],
      }),
      {
        $and: [{ a: { $ne: 2, $gt: 0 } }, { a: { $ne: 3 }, b: 4 }],
        a: { $nin: [1, 5] },
      },
    );
    assert.deepEqual(combineNeFilters({ $and: [{ a: { $ne: 1 } }, { a: { $ne: 2 } }], a: 3 }), {
      $and: [{ a: { $ne: 1 } }, { a: { $ne: 2 } }],
      a: 3,
    });
  });
});
