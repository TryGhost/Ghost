import assert from 'node:assert/strict';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// The NQL strings below are copied verbatim from what Ghost Admin emits. Do not tidy them into
// something that reads better — their exact shape is what is under test.
describe('Members filtering, every operator admin can emit', function () {
  let agent: {
    get: (_url: string) => any;
    post: (_url: string) => any;
    put: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };

  let newsletterSlug: string;

  const ALICE = 'alice@example.com';
  const BOB = 'bob@example.com';
  const CAROL = 'carol@example.com';

  async function browse(filter: string): Promise<string[]> {
    const { body } = await agent
      .get(`members/?filter=${encodeURIComponent(filter)}&limit=all`)
      .expectStatus(200);
    return body.members.map((member: { email: string }) => member.email).sort();
  }

  /**
   * Dates must be the `YYYY-MM-DD HH:mm:ss` UTC string Ghost stores. A JS Date reaches SQLite
   * as epoch milliseconds and compares as a number against the filter's text, matching every row.
   */
  async function setColumns(email: string, columns: Record<string, unknown>) {
    await models.Base.knex('members').where({ email }).update(columns);
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'newsletters');
    await agent.loginAsOwner();

    const { body: newsletters } = await agent.get('newsletters/?limit=1').expectStatus(200);
    newsletterSlug = newsletters.newsletters[0].slug;

    const newsletterId = newsletters.newsletters[0].id;

    async function createMember(member: Record<string, unknown>) {
      await agent
        .post('members/')
        .body({ members: [member] })
        .expectStatus(201);
    }

    await createMember({
      email: ALICE,
      name: 'Alice Anderson',
      labels: [{ name: 'vip' }],
      newsletters: [{ id: newsletterId }],
    });
    await createMember({
      email: BOB,
      name: 'Bob Brown',
      labels: [{ name: 'vip' }],
      newsletters: [],
    });
    await createMember({ email: CAROL, name: 'Carol Clark', newsletters: [{ id: newsletterId }] });

    await setColumns(ALICE, { status: 'free', email_count: 0, created_at: '2024-01-01 00:00:00' });
    await setColumns(BOB, { status: 'paid', email_count: 5, created_at: '2024-06-01 00:00:00' });
    await setColumns(CAROL, {
      status: 'comped',
      email_count: 10,
      created_at: '2025-01-01 00:00:00',
      email_disabled: true,
    });
  });

  afterAll(async function () {
    await models.Base.knex('members_labels').del();
    await models.Base.knex('members_newsletters').del();
    await models.Base.knex('members').del();
  });

  function matrix(cases: Array<{ what: string; nql: string; expect: string[] }>) {
    for (const { what, nql, expect } of cases) {
      it(what, async function () {
        assert.deepEqual(await browse(nql), [...expect].sort(), `filter: ${nql}`);
      });
    }
  }

  describe('native — text on a column', function () {
    matrix([
      { what: 'name is', nql: "name:'Alice Anderson'", expect: [ALICE] },
      { what: 'name contains', nql: "name:~'Brown'", expect: [BOB] },
      { what: 'name does not contain', nql: "name:-~'Brown'", expect: [ALICE, CAROL] },
      { what: 'name starts with', nql: "name:~^'Carol'", expect: [CAROL] },
      { what: 'name ends with', nql: "name:~$'Clark'", expect: [CAROL] },
      { what: 'email contains', nql: "email:~'bob'", expect: [BOB] },
      { what: 'email is not', nql: "email:-'bob@example.com'", expect: [ALICE, CAROL] },
    ]);
  });

  describe('native — a value from a fixed set', function () {
    matrix([
      { what: 'status is', nql: 'status:paid', expect: [BOB] },
      { what: 'status is not', nql: 'status:-paid', expect: [ALICE, CAROL] },
    ]);
  });

  describe('native — a number', function () {
    matrix([
      { what: 'email count is', nql: 'email_count:5', expect: [BOB] },
      { what: 'email count is greater', nql: 'email_count:>5', expect: [CAROL] },
      { what: 'email count is less', nql: 'email_count:<5', expect: [ALICE] },
    ]);
  });

  // Boundaries fall between members, never on one. SQLite compares the stored
  // `2024-06-01 00:00:00` against the filter's `2024-06-01T00:00:00.000Z` as text, and a space
  // sorts before `T`, so an exact tie tests storage format rather than the operator.
  describe('native — a date', function () {
    matrix([
      { what: 'created before', nql: "created_at:<'2024-03-01T00:00:00.000Z'", expect: [ALICE] },
      {
        what: 'created on or before',
        nql: "created_at:<='2024-09-01T23:59:59.999Z'",
        expect: [ALICE, BOB],
      },
      { what: 'created after', nql: "created_at:>'2024-09-01T00:00:00.000Z'", expect: [CAROL] },
      {
        what: 'created on or after',
        nql: "created_at:>='2024-03-01T00:00:00.000Z'",
        expect: [BOB, CAROL],
      },
    ]);
  });

  describe('derived — a label, which is a join', function () {
    matrix([
      { what: 'label is any of', nql: 'label:[vip]', expect: [ALICE, BOB] },
      { what: 'label is none of', nql: 'label:-[vip]', expect: [CAROL] },
    ]);
  });

  describe('derived — subscribed, which is not a column at all', function () {
    it('is subscribed means on a newsletter and still being sent to', async function () {
      assert.deepEqual(await browse('(subscribed:true+email_disabled:0)'), [ALICE]);
    });

    it('is unsubscribed means off every newsletter, still sendable', async function () {
      assert.deepEqual(await browse('(subscribed:false+email_disabled:0)'), [BOB]);
    });

    it('is email-disabled is about the flag alone', async function () {
      assert.deepEqual(await browse('(email_disabled:1)'), [CAROL]);
    });

    it('is not subscribed is the negation admin writes, joined with a comma', async function () {
      assert.deepEqual(await browse('(subscribed:false,email_disabled:1)'), [BOB, CAROL].sort());
    });
  });

  describe('derived — one newsletter, by slug', function () {
    it('subscribed to a named newsletter', async function () {
      assert.deepEqual(await browse(`(newsletters.slug:${newsletterSlug}+email_disabled:0)`), [
        ALICE,
      ]);
    });

    it('unsubscribed from a named newsletter', async function () {
      assert.deepEqual(
        await browse(`(newsletters.slug:-${newsletterSlug},email_disabled:1)`),
        [BOB, CAROL].sort(),
      );
    });
  });

  // `^` and `$` are both characters a name can contain and the syntax for "starts with" and
  // "ends with". Confusing the two returns members rather than erroring, so each pair below
  // runs both readings and pins that they select different people.
  describe('native — a text value containing the anchor characters', function () {
    const DIGIT = 'digit@example.com';
    const DOLLAR = 'dollar@example.com';
    const CARET = 'caret@example.com';
    const DRAFT = 'draft@example.com';

    beforeAll(async function () {
      for (const [email, name] of [
        [DIGIT, 'Room 5'],
        [DOLLAR, 'Ticket 5$'],
        [CARET, '^Draft note'],
        [DRAFT, 'Draft note'],
      ]) {
        await agent
          .post('members/')
          .body({ members: [{ email, name }] })
          .expectStatus(201);
      }
    });

    afterAll(async function () {
      await models.Base.knex('members').whereIn('email', [DIGIT, DOLLAR, CARET, DRAFT]).del();
    });

    it('contains a value ending in a dollar', async function () {
      assert.deepEqual(await browse("name:~'5$'"), [DOLLAR]);
    });

    it('ends with the digit before it, which is a different question', async function () {
      assert.deepEqual(await browse("name:~$'5'"), [DIGIT]);
    });

    it('ends with the dollar itself', async function () {
      assert.deepEqual(await browse("name:~$'5$'"), [DOLLAR]);
    });

    it('contains a value starting with a caret', async function () {
      assert.deepEqual(await browse("name:~'^Draft'"), [CARET]);
    });

    it('starts with the word after it, which is a different question', async function () {
      assert.deepEqual(await browse("name:~^'Draft'"), [DRAFT]);
    });

    it('starts with the caret itself', async function () {
      assert.deepEqual(await browse("name:~^'^Draft'"), [CARET]);
    });
  });

  describe('combinations, as a publisher builds them', function () {
    matrix([
      { what: 'two natives', nql: "status:-paid+name:~'a'", expect: [ALICE, CAROL] },
      { what: 'a native and a derived', nql: 'label:[vip]+status:paid', expect: [BOB] },
      {
        what: 'a derived and a date',
        nql: "label:[vip]+created_at:<'2024-03-01T00:00:00.000Z'",
        expect: [ALICE],
      },
      {
        what: 'a filter matching nobody still answers',
        nql: "status:paid+name:~'Zeta'",
        expect: [],
      },
    ]);

    it('a subscription state alongside a native filter', async function () {
      assert.deepEqual(await browse('(subscribed:true+email_disabled:0)+status:free'), [ALICE]);
    });
  });

  describe('canonical ordering, which saved views depend on', function () {
    it('gives the same members whichever order the clauses are written in', async function () {
      const one = await browse("status:-paid+name:~'a'");
      const other = await browse("name:~'a'+status:-paid");

      assert.deepEqual(one, other);
    });
  });
});
