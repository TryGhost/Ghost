const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  QueryStats,
  normalise,
  bindingBytes,
} = require('../../../../../core/server/data/db/query-stats');

// The class rather than enableQueryStats: the latter wires up process signal
// handlers and a timer, which have no place in a unit test run.
function attached(options) {
  const knex = new EventEmitter();
  const stats = new QueryStats(options);

  stats.attach(knex);

  return { knex, stats };
}

describe('query stats', function () {
  describe('normalise', function () {
    it('collapses a placeholder list to one key and records its width', function () {
      const { normalised, placeholders } = normalise(
        'select * from `posts` where `id` in (?, ?, ?, ?)',
      );

      assert.equal(normalised, 'select * from `posts` where `id` in (?)');
      assert.equal(placeholders, 4);
    });

    it('gives two widths of the same list one key', function () {
      assert.equal(
        normalise('select * from `t` where `id` in (?, ?)').normalised,
        normalise('select * from `t` where `id` in (?, ?, ?, ?, ?)').normalised,
      );
    });

    it('leaves a single placeholder alone', function () {
      const { normalised, placeholders } = normalise('select * from `settings` where `key` = ?');

      assert.equal(normalised, 'select * from `settings` where `key` = ?');
      assert.equal(placeholders, 0);
    });

    it('collapses whitespace', function () {
      assert.equal(normalise('select   *\n  from `t`  ').normalised, 'select * from `t`');
    });
  });

  describe('bindingBytes', function () {
    it('measures the escaped value, not the placeholder', function () {
      assert.equal(bindingBytes(null), 4);
      assert.equal(bindingBytes(undefined), 4);
      assert.equal(bindingBytes(true), 4);
      assert.equal(bindingBytes(false), 5);
      assert.equal(bindingBytes(12345), 5);
      assert.equal(bindingBytes('hello'), 7); // quoted
    });

    it('counts a multi-byte string in bytes rather than characters', function () {
      assert.equal(bindingBytes('née'), Buffer.byteLength('née') + 2);
    });

    it('counts a buffer as a hex literal', function () {
      assert.equal(bindingBytes(Buffer.from([1, 2, 3])), 9);
    });
  });

  describe('accounting', function () {
    it('totals bytes, rows and columns per shape', function () {
      const { knex, stats } = attached();
      const sql = 'select * from `posts` where `id` in (?, ?)';
      const query = { sql, bindings: ['aa', 'bb'] };

      knex.emit('query', query);
      knex.emit(
        'query-response',
        [
          { id: 1, title: 'a' },
          { id: 2, title: 'b' },
        ],
        query,
      );
      knex.emit('query', query);
      knex.emit('query-response', [{ id: 3, title: 'c' }], query);

      const { queries, shapes } = stats.snapshot('test');

      assert.equal(queries, 2);
      assert.equal(shapes.length, 1);
      assert.equal(shapes[0].sql, 'select * from `posts` where `id` in (?)');
      assert.equal(shapes[0].count, 2);
      assert.equal(shapes[0].rows, 3);
      // Per result set, not per row: 2 columns each time.
      assert.equal(shapes[0].avg_columns, 2);
      assert.equal(shapes[0].max_list, 2);
      // Each `?` gives way to a 4-byte quoted string.
      assert.equal(shapes[0].bytes, (sql.length + 2 * 3) * 2);
    });

    it('sorts shapes by bytes', function () {
      const { knex, stats } = attached();

      knex.emit('query', { sql: 'select `a` from `t`', bindings: [] });
      knex.emit('query', { sql: 'select `a`, `b`, `c`, `d`, `e` from `much_longer_table`' });

      const { shapes } = stats.snapshot('test');

      assert.equal(shapes.length, 2);
      assert.ok(shapes[0].bytes > shapes[1].bytes);
    });

    it('ignores a response that is not a row set', function () {
      const { knex, stats } = attached();
      const query = { sql: 'insert into `posts` (`id`) values (?)', bindings: ['x'] };

      knex.emit('query', query);
      knex.emit('query-response', [42], query);

      const { shapes } = stats.snapshot('test');

      assert.equal(shapes[0].count, 1);
      assert.equal(shapes[0].rows, 0);
      assert.equal(shapes[0].avg_columns, 0);
    });

    it('keeps totals right across a memo drop', function () {
      const { knex, stats } = attached({ memoLimit: 10 });

      // More distinct statements than the memo holds, all one shape: an
      // `IN (...)` list is a different string at every width. Nothing may be
      // lost when the memo is dropped and refilled part way through.
      for (let width = 2; width <= 51; width += 1) {
        const query = {
          sql: `select * from \`posts\` where \`id\` in (${new Array(width).fill('?').join(', ')})`,
          bindings: new Array(width).fill('a'),
        };

        knex.emit('query', query);
        knex.emit('query-response', [{ id: 1 }], query);
      }

      const { queries, shapes } = stats.snapshot('test');

      assert.equal(queries, 50);
      assert.equal(shapes.length, 1);
      assert.equal(shapes[0].count, 50);
      assert.equal(shapes[0].rows, 50);
      assert.equal(shapes[0].avg_columns, 1);
      assert.equal(shapes[0].max_list, 51);
    });

    it('resets the counters', function () {
      const { knex, stats } = attached();

      knex.emit('query', { sql: 'select * from `t`', bindings: [] });
      stats.reset();

      const { queries, shapes } = stats.snapshot('test');

      assert.equal(queries, 0);
      assert.equal(shapes.length, 0);
    });
  });
});
