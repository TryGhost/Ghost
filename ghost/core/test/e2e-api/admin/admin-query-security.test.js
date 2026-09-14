const assert = require('node:assert/strict');
const db = require('../../../core/server/data/db');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

// `filter` and `order` are both compiled to SQL against the raw table, so a
// column the serializers strip from the response is still readable as an
// oracle unless it is blocked before the query is built.
describe('Admin API restricted query fields', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'invites');
    await agent.loginAsOwner();
  });

  describe('users', function () {
    it('rejects ordering by password, including suffix aliases and multi-clause forms', async function () {
      for (const order of [
        'password',
        'password ASC',
        'password DESC',
        'users.password DESC',
        'name ASC,password DESC',
        // bookshelf-order resolves a field to the first attribute ending with it
        'word ASC',
        'ssword DESC',
      ]) {
        await agent
          .get(`users/?order=${encodeURIComponent(order)}`)
          .expectStatus(400)
          .expect(({ body }) => {
            assert.equal(body.errors[0].type, 'BadRequestError');
            assert.equal(body.errors[0].context, 'Restricted fields cannot be used in order.');
          });
      }
    });

    it('rejects ordering by password for a low-privilege staff role', async function () {
      await agent.loginAsContributor();
      try {
        await agent.get('users/?order=password%20ASC').expectStatus(400);
        await agent.get('users/?order=word%20ASC').expectStatus(400);
      } finally {
        await agent.loginAsOwner();
      }
    });

    it('still orders users by public fields', async function () {
      const { body: ascending } = await agent.get('users/?order=name%20ASC').expectStatus(200);
      const { body: descending } = await agent.get('users/?order=name%20DESC').expectStatus(200);

      const names = ascending.users.map((user) => user.name);
      assert.ok(names.length > 1);
      assert.deepEqual(names, [...names].sort());
      assert.deepEqual(
        descending.users.map((user) => user.name),
        [...names].reverse(),
      );
    });
  });

  describe('invites', function () {
    let token;

    beforeAll(async function () {
      const invite = await db.knex('invites').select('token').first();
      token = invite.token;
      assert.ok(token);
    });

    it('does not expose the invite token in browse output', async function () {
      const { body } = await agent.get('invites/?limit=all').expectStatus(200);
      assert.ok(body.invites.length > 1);
      assert.ok(body.invites.every((invite) => invite.token === undefined));
    });

    it('ignores token filters instead of answering the prefix oracle', async function () {
      const { body: expected } = await agent.get('invites/?limit=all').expectStatus(200);

      for (const key of ['token', 'invites.token']) {
        for (const predicate of [
          `~^'${token.slice(0, 1)}'`,
          `~^'${token.slice(0, 8)}'`,
          `~^'${token}'`,
          `~^'definitely-not-the-token'`,
          `'${token}'`,
        ]) {
          const { body } = await agent
            .get(`invites/?limit=all&filter=${encodeURIComponent(`${key}:${predicate}`)}`)
            .expectStatus(200);
          assert.deepEqual(body, expected);
        }
      }
    });

    it('rejects ordering by token, including suffix aliases', async function () {
      for (const order of ['token', 'token DESC', 'invites.token ASC', 'oken ASC', 'en DESC']) {
        await agent
          .get(`invites/?order=${encodeURIComponent(order)}`)
          .expectStatus(400)
          .expect(({ body }) => {
            assert.equal(body.errors[0].context, 'Restricted fields cannot be used in order.');
          });
      }
    });

    it('closes the token oracle for an editor, who can browse invites but not read tokens', async function () {
      await agent.loginAsEditor();
      try {
        const { body: expected } = await agent.get('invites/?limit=all').expectStatus(200);
        assert.ok(expected.invites.length > 1);

        const { body } = await agent
          .get(`invites/?limit=all&filter=${encodeURIComponent(`token:~^'${token.slice(0, 4)}'`)}`)
          .expectStatus(200);
        assert.deepEqual(body, expected);

        await agent.get('invites/?order=token%20ASC').expectStatus(400);
        await agent.get('invites/?order=oken%20ASC').expectStatus(400);
      } finally {
        await agent.loginAsOwner();
      }
    });

    it('still filters and orders invites by public fields', async function () {
      const { body } = await agent
        .get(`invites/?limit=all&filter=${encodeURIComponent(`email:'test1@ghost.org'`)}`)
        .expectStatus(200);
      assert.equal(body.invites.length, 1);
      assert.equal(body.invites[0].email, 'test1@ghost.org');

      const { body: ordered } = await agent
        .get('invites/?limit=all&order=email%20ASC')
        .expectStatus(200);
      const emails = ordered.invites.map((invite) => invite.email);
      assert.deepEqual(emails, [...emails].sort());
    });
  });
});
