const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {
  computeAutoExcerpt,
  computeReadingTime,
} = require('../../../../../core/server/lib/post-meta');

const migration = require('../../../../../core/server/data/migrations/versions/6.63/2026-09-08-13-09-12-backfill-posts-auto-excerpt-and-reading-time');

/**
 * Minimal knex stand-in that covers the migration's query shapes:
 * - candidate id select with nested where callbacks
 * - per-id select of html/plaintext/feature_image/auto_excerpt/reading_time
 * - per-column whereNull-guarded updates
 */
function createKnexFake(posts) {
  const state = {
    posts: posts.map((post) => ({ ...post })),
    updates: [],
  };

  const needsBackfill = (post) =>
    (post.auto_excerpt === null && post.plaintext) || (post.reading_time === null && post.html);

  const knex = function knex(table) {
    assert.equal(table, 'posts');

    const query = {
      _id: null,
      _whereNull: null,
      _mode: null,

      select(...columns) {
        if (columns.length === 1 && columns[0] === 'id') {
          this._mode = 'candidates';
        } else {
          this._mode = 'row';
        }
        return this;
      },

      where(arg) {
        if (typeof arg === 'function') {
          // Candidate filter — invoke nested builders for API shape only.
          const builder = {
            where(fn) {
              if (typeof fn === 'function') {
                fn.call({
                  whereNull() {
                    return this;
                  },
                  whereNotNull() {
                    return this;
                  },
                  andWhere() {
                    return this;
                  },
                });
              }
              return this;
            },
            orWhere(fn) {
              if (typeof fn === 'function') {
                fn.call(this);
              }
              return this;
            },
            whereNull() {
              return this;
            },
            whereNotNull() {
              return this;
            },
            andWhere() {
              return this;
            },
          };
          arg.call(builder);
          return this;
        }

        if (arg && typeof arg === 'object' && arg.id) {
          this._id = arg.id;
        }
        return this;
      },

      whereNull(column) {
        this._whereNull = column;
        return this;
      },

      whereNotNull() {
        return this;
      },

      andWhere() {
        return this;
      },

      orWhere(fn) {
        if (typeof fn === 'function') {
          fn.call(this);
        }
        return this;
      },

      update(updates) {
        const post = state.posts.find((row) => row.id === this._id);
        assert.ok(post, `missing post ${this._id}`);
        assert.ok(this._whereNull, 'update must be guarded with whereNull');

        state.updates.push({ id: this._id, whereNull: this._whereNull, updates: { ...updates } });

        if (post[this._whereNull] !== null) {
          return Promise.resolve(0);
        }

        Object.assign(post, updates);
        return Promise.resolve(1);
      },

      then(onFulfilled, onRejected) {
        return Promise.resolve()
          .then(() => {
            if (this._mode === 'candidates') {
              return state.posts.filter(needsBackfill).map((post) => ({ id: post.id }));
            }

            if (this._mode === 'row') {
              const post = state.posts.find((row) => row.id === this._id);
              return post ? [post] : [];
            }

            throw new Error(`unexpected knex query mode: ${this._mode}`);
          })
          .then(onFulfilled, onRejected);
      },
    };

    return query;
  };

  knex.__state = state;
  return knex;
}

describe('Migration: backfill posts auto_excerpt and reading_time', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('skips when every candidate is already populated', async function () {
    const warn = sinon.stub(logging, 'warn');
    const knex = createKnexFake([
      {
        id: 'already-done',
        html: '<p>done</p>',
        plaintext: 'done',
        feature_image: null,
        auto_excerpt: 'done',
        reading_time: 1,
      },
    ]);

    await migration.up({ connection: knex });

    assert.equal(knex.__state.updates.length, 0);
    sinon.assert.calledWithMatch(warn, /already populated/);
  });

  it('backfills null columns only and skips empty html/plaintext', async function () {
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'warn');

    const knex = createKnexFake([
      {
        id: 'needs-both',
        html: `<p>${'word '.repeat(50)}</p>`,
        plaintext: 'Plaintext body for excerpt',
        feature_image: null,
        auto_excerpt: null,
        reading_time: null,
      },
      {
        id: 'empty-content',
        html: '<p>has html so reading_time is a candidate</p>',
        plaintext: '',
        feature_image: null,
        auto_excerpt: null,
        reading_time: null,
      },
      {
        id: 'partial-excerpt',
        html: '<p>short</p>',
        plaintext: 'Partial excerpt body',
        feature_image: 'https://example.com/feature.jpg',
        auto_excerpt: null,
        reading_time: 3,
      },
    ]);

    await migration.up({ connection: knex });

    const byId = Object.fromEntries(knex.__state.posts.map((post) => [post.id, post]));

    assert.equal(byId['needs-both'].auto_excerpt, computeAutoExcerpt('Plaintext body for excerpt'));
    assert.equal(
      byId['needs-both'].reading_time,
      computeReadingTime(`<p>${'word '.repeat(50)}</p>`, null),
    );

    assert.equal(byId['empty-content'].auto_excerpt, null);
    assert.equal(
      byId['empty-content'].reading_time,
      computeReadingTime('<p>has html so reading_time is a candidate</p>', null),
    );

    assert.equal(byId['partial-excerpt'].auto_excerpt, computeAutoExcerpt('Partial excerpt body'));
    assert.equal(byId['partial-excerpt'].reading_time, 3);

    assert.deepEqual(
      knex.__state.updates.map((entry) => entry.whereNull).sort(),
      ['auto_excerpt', 'auto_excerpt', 'reading_time', 'reading_time'].sort(),
    );
  });

  it('does not overwrite a column that is no longer null (whereNull race)', async function () {
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'warn');

    const baseKnex = createKnexFake([
      {
        id: 'raced',
        html: '<p>race</p>',
        plaintext: 'race plaintext',
        feature_image: null,
        auto_excerpt: null,
        reading_time: null,
      },
    ]);

    // Concurrent save fills the columns between the migration's row read and update.
    const knex = function (table) {
      const query = baseKnex(table);
      const originalUpdate = query.update.bind(query);
      query.update = function (updates) {
        const post = baseKnex.__state.posts.find((row) => row.id === this._id);
        post.auto_excerpt = 'filled-by-concurrent-save';
        post.reading_time = 9;
        return originalUpdate(updates);
      };
      return query;
    };
    knex.__state = baseKnex.__state;

    await migration.up({ connection: knex });

    assert.equal(baseKnex.__state.posts[0].auto_excerpt, 'filled-by-concurrent-save');
    assert.equal(baseKnex.__state.posts[0].reading_time, 9);
    assert.equal(baseKnex.__state.updates.length, 2);
  });
});
