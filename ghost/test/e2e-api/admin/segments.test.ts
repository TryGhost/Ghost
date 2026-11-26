import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import ObjectID from 'bson-objectid';
import type { SpanDocument } from '../../../core/server/lib/tracing/create-tracer';

const {
  agentProvider,
  assertions,
  dbUtils,
  fixtureManager,
  matchers,
  mockManager,
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

const { anyContentLength, anyContentVersion, anyErrorId, anyEtag, anyLocationFor, anyObjectId } =
  matchers;
const { cacheInvalidateHeaderNotSet } = assertions;

type Segment = { id: string; name: string; slug: string; filter: string };

type ApiResponse = {
  headers: Record<string, string | undefined>;
  body: {
    segments: Segment[];
    settings: { key: string; value: string | null }[];
    users: { id: string }[];
    actions: {
      event: string;
      actor_type: string;
      context: string | null;
      resource?: { id: string; name: string };
    }[];
    errors: {
      type: string;
      code: string | null;
      context: string | null;
      property: string | null;
      details: { message: string }[] | null;
    }[];
  };
};

type ApiRequest = Promise<ApiResponse> & {
  body(payload: object): ApiRequest;
  expect(callback: (response: ApiResponse) => void): ApiRequest;
  expectStatus(status: number): ApiRequest;
  expectEmptyBody(): ApiRequest;
  matchHeaderSnapshot(match?: object): ApiRequest;
  matchBodySnapshot(match?: object): ApiRequest;
};

type AdminAgent = {
  get(url: string): ApiRequest;
  post(url: string): ApiRequest;
  put(url: string): ApiRequest;
  delete(url: string): ApiRequest;
  loginAsOwner(): Promise<void>;
  loginAsAdmin(): Promise<void>;
  loginAsEditor(): Promise<void>;
  loginAsContributor(): Promise<void>;
  useZapierAdminAPIKey(): Promise<void>;
  useBackupAdminAPIKey(): Promise<void>;
};

const UNKNOWN_ID = '0123456789abcdef01234567';

/** A saved member view as Admin writes one. */
const memberView = (name: string, filter: string) => ({
  name,
  route: 'members',
  filter: { filter },
});

const readHeaders = { 'content-version': anyContentVersion, etag: anyEtag };
const writeHeaders = { ...readHeaders, 'content-length': anyContentLength };
const errorBody = { errors: [{ id: anyErrorId }] };
/** A response with one segment. Its id is new each time. */
const oneSegment = { segments: [{ id: anyObjectId }] };

describe('Segments Admin API', function () {
  let agent: AdminAgent;

  /** Saves `value` as `shared_views` through the settings API, as Admin does. */
  async function saveSharedViews(value: string | null) {
    await agent
      .put('settings/')
      .body({ settings: [{ key: 'shared_views', value }] })
      .expectStatus(200);
  }

  /** `shared_views` as it is stored. */
  async function storedSharedViews() {
    const row = await models.Base.knex('settings').where('key', 'shared_views').first('value');
    return row?.value;
  }

  async function browse() {
    const { body } = await agent.get('segments/').expectStatus(200);
    return body.segments;
  }

  async function add(name: string, filter: string, extra: Record<string, unknown> = {}) {
    const { body } = await agent
      .post('segments/')
      .body({ segments: [{ ...extra, name, filter }] })
      .expectStatus(201)
      .expect(cacheInvalidateHeaderNotSet());
    return body.segments[0];
  }

  async function rename(id: string, name: string) {
    const { body } = await agent
      .put(`segments/${id}/`)
      .body({ segments: [{ name }] })
      .expectStatus(200)
      .expect(cacheInvalidateHeaderNotSet());
    return body.segments[0];
  }

  /** The type, code, message and property of the validation error `request` is rejected with. */
  async function validationError(request: ApiRequest) {
    const { body } = await request.expectStatus(422);
    const [{ type, code, context, property }] = body.errors;
    return { type, code, context, property };
  }

  const addError = (segment: Record<string, unknown>) =>
    validationError(agent.post('segments/').body({ segments: [segment] }));

  const renameError = (id: string, change: Record<string, unknown>) =>
    validationError(agent.put(`segments/${id}/`).body({ segments: [change] }));

  /**
   * The field and message of the validation error that `request` is rejected with because its body
   * doesn't match the request schema. The framework rejects such a body before anything else
   * runs, with no code and the schema's issues as `details`.
   */
  async function bodyError(request: ApiRequest) {
    const { body } = await request.expectStatus(422);
    const [{ code, context, property, details }] = body.errors;
    assert.equal(code, null);
    assert.equal(context, 'Validation failed for body.');
    return { property, message: details?.[0].message };
  }

  const addBodyError = (body: object) => bodyError(agent.post('segments/').body(body));

  const renameBodyError = (id: string, change: Record<string, unknown>) =>
    bodyError(agent.put(`segments/${id}/`).body({ segments: [change] }));

  const NAME_TAKEN = {
    type: 'ValidationError',
    code: 'SEGMENT_NAME_TAKEN',
    context: 'A segment with this name already exists',
    property: 'name',
  };
  const NAME_EMPTY = { property: 'body.segments.0.name', message: 'Name cannot be empty' };
  const SLUG_TAKEN = {
    type: 'ValidationError',
    code: 'SEGMENT_SLUG_TAKEN',
    context: 'A segment with this slug already exists',
    property: 'slug',
  };
  const SLUG_UNUSABLE = {
    type: 'ValidationError',
    code: 'SEGMENT_SLUG_UNUSABLE',
    context:
      "A filter can't name a segment by this slug, as it reads the slug as something else, such as a number or a date",
    property: 'slug',
  };
  const SLUG_FORMAT =
    'Slug can only contain lowercase letters and digits, in words joined by single hyphens';

  /**
   * Waits until a statement on the segments table waits for a lock another transaction holds,
   * such as an insert of a slug that another transaction has inserted and not yet committed.
   */
  async function lockWaitOnSegments() {
    for (let tries = 0; tries < 250; tries += 1) {
      const [rows]: [{ waiting: number }[]] = await models.Base.knex.raw(
        `SELECT COUNT(*) AS waiting
           FROM performance_schema.data_lock_waits waits
           JOIN performance_schema.data_locks locks
             ON locks.ENGINE_LOCK_ID = waits.REQUESTING_ENGINE_LOCK_ID
          WHERE locks.OBJECT_SCHEMA = DATABASE() AND locks.OBJECT_NAME = 'segments'`,
      );
      if (rows[0].waiting > 0) {
        return;
      }
      await sleep(20);
    }
    assert.fail('Nothing waited for a lock on the segments table');
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  afterEach(async function () {
    await models.Base.knex('segments').del();
    await saveSharedViews('[]');
  });

  describe('GET /segments/', function () {
    it('returns no segments when none are saved', async function () {
      await agent
        .get('segments/')
        .expectStatus(200)
        .matchHeaderSnapshot(readHeaders)
        .matchBodySnapshot();
    });

    it('lists the segments', async function () {
      await add('VIP', 'label:vip');

      await agent
        .get('segments/')
        .expectStatus(200)
        .matchHeaderSnapshot(readHeaders)
        .matchBodySnapshot(oneSegment);
    });
  });

  describe('POST /segments/', function () {
    it('adds a segment', async function () {
      await agent
        .post('segments/')
        .body({ segments: [{ name: 'VIP', filter: 'label:vip' }] })
        .expectStatus(201)
        .expect(cacheInvalidateHeaderNotSet())
        .matchHeaderSnapshot({ ...writeHeaders, location: anyLocationFor('segments') })
        .matchBodySnapshot(oneSegment);
    });

    it('adds each segment after the others', async function () {
      await add('Free', 'status:free');
      await add('Paid', 'status:paid');
      await add('Comped', 'status:comped');

      assert.deepEqual(
        (await browse()).map((segment) => segment.name),
        ['Free', 'Paid', 'Comped'],
      );
    });

    it('saves the name without surrounding whitespace', async function () {
      const segment = await add('  VIP  ', 'label:vip');

      assert.equal(segment.name, 'VIP');
      assert.equal((await browse())[0].name, 'VIP');
    });

    it('rejects a name another segment has, ignoring case and whitespace', async function () {
      await add('VIP', 'label:vip');

      await agent
        .post('segments/')
        .body({ segments: [{ name: ' vip ', filter: 'label:gold' }] })
        .expectStatus(422)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
      assert.equal((await browse()).length, 1);
    });

    it("rejects a name the database counts as another segment's", async function () {
      // Names are compared ignoring case, and MySQL's default collation also ignores accents.
      await add('Cafe', 'label:cafe');

      assert.deepEqual(await addError({ name: 'Café', filter: 'label:accent' }), NAME_TAKEN);
      assert.equal((await browse()).length, 1);
    });

    it('accepts the name of a posts view', async function () {
      await saveSharedViews(
        JSON.stringify([{ name: 'Drafts', route: 'posts', filter: { type: 'draft' } }]),
      );

      assert.equal((await add('Drafts', 'status:free')).name, 'Drafts');
    });

    it('rejects an empty name', async function () {
      assert.deepEqual(
        await addBodyError({ segments: [{ name: '   ', filter: 'label:vip' }] }),
        NAME_EMPTY,
      );
      assert.deepEqual(await browse(), []);
    });

    it('accepts a name of up to 191 characters, counted after trimming', async function () {
      assert.equal((await add(`  ${'a'.repeat(191)}  `, 'label:a')).name, 'a'.repeat(191));
      assert.equal((await add('😀'.repeat(191), 'label:emoji')).name, '😀'.repeat(191));
    });

    it('rejects a name longer than 191 characters', async function () {
      assert.deepEqual(
        await addBodyError({ segments: [{ name: 'a'.repeat(192), filter: 'label:a' }] }),
        { property: 'body.segments.0.name', message: 'Name cannot be longer than 191 characters' },
      );
      assert.deepEqual(await browse(), []);
    });

    it('rejects an empty or missing filter', async function () {
      assert.deepEqual(await addBodyError({ segments: [{ name: 'VIP', filter: '' }] }), {
        property: 'body.segments.0.filter',
        message: 'Filter cannot be empty',
      });
      assert.deepEqual(await addBodyError({ segments: [{ name: 'VIP' }] }), {
        property: 'body.segments.0.filter',
        message: 'Filter must be a string',
      });
    });

    it('rejects a filter longer than the table holds', async function () {
      // The column holds 65535 bytes, and "é" is two bytes.
      assert.equal((await add('Long', 'x'.repeat(65535))).filter.length, 65535);
      assert.deepEqual(
        await addBodyError({ segments: [{ name: 'Longer', filter: 'é'.repeat(32768) }] }),
        {
          property: 'body.segments.0.filter',
          message: 'Filter cannot be longer than 65535 bytes',
        },
      );
    });

    it.each([
      ['no segments key', {}],
      ['an empty segments array', { segments: [] }],
      [
        'two segments',
        {
          segments: [
            { name: 'VIP', filter: 'label:vip' },
            { name: 'Gold', filter: 'label:gold' },
          ],
        },
      ],
    ])('rejects a body with %s, as it must hold exactly one segment', async function (_, body) {
      assert.equal((await addBodyError(body)).property, 'body.segments');
      assert.deepEqual(await browse(), []);
    });

    it('rejects a field it does not know', async function () {
      await agent
        .post('segments/')
        .body({ segments: [{ name: 'VIP', filter: 'label:vip', colour: 'yellow' }] })
        .expectStatus(422)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
      assert.deepEqual(await browse(), []);
    });

    it('ignores an id, which is read-only', async function () {
      const segment = await add('VIP', 'label:vip', { id: UNKNOWN_ID });

      assert.notEqual(segment.id, UNKNOWN_ID);
      assert.deepEqual(await browse(), [segment]);
    });

    it('adds a segment under the slug it is given', async function () {
      const segment = await add('VIP', 'label:vip', { slug: 'customers' });

      assert.equal(segment.slug, 'customers');
      assert.deepEqual(await browse(), [segment]);
    });

    it('rejects a slug another segment has', async function () {
      await add('VIP', 'label:vip');

      assert.deepEqual(
        await addError({ name: 'Gold', filter: 'label:gold', slug: 'vip' }),
        SLUG_TAKEN,
      );
      assert.equal((await browse()).length, 1);
    });

    it("rejects a slug a filter can't name a segment by", async function () {
      // The filter parser reads these as a number and as no value
      for (const slug of ['2024', 'null']) {
        assert.deepEqual(
          await addError({ name: 'Gold', filter: 'label:gold', slug }),
          SLUG_UNUSABLE,
        );
      }
      const outOfFormat: [unknown, string][] = [
        ['Not a slug', SLUG_FORMAT],
        ['VIP', SLUG_FORMAT],
        ['a'.repeat(192), 'Slug cannot be longer than 191 characters'],
        [null, 'Slug must be a string'],
      ];
      for (const [slug, message] of outOfFormat) {
        assert.deepEqual(
          await addBodyError({ segments: [{ name: 'Gold', filter: 'label:gold', slug }] }),
          { property: 'body.segments.0.slug', message },
        );
      }
      assert.deepEqual(await browse(), []);
    });

    it('mints a slug from the name, which the filter parser reads back without quotes', async function () {
      // Each name with the slug it mints, in the order they are added
      const slugs = [
        ['All paid', 'all-paid'],
        ['All paid!', 'all-paid-2'],
        ['Café crème', 'cafe-creme'],
        ['日本語', 'ri-ben-yu'],
        ["Sam's list", 'sams-list'],
        ['--Gold members!!', 'gold-members'],
        ['🎉', 'segment'],
        ['🎉🎉', 'segment-2'],
        ['2024', 'segment-2024'],
        ['007', 'segment-007'],
        ['Null', 'segment-null'],
        ['True', 'segment-true'],
        ['FALSE', 'segment-false'],
        ['now -1d', 'segment-now-1d'],
        [`${'a'.repeat(185)} bcdef`, 'a'.repeat(185)],
        [`${'a'.repeat(185)} bcdeg`, `${'a'.repeat(185)}-2`],
      ];

      for (const [name] of slugs) {
        await add(name, 'status:free');
      }

      assert.deepEqual(
        (await browse()).map(({ name, slug }) => [name, slug]),
        slugs,
      );
    });

    it('rejects a segment when every slug its name mints is taken', async function () {
      // A name mints its slug, and then that slug with -2 and so on up to -1000.
      const taken = ['vip', ...Array.from({ length: 999 }, (_, index) => `vip-${index + 2}`)];
      await models.Base.knex.batchInsert(
        'segments',
        taken.map((slug, index) => ({
          id: ObjectID().toHexString(),
          name: `Taken ${index}`,
          slug,
          filter: 'label:vip',
          sort_order: index,
          created_at: new Date(),
        })),
        500,
      );

      assert.deepEqual(await addError({ name: 'VIP', filter: 'label:vip' }), {
        type: 'ValidationError',
        code: 'SEGMENT_NO_FREE_SLUG',
        context: 'Could not mint a unique slug for this segment.',
        property: 'slug',
      });
      assert.equal((await browse()).length, taken.length);
    });

    it('gives a segment the next slug when another request takes its slug at the same time', async function () {
      // Another request adds a segment whose name mints the same slug, and commits it once this
      // request has read which slugs are taken and is waiting to insert its own.
      const other = await models.Base.knex.transaction();
      let adding: Promise<ApiResponse> | undefined;
      try {
        await other('segments').insert({
          id: ObjectID().toHexString(),
          name: 'All paid!',
          slug: 'all-paid',
          filter: 'status:paid',
          sort_order: 0,
          created_at: new Date(),
        });
        adding = Promise.resolve(
          agent
            .post('segments/')
            .body({ segments: [{ name: 'All paid', filter: 'status:paid' }] })
            .expectStatus(201),
        );
        await lockWaitOnSegments();
        await other.commit();

        const { body } = await adding;
        assert.equal(body.segments[0].slug, 'all-paid-2');
      } finally {
        if (!other.isCompleted()) {
          await other.rollback();
        }
        // The request waits on `other`, so once `other` has ended it finishes. It is awaited
        // here, so that it can't add a segment after this test has failed and been cleaned up.
        await adding?.catch(() => {});
      }
      assert.deepEqual(
        (await browse())
          .map(({ name, slug }) => ({ name, slug }))
          .sort((a, b) => a.slug.localeCompare(b.slug)),
        [
          { name: 'All paid!', slug: 'all-paid' },
          { name: 'All paid', slug: 'all-paid-2' },
        ],
      );
    });

    it('accepts a filter it does not check against members', async function () {
      assert.equal((await add('Odd', 'not a real field:yes')).filter, 'not a real field:yes');
    });

    it('adds a segment with a filter another segment has, as a segment of its own', async function () {
      const first = await add('VIP', 'label:vip');
      const second = await add('Gold', 'label:vip');

      assert.notEqual(second.id, first.id);
      assert.deepEqual(await browse(), [first, second]);
    });

    it('rejects a slug it is given that another request takes at the same time', async function () {
      // Another request adds a segment with the slug, and commits it once this request has read
      // which slugs are taken and is waiting to insert its own.
      const other = await models.Base.knex.transaction();
      let adding: Promise<ApiResponse> | undefined;
      try {
        await other('segments').insert({
          id: ObjectID().toHexString(),
          name: 'Customers',
          slug: 'customers',
          filter: 'status:paid',
          sort_order: 0,
          created_at: new Date(),
        });
        adding = Promise.resolve(
          agent
            .post('segments/')
            .body({ segments: [{ name: 'VIP', filter: 'label:vip', slug: 'customers' }] })
            .expectStatus(422),
        );
        await lockWaitOnSegments();
        await other.commit();

        const { body } = await adding;
        const [{ type, code, context, property }] = body.errors;
        assert.deepEqual({ type, code, context, property }, SLUG_TAKEN);
      } finally {
        if (!other.isCompleted()) {
          await other.rollback();
        }
        // The request waits on `other`, so once `other` has ended it finishes. It is awaited
        // here, so that it can't add a segment after this test has failed and been cleaned up.
        await adding?.catch(() => {});
      }
      assert.deepEqual(
        (await browse()).map(({ name, slug }) => ({ name, slug })),
        [{ name: 'Customers', slug: 'customers' }],
      );
    });

    it('gives a segment a new id and the same slug when it is added again after being deleted', async function () {
      const first = await add('VIP', 'label:vip');
      await agent.delete(`segments/${first.id}/`).expectStatus(204);

      const second = await add('VIP', 'label:vip');

      assert.notEqual(second.id, first.id);
      assert.equal(second.slug, 'vip');
    });

    it('rejects a name that another request takes at the same time', async function () {
      const responses = await Promise.all(
        ['label:one', 'label:two'].map((filter) =>
          agent.post('segments/').body({ segments: [{ name: 'Same', filter }] }),
        ),
      );

      const rejected = responses.flatMap(({ body }) => body.errors ?? []);
      assert.deepEqual(
        rejected.map(({ type, code, context, property }) => ({ type, code, context, property })),
        [NAME_TAKEN],
      );
      assert.deepEqual(
        (await browse()).map(({ name }) => name),
        ['Same'],
      );
    });

    it('keeps every segment added at the same time', async function () {
      const names = ['One', 'Two', 'Three', 'Four', 'Five'];

      await Promise.all(names.map((name) => add(name, `label:${name.toLowerCase()}`)));

      assert.deepEqual((await browse()).map((segment) => segment.name).sort(), [...names].sort());
    });
  });

  describe('GET /segments/:id/', function () {
    it('returns the segment', async function () {
      const { id } = await add('VIP', 'label:vip');

      await agent
        .get(`segments/${id}/`)
        .expectStatus(200)
        .matchHeaderSnapshot(readHeaders)
        .matchBodySnapshot(oneSegment);
    });

    it('returns a 404 for an id no segment has', async function () {
      await agent
        .get(`segments/${UNKNOWN_ID}/`)
        .expectStatus(404)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
    });
  });

  describe('PUT /segments/:id/', function () {
    it('renames the segment', async function () {
      const { id } = await add('VIP', 'label:vip');

      await agent
        .put(`segments/${id}/`)
        .body({ segments: [{ name: 'Very important' }] })
        .expectStatus(200)
        .expect(cacheInvalidateHeaderNotSet())
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(oneSegment);
    });

    it('keeps the segment in its place, and its id and its slug the same', async function () {
      await add('Free', 'status:free');
      const paid = await add('Paid', 'status:paid');
      await add('Comped', 'status:comped');

      const renamed = await rename(paid.id, 'Paying');

      assert.equal(renamed.id, paid.id);
      assert.equal(renamed.slug, 'paid');
      assert.deepEqual(
        (await browse()).map((segment) => segment.name),
        ['Free', 'Paying', 'Comped'],
      );
    });

    it('accepts the name the segment already has, in another case', async function () {
      const { id } = await add('VIP', 'label:vip');

      assert.equal((await rename(id, ' vip ')).name, 'vip');
    });

    it('rejects a name another segment has', async function () {
      await add('VIP', 'label:vip');
      const { id } = await add('Gold', 'label:gold');

      assert.deepEqual(await renameError(id, { name: 'Vip' }), NAME_TAKEN);
    });

    it('rejects an empty name', async function () {
      const { id } = await add('VIP', 'label:vip');

      assert.deepEqual(await renameBodyError(id, { name: '' }), NAME_EMPTY);
    });

    it('accepts the segment as GET returns it', async function () {
      const { id } = await add('VIP', 'label:vip');
      const { body } = await agent.get(`segments/${id}/`).expectStatus(200);

      const saved = await agent
        .put(`segments/${id}/`)
        .body(body)
        .expectStatus(200)
        .expect(cacheInvalidateHeaderNotSet());

      assert.deepEqual(saved.body, body);
      assert.deepEqual(await browse(), body.segments);
    });

    it('rejects a different filter, and changes nothing', async function () {
      const { id } = await add('VIP', 'label:vip');

      await agent
        .put(`segments/${id}/`)
        .body({ segments: [{ name: 'Gold', filter: 'label:gold' }] })
        .expectStatus(422)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
      assert.deepEqual(await browse(), [{ id, name: 'VIP', slug: 'vip', filter: 'label:vip' }]);
    });

    it('rejects a different slug, and changes nothing', async function () {
      const { id } = await add('VIP', 'label:vip');
      await add('Gold', 'label:gold');

      assert.deepEqual(await renameError(id, { name: 'Very important', slug: 'gold' }), {
        type: 'ValidationError',
        code: 'SEGMENT_SLUG_CHANGED',
        context: "A segment's slug cannot be changed",
        property: 'slug',
      });
      assert.deepEqual(await renameBodyError(id, { name: 'Very important', slug: 'Gold!' }), {
        property: 'body.segments.0.slug',
        message:
          'Slug can only contain lowercase letters and digits, in words joined by single hyphens',
      });
      for (const slug of [null, 7, ['vip'], { slug: 'vip' }]) {
        assert.deepEqual(await renameBodyError(id, { name: 'Very important', slug }), {
          property: 'body.segments.0.slug',
          message: 'Slug must be a string',
        });
      }
      assert.deepEqual(
        (await browse()).map(({ name, slug }) => ({ name, slug })),
        [
          { name: 'VIP', slug: 'vip' },
          { name: 'Gold', slug: 'gold' },
        ],
      );
    });

    it('rejects a field it does not know, rather than renaming the segment', async function () {
      const { id } = await add('VIP', 'label:vip');

      assert.deepEqual(await renameBodyError(id, { name: 'Gold', fliter: 'label:gold' }), {
        property: 'body.segments.0',
        message: 'Unrecognized key: "fliter"',
      });
      assert.deepEqual(await browse(), [{ id, name: 'VIP', slug: 'vip', filter: 'label:vip' }]);
    });

    it('returns a 404 for an id no segment has', async function () {
      await agent
        .put(`segments/${UNKNOWN_ID}/`)
        .body({ segments: [{ name: 'VIP' }] })
        .expectStatus(404)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
    });
  });

  describe('DELETE /segments/:id/', function () {
    it('removes the segment', async function () {
      await add('Free', 'status:free');
      const { id } = await add('VIP', 'label:vip');

      await agent
        .delete(`segments/${id}/`)
        .expectStatus(204)
        .expectEmptyBody()
        .expect(cacheInvalidateHeaderNotSet())
        .matchHeaderSnapshot(readHeaders);
      assert.deepEqual(
        (await browse()).map((segment) => segment.name),
        ['Free'],
      );
      await agent.get(`segments/${id}/`).expectStatus(404);
    });

    it('returns a 404 for an id no segment has', async function () {
      await agent
        .delete(`segments/${UNKNOWN_ID}/`)
        .expectStatus(404)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
    });
  });

  describe('the saved views setting', function () {
    const postsView = { name: 'Drafts', route: 'posts', filter: { type: 'draft' }, color: 'blue' };

    it('leaves the setting, which holds the views of the posts list, as it is', async function () {
      const stored = JSON.stringify([postsView]);
      await saveSharedViews(stored);

      const { id } = await add('VIP', 'label:vip');
      await rename(id, 'Gold');
      await agent.delete(`segments/${id}/`).expectStatus(204);

      assert.equal(await storedSharedViews(), stored);
    });

    it('does not list a member view saved through the settings API', async function () {
      await saveSharedViews(JSON.stringify([postsView, memberView('VIP', 'label:vip')]));

      assert.deepEqual(await browse(), []);
      assert.equal((await add('VIP', 'label:vip')).name, 'VIP');
    });
  });

  describe('spans', function () {
    let metrics: { tracked(name: string): SpanDocument[] };

    type Command = 'add' | 'edit' | 'delete';
    const spans = (command: Command) => metrics.tracked(`segments.${command}`);
    const failedSpans = (command: Command) =>
      spans(command).filter(({ event }) => event.outcome === 'failure');

    beforeEach(function () {
      metrics = mockManager.mockMetrics();
    });

    afterEach(function () {
      mockManager.restore();
    });

    it('records a successful span for each add, rename and delete', async function () {
      const { id } = await add('VIP', 'label:vip');
      await rename(id, 'Gold');
      await agent.delete(`segments/${id}/`).expectStatus(204);

      for (const command of ['add', 'edit', 'delete'] as const) {
        expect(spans(command)).toMatchObject([{ event: { outcome: 'success' }, labels: {} }]);
        assert.deepEqual(spans(command)[0].labels, {});
      }
    });

    it('records why a change was rejected', async function () {
      const { id } = await add('VIP', 'label:vip');
      await add('Free', 'status:free');

      await addError({ name: 'vip', filter: 'label:gold' });
      await addError({ name: 'Gold', filter: 'label:gold', slug: 'vip' });
      await addError({ name: 'Gold', filter: 'label:gold', slug: '2024' });
      await renameError(id, { name: 'Free' });
      await renameError(id, { name: 'VIP', filter: 'label:gold' });
      await renameError(id, { name: 'VIP', slug: 'free' });
      await agent
        .put(`segments/${UNKNOWN_ID}/`)
        .body({ segments: [{ name: 'Gold' }] })
        .expectStatus(404);
      await agent.delete(`segments/${UNKNOWN_ID}/`).expectStatus(404);

      const rejected = (type: string, rejection: string) => ({
        error: { type },
        labels: { rejection },
      });
      // A span records an error's code as its type, when the error has one.
      expect(failedSpans('add')).toMatchObject([
        rejected('SEGMENT_NAME_TAKEN', 'name_taken'),
        rejected('SEGMENT_SLUG_TAKEN', 'slug_taken'),
        rejected('SEGMENT_SLUG_UNUSABLE', 'slug_unusable'),
      ]);
      expect(failedSpans('edit')).toMatchObject([
        rejected('SEGMENT_NAME_TAKEN', 'name_taken'),
        rejected('SEGMENT_FILTER_CHANGED', 'filter_changed'),
        rejected('SEGMENT_SLUG_CHANGED', 'slug_changed'),
        rejected('NotFoundError', 'not_found'),
      ]);
      expect(failedSpans('delete')).toMatchObject([rejected('NotFoundError', 'not_found')]);
    });

    it('records a name the database counts as taken as a rejection', async function () {
      await add('Cafe', 'label:cafe');

      await addError({ name: 'Café', filter: 'label:accent' });

      expect(failedSpans('add')).toMatchObject([
        { error: { type: 'SEGMENT_NAME_TAKEN' }, labels: { rejection: 'name_taken' } },
      ]);
    });

    it('marks a rename to the same name as unchanged', async function () {
      const { id } = await add('VIP', 'label:vip');

      await rename(id, 'VIP');

      expect(spans('edit')).toMatchObject([
        { event: { outcome: 'success' }, labels: { unchanged: true } },
      ]);
    });

    it('records no span for a request that fails body validation, or for a read', async function () {
      await addBodyError({ segments: [{ name: '', filter: 'label:vip' }] });
      await browse();

      assert.deepEqual([...spans('add'), ...spans('edit'), ...spans('delete')], []);
    });
  });

  describe('History', function () {
    let adminId: string;

    type StoredAction = { resource_id: string; event: string; context: string };

    /** The administrator's actions on segments, as they're stored, in the order they were made. */
    const segmentActions = async () => {
      const actions: StoredAction[] = await models.Base.knex('actions')
        .where({ resource_type: 'segment', actor_id: adminId, actor_type: 'user' })
        .orderBy('id')
        .select('resource_id', 'event', 'context');
      return actions.map(({ context, ...action }) => ({ ...action, context: JSON.parse(context) }));
    };

    beforeEach(async function () {
      await agent.loginAsAdmin();
      adminId = (await agent.get('users/me/').expectStatus(200)).body.users[0].id;
      await models.Base.knex('actions').where({ actor_id: adminId }).del();
    });

    afterEach(async function () {
      await dbUtils.truncate('rate_limits');
      await agent.loginAsOwner();
    });

    it('records each change as an action on the segment, with the name it then had', async function () {
      const { id } = await add('VIP', 'label:vip');
      await rename(id, 'Gold');
      await agent.delete(`segments/${id}/`).expectStatus(204);

      assert.deepEqual(await segmentActions(), [
        { resource_id: id, event: 'added', context: { primary_name: 'VIP' } },
        { resource_id: id, event: 'edited', context: { primary_name: 'Gold' } },
        { resource_id: id, event: 'deleted', context: { primary_name: 'Gold' } },
      ]);
    });

    it('records nothing for a rename to the name the segment already has', async function () {
      const { id } = await add('VIP', 'label:vip');
      const recorded = (await segmentActions()).length;

      assert.equal((await rename(id, 'VIP')).name, 'VIP');

      assert.equal((await segmentActions()).length, recorded);
    });

    it('loads the segment as the resource of the action', async function () {
      const { id } = await add('VIP', 'label:vip');

      const filter = encodeURIComponent(`resource_type:segment+actor_id:'${adminId}'`);
      const { body } = await agent
        .get(`actions/?filter=${filter}&include=resource`)
        .expectStatus(200);

      assert.equal(body.actions.length, 1);
      assert.equal(body.actions[0].resource?.id, id);
      assert.equal(body.actions[0].resource?.name, 'VIP');
    });

    // The saved views setting holds the posts list's views, and is still saved as a setting.
    it('records no segment action for a save of the saved views setting', async function () {
      await saveSharedViews(JSON.stringify([memberView('Free', 'status:free')]));

      assert.deepEqual(await segmentActions(), []);
    });
  });

  describe('permissions', function () {
    // Each sign-in counts towards the login attempt limit, so clear it before signing the
    // owner back in.
    afterEach(async function () {
      await dbUtils.truncate('rate_limits');
      await agent.loginAsOwner();
    });

    it('lets an administrator add, rename and remove segments', async function () {
      await agent.loginAsAdmin();

      const { id } = await add('VIP', 'label:vip');
      await rename(id, 'Gold');
      await agent.delete(`segments/${id}/`).expectStatus(204);
      assert.deepEqual(await browse(), []);
    });

    it.each([
      ['an editor', (a: AdminAgent) => a.loginAsEditor()],
      ['a contributor', (a: AdminAgent) => a.loginAsContributor()],
      // Integration API keys can read settings but not change them, so the same holds for
      // segments.
      ['an Admin integration', (a: AdminAgent) => a.useZapierAdminAPIKey()],
    ])('lets %s list segments but not change them', async function (_role, signIn) {
      const { id } = await add('VIP', 'label:vip');
      await signIn(agent);

      assert.deepEqual(
        (await browse()).map((segment) => segment.name),
        ['VIP'],
      );
      await agent.get(`segments/${id}/`).expectStatus(200);
      await agent
        .post('segments/')
        .body({ segments: [{ name: 'Gold', filter: 'label:gold' }] })
        .expectStatus(403);
      await agent
        .put(`segments/${id}/`)
        .body({ segments: [{ name: 'Gold' }] })
        .expectStatus(403);
      await agent.delete(`segments/${id}/`).expectStatus(403);
    });

    // The framework validates a request's body before it checks permissions, so a caller who
    // can't change segments learns that an invalid body is invalid before being refused.
    it('validates the body before checking that the caller can change segments', async function () {
      const { id } = await add('VIP', 'label:vip');
      await agent.loginAsEditor();

      assert.deepEqual(await addBodyError({ segments: [{ name: '', filter: 'label:gold' }] }), {
        property: 'body.segments.0.name',
        message: 'Name cannot be empty',
      });
      await agent
        .post('segments/')
        .body({ segments: [{ name: 'Gold', filter: 'label:gold' }] })
        .expectStatus(403);

      assert.deepEqual(await renameBodyError(id, { name: '' }), NAME_EMPTY);
      await agent
        .put(`segments/${id}/`)
        .body({ segments: [{ name: 'Gold' }] })
        .expectStatus(403);
    });

    it('keeps out an integration that cannot read settings', async function () {
      await agent.useBackupAdminAPIKey();

      await agent.get('settings/').expectStatus(403);
      await agent
        .get('segments/')
        .expectStatus(403)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
    });
  });
});
