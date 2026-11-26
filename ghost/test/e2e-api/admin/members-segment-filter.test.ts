import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';

const {
  agentProvider,
  dbUtils,
  fixtureManager,
  mockManager,
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;

const UNKNOWN_ID = '0123456789abcdef01234567';

/** The members this suite adds, by first name, with their labels and status. */
const MEMBERS = {
  ada: { labels: ['vip'], status: 'free' },
  grace: { labels: ['vip', 'founder'], status: 'paid' },
  alan: { labels: ['founder'], status: 'paid' },
  linus: { labels: [], status: 'free' },
  katherine: { labels: ['lapsed'], status: 'paid' },
} as const;
const NAMES = Object.keys(MEMBERS).sort();

const emailOf = (name: string) => `${name}@segment-filter.example`;
const nameOf = (email: string) => email.replace('@segment-filter.example', '');

/** A members filter that names segments, through the members Admin API. */
describe('Members filtered by segment', function () {
  let agent: Agent;
  let segments: { vip: string; founders: string; lapsed: string };

  async function addSegment(name: string, filter: string): Promise<string> {
    const { body } = await agent
      .post('segments/')
      .body({ segments: [{ name, filter }] })
      .expectStatus(201);
    return body.segments[0].id;
  }

  /** The names of the members `filter` selects on the members list. */
  async function membersList(filter: string): Promise<string[]> {
    const { body } = await agent
      .get(`members/?filter=${encodeURIComponent(filter)}&limit=all`)
      .expectStatus(200);
    return body.members.map((member: { email: string }) => nameOf(member.email)).sort();
  }

  /** The error the members list rejects `filter` with. */
  async function listError(filter: string, status: number) {
    const { body } = await agent
      .get(`members/?filter=${encodeURIComponent(filter)}`)
      .expectStatus(status);
    return body.errors[0];
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'integrations');
    await agent.loginAsOwner();

    for (const name of ['Company', 'City']) {
      await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ name, type: 'short_text' }] })
        .expectStatus(201);
    }
    // Ada has a company and Grace a city. Nobody else has either.
    const customFields: Record<string, Record<string, string>> = {
      ada: { company: 'Ghost' },
      grace: { city: 'Berlin' },
    };
    for (const [name, member] of Object.entries(MEMBERS)) {
      await agent
        .post('members/')
        .body({
          members: [
            {
              email: emailOf(name),
              name,
              labels: [...member.labels],
              metafields: { custom: customFields[name] ?? {} },
            },
          ],
        })
        .expectStatus(201);
      await models.Base.knex('members')
        .where({ email: emailOf(name) })
        .update({ status: member.status });
    }
    segments = {
      vip: await addSegment('VIP', 'label:[vip]'),
      founders: await addSegment('Founders', 'label:[founder]'),
      lapsed: await addSegment('Lapsed', 'label:[lapsed]'),
    };
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('segmentEmails');
  });

  afterEach(function () {
    mockManager.restore();
  });

  afterAll(async function () {
    await models.Base.knex('segments').del();
  });

  describe('GET /members/', function () {
    it('lists the members of a segment, as its own filter does', async function () {
      const { body: bySegment } = await agent
        .get(`members/?filter=${encodeURIComponent(`segment:${segments.vip}`)}`)
        .expectStatus(200);
      const { body: byFilter } = await agent
        .get(`members/?filter=${encodeURIComponent('label:[vip]')}`)
        .expectStatus(200);

      assert.deepEqual(bySegment.members, byFilter.members);
      assert.deepEqual(
        bySegment.members.map((member: { email: string }) => nameOf(member.email)).sort(),
        ['ada', 'grace'],
      );
    });

    it('accepts a segment id in quotes', async function () {
      assert.deepEqual(await membersList(`segment:'${segments.vip}'`), ['ada', 'grace']);
    });

    it('lists the members of a segment or of another condition', async function () {
      assert.deepEqual(await membersList(`segment:${segments.vip},status:paid`), [
        'ada',
        'alan',
        'grace',
        'katherine',
      ]);
    });

    it('lists the members of a segment who match another condition', async function () {
      assert.deepEqual(await membersList(`segment:${segments.founders}+status:paid`), [
        'alan',
        'grace',
      ]);
    });

    it('lists the members of any segment in a list', async function () {
      assert.deepEqual(
        await membersList(`segment:[${segments.vip},${segments.lapsed}]+status:paid`),
        ['grace', 'katherine'],
      );
    });

    it('lists the members of either of two segments', async function () {
      assert.deepEqual(
        await membersList(`segment:'${segments.vip}',segment:'${segments.founders}'`),
        ['ada', 'alan', 'grace'],
      );
    });

    it('lists the members of both of two segments', async function () {
      assert.deepEqual(await membersList(`segment:${segments.vip}+segment:${segments.founders}`), [
        'grace',
      ]);
    });

    it('lists the members of every segment in a list', async function () {
      assert.deepEqual(await membersList(`segment:[${segments.vip}+${segments.founders}]`), [
        'grace',
      ]);
    });

    it('keeps the conditions of a segment together when the filter names other segments too', async function () {
      // NQL merges the two negations of `label` into one condition when it tidies a whole filter,
      // which must not split the segment's conditions apart
      const filter = 'status:-free+label:-vip+label:-lapsed';
      const unlabelledPaid = await addSegment('Unlabelled paid', filter);

      assert.deepEqual(await membersList(`segment:[${unlabelledPaid},${segments.founders}]`), [
        'alan',
        'grace',
      ]);
      assert.deepEqual(
        await membersList(`segment:[${unlabelledPaid},${segments.founders}]`),
        await membersList(`(${filter}),label:[founder]`),
      );
      assert.deepEqual(await membersList(`segment:${unlabelledPaid},status:free`), [
        'ada',
        'alan',
        'linus',
      ]);
    });

    it('accepts a segment of members with neither of two custom fields', async function () {
      const filter = "metafields.identity:-'custom.company'+metafields.identity:-'custom.city'";
      const withoutEither = await addSegment('Without company or city', filter);

      assert.deepEqual(await membersList(`segment:${withoutEither}`), [
        'alan',
        'katherine',
        'linus',
      ]);
      assert.deepEqual(await membersList(`segment:${withoutEither}`), await membersList(filter));
    });

    it('reads a segment when the query runs, so a member added to it since is included', async function () {
      const { body } = await agent
        .get(`members/?filter=${encodeURIComponent(`email:'${emailOf('linus')}'`)}`)
        .expectStatus(200);
      const linus = body.members[0];
      await agent
        .put(`members/${linus.id}/`)
        .body({ members: [{ labels: ['lapsed'] }] })
        .expectStatus(200);

      try {
        assert.deepEqual(await membersList(`segment:${segments.lapsed}`), ['katherine', 'linus']);
      } finally {
        await agent
          .put(`members/${linus.id}/`)
          .body({ members: [{ labels: [] }] })
          .expectStatus(200);
      }
    });

    it('counts the members of a segment in the total of each page', async function () {
      const { body } = await agent
        .get(`members/?filter=${encodeURIComponent(`segment:${segments.vip}`)}&limit=1`)
        .expectStatus(200);
      assert.equal(body.members.length, 1);
      assert.equal(body.meta.pagination.total, 2);
    });

    it('rejects a segment that does not exist rather than ignoring it', async function () {
      const error = await listError(`segment:${segments.vip},segment:${UNKNOWN_ID}`, 422);
      assert.equal(error.type, 'ValidationError');
      assert.match(error.context, new RegExp(UNKNOWN_ID));
    });

    it('rejects a value that is not a segment id', async function () {
      const error = await listError('segment:vip', 422);
      assert.equal(error.type, 'ValidationError');
    });

    it.each([
      ['no value', 'segment:null'],
      ['a comparison', `segment:>'${UNKNOWN_ID}'`],
      ['a text match', `segment:~'${UNKNOWN_ID}'`],
      ['a number', 'segment:123456789012345678901234'],
    ])('rejects a segment named with %s', async function (_what, filter) {
      const error = await listError(filter, 400);
      assert.equal(error.type, 'BadRequestError');
    });

    it('leaves out the members of a segment', async function () {
      assert.deepEqual(await membersList(`segment:-${segments.vip}`), [
        'alan',
        'katherine',
        'linus',
      ]);
    });

    it('leaves out the members of any of the segments in a list', async function () {
      assert.deepEqual(await membersList(`segment:-[${segments.vip},${segments.lapsed}]`), [
        'alan',
        'linus',
      ]);
    });

    it('lists the members of one segment who are not in another', async function () {
      assert.deepEqual(await membersList(`segment:${segments.vip}+segment:-${segments.founders}`), [
        'ada',
      ]);
    });

    it('accepts a segment inside a negated group', async function () {
      // Everyone but the paid VIPs
      assert.deepEqual(await membersList(`-(segment:${segments.vip}+status:paid)`), [
        'ada',
        'alan',
        'katherine',
        'linus',
      ]);
    });

    it('keeps members with no value in a field the left-out segment filters on', async function () {
      // Only Ada has been seen, so leaving out the members seen this year keeps the others
      const seen = await addSegment('Seen this year', "last_seen_at:>'2025-01-01T00:00:00.000Z'");
      await models.Base.knex('members')
        .where({ email: emailOf('ada') })
        .update({ last_seen_at: '2025-06-01 00:00:00' });

      try {
        assert.deepEqual(await membersList(`segment:-${seen}`), [
          'alan',
          'grace',
          'katherine',
          'linus',
        ]);
      } finally {
        await models.Base.knex('members')
          .where({ email: emailOf('ada') })
          .update({ last_seen_at: null });
      }
    });

    it('rejects a stored segment whose filter names another segment', async function () {
      const nested = ObjectID().toHexString();
      await models.Base.knex('segments').insert({
        id: nested,
        name: 'Nested',
        slug: 'nested',
        filter: `segment:${segments.vip}`,
        sort_order: 99,
        created_at: new Date(),
      });

      try {
        const error = await listError(`segment:${nested}`, 400);
        assert.match(error.context, /names another segment/);
      } finally {
        await models.Base.knex('segments').where({ id: nested }).del();
      }
    });

    it('applies the restricted-field check to the filter of a segment', async function () {
      // The members list drops a condition on a restricted field, as it does when the condition
      // is in the filter itself. If the check didn't see the segment's filter, the query would
      // use a column members don't have and fail with a 500.
      const probe = await addSegment('Probe', "password:~'a'");
      assert.deepEqual(await membersList(`segment:${probe}`), await membersList("password:~'a'"));
    });

    it('applies the restricted-field check to the filter of a left-out segment', async function () {
      // A left-out segment's filter sits inside a negated group, which the check also reads
      const probe = await addSegment('Probe, left out', "password:~'a'");
      assert.deepEqual(
        await membersList(`segment:-${probe}`),
        await membersList("-(password:~'a')"),
      );
    });

    it('rejects a segment while the segmentEmails flag is off', async function () {
      mockManager.mockLabsDisabled('segmentEmails');
      const error = await listError(`segment:${segments.vip}`, 400);
      assert.equal(error.type, 'BadRequestError');
      assert.equal(error.property, 'filter');
    });
  });

  describe('GET /members/upload/', function () {
    it('exports the members of a segment', async function () {
      const { text } = await agent
        .get(`members/upload/?filter=${encodeURIComponent(`segment:${segments.founders}`)}`)
        .expectStatus(200);
      const exported = NAMES.filter((name) => text.includes(emailOf(name)));
      assert.deepEqual(exported, ['alan', 'grace']);
    });
  });

  describe('PUT /members/bulk/ and DELETE /members/', function () {
    it('labels and deletes the members of a segment', async function () {
      const doomed = ['marie', 'rosalind'];
      for (const name of doomed) {
        await agent
          .post('members/')
          .body({ members: [{ email: emailOf(name), name, labels: ['doomed'] }] })
          .expectStatus(201);
      }
      const segment = await addSegment('Doomed', 'label:[doomed]');
      const { body: labels } = await agent
        .post('labels/')
        .body({ labels: [{ name: 'Bulk' }] })
        .expectStatus(201);
      const filter = encodeURIComponent(`segment:${segment}`);

      await agent
        .put(`members/bulk/?filter=${filter}`)
        .body({ bulk: { action: 'addLabel', meta: { label: { id: labels.labels[0].id } } } })
        .expectStatus(200);
      assert.deepEqual(await membersList('label:[bulk]'), doomed);

      await agent.delete(`members/?filter=${filter}`).expectStatus(200);
      const { body } = await agent.get('members/?limit=all').expectStatus(200);
      assert.deepEqual(
        body.members.map((member: { email: string }) => nameOf(member.email)).sort(),
        NAMES,
      );
    });

    it('labels every member but those of a segment', async function () {
      const { body } = await agent
        .post('labels/')
        .body({ labels: [{ name: 'Not VIP' }] })
        .expectStatus(201);
      const label = body.labels[0];

      try {
        await agent
          .put(`members/bulk/?filter=${encodeURIComponent(`segment:-${segments.vip}`)}`)
          .body({ bulk: { action: 'addLabel', meta: { label: { id: label.id } } } })
          .expectStatus(200);
        assert.deepEqual(await membersList(`label:[${label.slug}]`), [
          'alan',
          'katherine',
          'linus',
        ]);
      } finally {
        await agent.delete(`labels/${label.id}/`).expectStatus(204);
      }
    });

    it('deletes every member but those of a segment', async function () {
      const doomed = ['marie', 'rosalind'];
      for (const name of doomed) {
        await agent
          .post('members/')
          .body({ members: [{ email: emailOf(name), name, labels: ['doomed'] }] })
          .expectStatus(201);
      }
      // Every member this suite keeps is in it, so leaving it out selects only the doomed ones
      const kept = await addSegment('Kept', `email:~'segment-filter.example'+label:-[doomed]`);

      await agent
        .delete(`members/?filter=${encodeURIComponent(`segment:-${kept}`)}`)
        .expectStatus(200);
      const { body } = await agent.get('members/?limit=all').expectStatus(200);
      assert.deepEqual(
        body.members.map((member: { email: string }) => nameOf(member.email)).sort(),
        NAMES,
      );
    });

    it('deletes nobody for a left-out segment that filters on a restricted field', async function () {
      const probe = await addSegment('Probe, deleted', "password:~'a'");

      await agent
        .delete(`members/?filter=${encodeURIComponent(`segment:-${probe}`)}`)
        .expectStatus(400);
      const { body } = await agent.get('members/?limit=all').expectStatus(200);
      assert.deepEqual(
        body.members.map((member: { email: string }) => nameOf(member.email)).sort(),
        NAMES,
      );
    });
  });

  describe('Saving a segment', function () {
    it('rejects a filter that names another segment', async function () {
      const { body } = await agent
        .post('segments/')
        .body({ segments: [{ name: 'Nested', filter: `segment:${segments.vip}+status:paid` }] })
        .expectStatus(422);
      assert.equal(body.errors[0].property, 'filter');
    });
  });

  describe('Posts', function () {
    async function addDraft() {
      const { body } = await agent
        .post('posts/')
        .body({ posts: [{ title: 'Segment filters', status: 'draft' }] })
        .expectStatus(201);
      return body.posts[0];
    }

    it('rejects scheduling an email to a filter that names a segment', async function () {
      const draft = await addDraft();
      const { body: newsletters } = await agent.get('newsletters/?limit=1').expectStatus(200);
      const filter = encodeURIComponent(`segment:${segments.vip}`);

      const { body } = await agent
        .put(
          `posts/${draft.id}/?newsletter=${newsletters.newsletters[0].slug}&email_segment=${filter}`,
        )
        .body({
          posts: [
            {
              status: 'scheduled',
              published_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              updated_at: draft.updated_at,
            },
          ],
        })
        .expectStatus(400);
      assert.match(body.errors[0].context, /Emails cannot be sent to a segment yet/);
    });

    it('rejects publishing an email to a filter that names a segment', async function () {
      const draft = await addDraft();
      const { body: newsletters } = await agent.get('newsletters/?limit=1').expectStatus(200);
      const filter = encodeURIComponent(`segment:${segments.vip}`);

      const { body: rejected } = await agent
        .put(
          `posts/${draft.id}/?newsletter=${newsletters.newsletters[0].slug}&email_segment=${filter}`,
        )
        .body({ posts: [{ status: 'published', updated_at: draft.updated_at }] })
        .expectStatus(400);
      assert.match(rejected.errors[0].context, /Emails cannot be sent to a segment yet/);
      const { body } = await agent.get(`posts/${draft.id}/`).expectStatus(200);
      assert.equal(body.posts[0].status, 'draft');
    });

    it('rejects a visibility that names a segment', async function () {
      const draft = await addDraft();
      await agent
        .put(`posts/${draft.id}/`)
        .body({
          posts: [{ visibility: `segment:-${segments.vip}`, updated_at: draft.updated_at }],
        })
        .expectStatus(422);
    });
  });

  describe('who can filter by segment', function () {
    // Each sign-in counts towards the login attempt limit, so clear it before signing the owner
    // back in.
    afterEach(async function () {
      await dbUtils.truncate('rate_limits');
      await agent.loginAsOwner();
    });

    it('lets an Admin integration filter members by segment', async function () {
      await agent.useZapierAdminAPIKey();
      assert.deepEqual(await membersList(`segment:${segments.founders}`), ['alan', 'grace']);
    });
  });
});
