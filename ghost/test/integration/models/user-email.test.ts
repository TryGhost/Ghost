import assert from 'node:assert/strict';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const knex = require('../../../core/server/data/db').knex;

describe('User Model: author ID lookup by email', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup());
  afterAll(testUtils.teardownDb);

  const authorId = '100000000000000000000001';
  const unicodeId = '100000000000000000000002';

  beforeAll(async function () {
    const users = [
      { id: authorId, email: 'Author@example.com', status: 'locked' },
      { id: unicodeId, email: 'Änne@example.com', status: 'inactive' },
      ...Array.from({ length: 50 }, (_, index) => ({
        id: (index + 3).toString().padStart(24, '0'),
        email: `unrelated-${index}@example.com`,
        status: 'active',
      })),
    ].map((user) => ({
      ...user,
      name: user.email,
      slug: user.id,
      password: 'unused',
      created_at: new Date(),
    }));
    await knex('users').insert(users);
  });

  it('reads only the matching ID/email pair using the MySQL email index', async function () {
    const lookups: Array<{ sql: string; rows: unknown }> = [];
    const onResponse = (rows: unknown, query: { sql: string }) => {
      if (/^select .* from `users`/i.test(query.sql)) {
        lookups.push({ sql: query.sql, rows });
      }
    };
    knex.on('query-response', onResponse);
    try {
      assert.equal(await models.User.findIdByEmail('AUTHOR@example.com'), authorId);
    } finally {
      knex.removeListener('query-response', onResponse);
    }

    assert.equal(lookups.length, 1, 'existing authors need one query regardless of staff count');
    assert.match(lookups[0].sql, /^select `id`, `email` from `users` where `email` = \? limit \?/);
    assert.deepEqual(lookups[0].rows, { id: authorId, email: 'Author@example.com' });
    const [plan] = await knex.raw('EXPLAIN SELECT id, email FROM users WHERE email = ?', [
      'AUTHOR@example.com',
    ]);
    assert.equal(plan[0].key, 'users_email_unique');
  });

  it('matches Unicode case differences and includes inactive users', async function () {
    assert.equal(await models.User.findIdByEmail('änne@example.com'), unicodeId);
  });

  it('does not match an email that only differs by its accents', async function () {
    assert.equal(await models.User.findIdByEmail('Àuthor@example.com'), undefined);
  });

  it('returns undefined for an unknown email', async function () {
    assert.equal(await models.User.findIdByEmail('missing@example.com'), undefined);
  });

  it('sees uncommitted authors in the row transaction and does not retain rolled-back IDs', async function () {
    const failure = new Error('post write failed');
    const email = 'uncommitted@example.com';
    const id = '100000000000000000000003';

    await assert.rejects(
      knex.transaction(async (transacting: typeof knex) => {
        await transacting('users').insert({
          id,
          email,
          name: 'Uncommitted Author',
          slug: 'uncommitted-author',
          password: 'unused',
          created_at: new Date(),
        });
        assert.equal(await models.User.findIdByEmail(email, { transacting }), id);
        throw failure;
      }),
      (thrown) => thrown === failure,
    );
    assert.equal(await models.User.findIdByEmail(email), undefined);
  });
});
