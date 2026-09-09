import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { computeAutoExcerpt, computeReadingTime } from '../../../../../core/server/lib/post-meta';

const migration = require('../../../../../core/server/data/migrations/versions/6.64/2026-09-08-13-09-12-backfill-posts-auto-excerpt-and-reading-time');

type PostRow = {
  id: string;
  html: string | null;
  plaintext: string | null;
  feature_image: string | null;
  auto_excerpt: string | null;
  reading_time: number | null;
};

type UpdateEntry = {
  id: string | null;
  whereNull: string | null;
  updates: Record<string, string | number | null>;
};

type CandidateBatch = {
  afterId: string | null;
  limit: number | null;
  ids: string[];
};

type KnexFakeState = {
  posts: PostRow[];
  updates: UpdateEntry[];
  candidateBatches: CandidateBatch[];
};

type QueryMode = 'candidates' | 'row' | null;

type KnexFake = {
  (table: string): KnexQuery;
  __state: KnexFakeState;
};

type KnexQuery = {
  _id: string | null;
  _afterId: string | null;
  _limit: number | null;
  _whereNull: string | null;
  _mode: QueryMode;
  select(...columns: string[]): KnexQuery;
  where(arg: ((this: WhereBuilder) => void) | { id: string }): KnexQuery;
  whereNull(column: string): KnexQuery;
  whereNotNull(): KnexQuery;
  andWhere(column?: string, op?: string, value?: string): KnexQuery;
  orWhere(fn: (this: WhereBuilder) => void): KnexQuery;
  orderBy(): KnexQuery;
  limit(n: number): KnexQuery;
  update(updates: Record<string, string | number | null>): Promise<number>;
  then<TResult1 = unknown, TResult2 = never>(
    onFulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
};

type WhereBuilder = {
  where(fn: (this: WhereBuilder) => void): WhereBuilder;
  orWhere(fn: (this: WhereBuilder) => void): WhereBuilder;
  whereNull(): WhereBuilder;
  whereNotNull(): WhereBuilder;
  andWhere(): WhereBuilder;
};

/**
 * Minimal knex stand-in that covers the migration's query shapes:
 * - keyset candidate id select (orderBy + limit + optional id cursor)
 * - per-id select of html/plaintext/feature_image/auto_excerpt/reading_time
 * - per-column whereNull-guarded updates
 */
function createKnexFake(posts: PostRow[]): KnexFake {
  const state: KnexFakeState = {
    posts: posts.map((post) => ({ ...post })),
    updates: [],
    candidateBatches: [],
  };

  const needsBackfill = (post: PostRow) =>
    (post.auto_excerpt === null && Boolean(post.plaintext)) ||
    (post.reading_time === null && Boolean(post.html));

  const knex = function knex(table: string): KnexQuery {
    assert.equal(table, 'posts');

    const query: KnexQuery = {
      _id: null,
      _afterId: null,
      _limit: null,
      _whereNull: null,
      _mode: null,

      select(...columns: string[]) {
        if (columns.length === 1 && columns[0] === 'id') {
          this._mode = 'candidates';
        } else {
          this._mode = 'row';
        }
        return this;
      },

      where(arg: ((this: WhereBuilder) => void) | { id: string }) {
        if (typeof arg === 'function') {
          // Candidate filter — invoke nested builders for API shape only.
          const builder: WhereBuilder = {
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
                } as WhereBuilder);
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

      whereNull(column: string) {
        this._whereNull = column;
        return this;
      },

      whereNotNull() {
        return this;
      },

      andWhere(column?: string, op?: string, value?: string) {
        if (column === 'id' && op === '>' && value !== undefined && value !== null) {
          this._afterId = value;
        }
        return this;
      },

      orWhere(fn: (this: WhereBuilder) => void) {
        if (typeof fn === 'function') {
          fn.call(this as unknown as WhereBuilder);
        }
        return this;
      },

      orderBy() {
        return this;
      },

      limit(n: number) {
        this._limit = n;
        return this;
      },

      update(updates: Record<string, string | number | null>) {
        const post = state.posts.find((row) => row.id === this._id);
        assert.ok(post, `missing post ${this._id}`);
        assert.ok(this._whereNull, 'update must be guarded with whereNull');

        state.updates.push({ id: this._id, whereNull: this._whereNull, updates: { ...updates } });

        if (post[this._whereNull as keyof PostRow] !== null) {
          return Promise.resolve(0);
        }

        Object.assign(post, updates);
        return Promise.resolve(1);
      },

      then(onFulfilled, onRejected) {
        return Promise.resolve()
          .then(() => {
            if (this._mode === 'candidates') {
              let rows = state.posts
                .filter(needsBackfill)
                .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

              if (this._afterId !== null) {
                rows = rows.filter((post) => post.id > this._afterId!);
              }

              if (this._limit !== null) {
                rows = rows.slice(0, this._limit);
              }

              const ids = rows.map((post) => post.id);
              state.candidateBatches.push({
                afterId: this._afterId,
                limit: this._limit,
                ids,
              });

              return ids.map((id) => ({ id }));
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
  } as KnexFake;

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
    assert.equal(knex.__state.candidateBatches.length, 1);
    assert.deepEqual(knex.__state.candidateBatches[0].ids, []);
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
    const knex = function (table: string) {
      const query = baseKnex(table);
      const originalUpdate = query.update.bind(query);
      query.update = function (this: KnexQuery, updates: Record<string, string | number | null>) {
        const post = baseKnex.__state.posts.find((row) => row.id === this._id);
        assert.ok(post);
        post.auto_excerpt = 'filled-by-concurrent-save';
        post.reading_time = 9;
        return originalUpdate(updates);
      };
      return query;
    } as KnexFake;
    knex.__state = baseKnex.__state;

    await migration.up({ connection: knex });

    assert.equal(baseKnex.__state.posts[0].auto_excerpt, 'filled-by-concurrent-save');
    assert.equal(baseKnex.__state.posts[0].reading_time, 9);
    assert.equal(baseKnex.__state.updates.length, 2);
  });

  it('walks eligible posts in ordered keyset batches', async function () {
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'warn');

    const batchSize = migration.BATCH_SIZE as number;
    const posts: PostRow[] = Array.from({ length: batchSize + 1 }, (_, index) => ({
      id: String(index).padStart(4, '0'),
      html: '<p>x</p>',
      plaintext: 'x',
      feature_image: null,
      auto_excerpt: null,
      reading_time: null,
    }));

    const knex = createKnexFake(posts);

    await migration.up({ connection: knex });

    // First page, cursor page, then empty terminal probe.
    assert.equal(knex.__state.candidateBatches.length, 3);
    assert.equal(knex.__state.candidateBatches[0].afterId, null);
    assert.equal(knex.__state.candidateBatches[0].limit, batchSize);
    assert.equal(knex.__state.candidateBatches[0].ids.length, batchSize);
    assert.equal(
      knex.__state.candidateBatches[1].afterId,
      knex.__state.candidateBatches[0].ids.at(-1),
    );
    assert.deepEqual(knex.__state.candidateBatches[1].ids, [String(batchSize).padStart(4, '0')]);
    assert.deepEqual(knex.__state.candidateBatches[2].ids, []);

    assert.equal(
      knex.__state.posts.filter((post) => post.auto_excerpt !== null && post.reading_time !== null)
        .length,
      batchSize + 1,
    );
  });
});
