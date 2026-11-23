import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { SpanDocument } from '../../../core/server/lib/tracing/create-tracer';

const {
  agentProvider,
  assertions,
  dbUtils,
  fixtureManager,
  matchers,
  mockManager,
} = require('../../utils/e2e-framework');
// Required, not imported, so the test uses the instances Ghost runs with.
const logging = require('@tryghost/logging');
const models = require('../../../core/server/models');
const settingsCache: typeof import('../../../core/shared/settings-cache') = require('../../../core/shared/settings-cache');

const { anyContentLength, anyContentVersion, anyErrorId, anyEtag, anyLocationFor } = matchers;
const { cacheInvalidateHeaderNotSet } = assertions;

type Segment = { id: string; name: string; filter: string };

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
      resource?: { id: string };
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

describe('Segments Admin API', function () {
  let agent: AdminAgent;

  /** Saves `value` as `shared_views` through the settings API, as Admin does. */
  async function saveSharedViews(value: string | null) {
    await agent
      .put('settings/')
      .body({ settings: [{ key: 'shared_views', value }] })
      .expectStatus(200);
  }

  /** `shared_views` as the settings API returns it to Admin. */
  async function readSharedViews() {
    const { body } = await agent.get('settings/').expectStatus(200);
    return body.settings.find((setting) => setting.key === 'shared_views')?.value;
  }

  /** `shared_views` as it is stored. */
  async function storedSharedViews() {
    const row = await models.Base.knex('settings').where('key', 'shared_views').first('value');
    return row?.value;
  }

  /**
   * `shared_views` as the settings API returns it, once that matches what is stored. A segment
   * write refreshes the settings cache, which the settings API reads, shortly after it commits.
   */
  async function settledSharedViews() {
    return vi.waitFor(
      async () => {
        const returned = await readSharedViews();
        assert.equal(returned, await storedSharedViews());
        return returned;
      },
      { timeout: 5000, interval: 20 },
    );
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

  /** The type, message and property of the validation error that `request` is rejected with. */
  async function validationError(request: ApiRequest) {
    const { body } = await request.expectStatus(422);
    const [{ type, context, property }] = body.errors;
    return { type, context, property };
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
    context: 'A view with this name already exists',
    property: 'name',
  };
  const NAME_EMPTY = { property: 'body.segments.0.name', message: 'Name cannot be empty' };
  const SAVED_VIEWS_INVALID = {
    type: 'ValidationError',
    context: 'Cannot modify saved views because shared_views is invalid',
    property: null,
  };

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  afterEach(async function () {
    // A refresh still to come from this test's last write would otherwise land after the reset.
    await settledSharedViews();
    await saveSharedViews('[]');
  });

  describe('GET /segments/', function () {
    it('returns no segments when no views are saved', async function () {
      await agent
        .get('segments/')
        .expectStatus(200)
        .matchHeaderSnapshot(readHeaders)
        .matchBodySnapshot();
    });

    it('lists the member views saved through the settings API', async function () {
      await saveSharedViews(
        JSON.stringify([
          { name: 'Drafts', route: 'posts', filter: { type: 'draft' } },
          memberView('VIP', 'label:vip'),
        ]),
      );

      await agent
        .get('segments/')
        .expectStatus(200)
        .matchHeaderSnapshot(readHeaders)
        .matchBodySnapshot();
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
        .matchBodySnapshot();
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

    it('rejects a name another member view has, ignoring case and whitespace', async function () {
      await add('VIP', 'label:vip');

      await agent
        .post('segments/')
        .body({ segments: [{ name: ' vip ', filter: 'label:gold' }] })
        .expectStatus(422)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
      assert.equal((await browse()).length, 1);
    });

    it('rejects the name of a member view that has no filter', async function () {
      await saveSharedViews(
        JSON.stringify([{ name: 'Everyone', route: 'members', filter: { filter: '' } }]),
      );

      assert.deepEqual(await addError({ name: 'everyone', filter: 'status:free' }), NAME_TAKEN);
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

    it('rejects a filter another segment has', async function () {
      await add('VIP', 'label:vip');

      await agent
        .post('segments/')
        .body({ segments: [{ name: 'Gold', filter: 'label:vip' }] })
        .expectStatus(422)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
      assert.equal((await browse()).length, 1);
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

    it('accepts a filter it does not check against members', async function () {
      assert.equal((await add('Odd', 'not a real field:yes')).filter, 'not a real field:yes');
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
        .matchBodySnapshot();
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
        .matchBodySnapshot();
    });

    it('keeps the segment in its place and its id the same', async function () {
      await add('Free', 'status:free');
      const paid = await add('Paid', 'status:paid');
      await add('Comped', 'status:comped');

      const renamed = await rename(paid.id, 'Paying');

      assert.equal(renamed.id, paid.id);
      assert.deepEqual(
        (await browse()).map((segment) => segment.name),
        ['Free', 'Paying', 'Comped'],
      );
    });

    it('accepts the name the segment already has, in another case', async function () {
      const { id } = await add('VIP', 'label:vip');

      assert.equal((await rename(id, ' vip ')).name, 'vip');
    });

    it('rejects a name another member view has', async function () {
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
      const before = await settledSharedViews();

      await agent
        .put(`segments/${id}/`)
        .body({ segments: [{ name: 'Gold', filter: 'label:gold' }] })
        .expectStatus(422)
        .matchHeaderSnapshot(writeHeaders)
        .matchBodySnapshot(errorBody);
      assert.deepEqual(await browse(), [{ id, name: 'VIP', filter: 'label:vip' }]);
      assert.equal(await settledSharedViews(), before);
    });

    it('rejects a field it does not know, rather than renaming the segment', async function () {
      const { id } = await add('VIP', 'label:vip');

      assert.deepEqual(await renameBodyError(id, { name: 'Gold', fliter: 'label:gold' }), {
        property: 'body.segments.0',
        message: 'Unrecognized key: "fliter"',
      });
      assert.deepEqual(await browse(), [{ id, name: 'VIP', filter: 'label:vip' }]);
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

  describe('saved views in shared_views', function () {
    it('saves a segment as Admin saves a view, which the settings API returns', async function () {
      await add('VIP', 'label:vip');

      assert.equal(await settledSharedViews(), JSON.stringify([memberView('VIP', 'label:vip')]));
    });

    it('keeps posts views, other entries and unknown keys through every change', async function () {
      const postsView = {
        name: 'Drafts',
        route: 'posts',
        color: 'midgrey',
        filter: { type: 'draft' },
      };
      const unnamed = { name: 42, route: 'members', filter: { filter: 'status:paid' } };
      const noFilter = { name: 'Everyone', route: 'members', filter: { filter: '' } };
      const vip = {
        name: 'VIP',
        route: 'members',
        color: 'yellow',
        filter: { filter: 'label:vip', search: null },
        pinned: true,
      };
      const views: unknown[] = [postsView, 'not a view', vip, unnamed, noFilter];
      await saveSharedViews(JSON.stringify(views));

      const [listed] = await browse();
      assert.deepEqual(listed, { id: listed.id, name: 'VIP', filter: 'label:vip' });

      await add('Free', 'status:free');
      assert.equal(
        await settledSharedViews(),
        JSON.stringify([...views, memberView('Free', 'status:free')]),
      );

      await rename(listed.id, 'Very important');
      assert.equal(
        await settledSharedViews(),
        JSON.stringify([
          postsView,
          'not a view',
          { ...vip, name: 'Very important' },
          unnamed,
          noFilter,
          memberView('Free', 'status:free'),
        ]),
      );

      await agent.delete(`segments/${listed.id}/`).expectStatus(204);
      assert.equal(
        await settledSharedViews(),
        JSON.stringify([
          postsView,
          'not a view',
          unnamed,
          noFilter,
          memberView('Free', 'status:free'),
        ]),
      );
    });

    it('gives views that share a filter different ids', async function () {
      await saveSharedViews(
        JSON.stringify([
          memberView('VIP', 'label:vip'),
          memberView('VIP again', 'label:vip'),
          // Filters that look like what a second view with the same filter is identified by.
          memberView('Array', JSON.stringify(['label:vip', 2])),
          memberView('Newline', 'label:vip\n2'),
        ]),
      );

      await agent
        .get('segments/')
        .expectStatus(200)
        .matchHeaderSnapshot(readHeaders)
        .matchBodySnapshot();

      const segments = await browse();
      assert.equal(new Set(segments.map((segment) => segment.id)).size, 4);
      await rename(segments[1].id, 'Second');
      assert.deepEqual(
        (await browse()).map((segment) => segment.name),
        ['VIP', 'Second', 'Array', 'Newline'],
      );
    });

    it('lists no segments when shared_views has no value, and saves an array on a write', async function () {
      await saveSharedViews(null);
      assert.deepEqual(await browse(), []);

      await add('VIP', 'label:vip');
      assert.equal(await settledSharedViews(), JSON.stringify([memberView('VIP', 'label:vip')]));
    });

    it.each(['{}', '""', 'null'])(
      'lists no segments when shared_views is %s, and saves an array on a write',
      async function (empty) {
        await saveSharedViews(empty);
        assert.deepEqual(await browse(), []);

        await add('Gold', 'label:gold');
        assert.equal(
          await settledSharedViews(),
          JSON.stringify([memberView('Gold', 'label:gold')]),
        );
      },
    );

    describe.each([
      ['not valid JSON', `[${JSON.stringify(memberView('VIP', 'label:vip'))}`],
      ['an object with keys', JSON.stringify(memberView('VIP', 'label:vip'))],
      ['a string with text', JSON.stringify('VIP')],
    ])('when shared_views is %s', function (_description, stored) {
      afterEach(function () {
        sinon.restore();
      });

      it('lists no segments, and logs that they could not be read', async function () {
        await saveSharedViews(stored);
        const warn = sinon.spy(logging, 'warn');

        assert.deepEqual(await browse(), []);

        sinon.assert.calledOnceWithExactly(
          warn,
          { event: { name: 'segments.read-saved-views.invalid' } },
          'Saved member views could not be read because shared_views is invalid',
        );
      });

      it('rejects every change, and leaves the value as it is', async function () {
        await saveSharedViews(stored);

        await agent
          .post('segments/')
          .body({ segments: [{ name: 'Gold', filter: 'label:gold' }] })
          .expectStatus(422)
          .matchHeaderSnapshot(writeHeaders)
          .matchBodySnapshot(errorBody);
        assert.deepEqual(await renameError(UNKNOWN_ID, { name: 'Gold' }), SAVED_VIEWS_INVALID);
        assert.deepEqual(
          await validationError(agent.delete(`segments/${UNKNOWN_ID}/`)),
          SAVED_VIEWS_INVALID,
        );

        assert.equal(await readSharedViews(), stored);
      });
    });

    it('rejects a change that would make the saved views longer than the setting holds', async function () {
      await add('VIP', 'label:vip');
      const before = await settledSharedViews();

      assert.deepEqual(await addError({ name: 'Long', filter: 'x'.repeat(65535) }), {
        type: 'ValidationError',
        context:
          'Value in [settings.value] exceeds maximum length of 65535 characters. settings.value',
        property: null,
      });
      assert.equal(await settledSharedViews(), before);
    });

    it('leaves the settings cache entry as a settings save leaves it', async function () {
      await saveSharedViews(JSON.stringify([memberView('Free', 'status:free')]));
      const saved = settingsCache.get('shared_views', { resolve: false });

      await add('VIP', 'label:vip');
      await settledSharedViews();
      const written = settingsCache.get('shared_views', { resolve: false });

      assert.ok(saved && written);
      assert.deepEqual(Object.keys(written).sort(), Object.keys(saved).sort());
      assert.ok(written.created_at instanceof Date && written.updated_at instanceof Date);
      assert.deepEqual(
        { ...written, value: saved.value, updated_at: saved.updated_at },
        { ...saved },
      );
      assert.equal(
        written.value,
        JSON.stringify([memberView('Free', 'status:free'), memberView('VIP', 'label:vip')]),
      );
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
      await addError({ name: 'Gold', filter: 'label:vip' });
      await addError({ name: 'Long', filter: 'x'.repeat(65535) });
      await renameError(id, { name: 'Free' });
      await renameError(id, { name: 'VIP', filter: 'label:gold' });
      await agent
        .put(`segments/${UNKNOWN_ID}/`)
        .body({ segments: [{ name: 'Gold' }] })
        .expectStatus(404);
      await agent.delete(`segments/${UNKNOWN_ID}/`).expectStatus(404);

      const rejected = (type: string, rejection: string) => ({
        error: { type },
        labels: { rejection },
      });
      expect(failedSpans('add')).toMatchObject([
        rejected('ValidationError', 'name_taken'),
        rejected('ValidationError', 'filter_taken'),
        rejected('ValidationError', 'stored_views_too_long'),
      ]);
      expect(failedSpans('edit')).toMatchObject([
        rejected('ValidationError', 'name_taken'),
        rejected('ValidationError', 'filter_changed'),
        rejected('NotFoundError', 'not_found'),
      ]);
      expect(failedSpans('delete')).toMatchObject([rejected('NotFoundError', 'not_found')]);
    });

    it('records a failure, not a rejection, when shared_views is invalid', async function () {
      await saveSharedViews(JSON.stringify('VIP'));

      await addError({ name: 'Gold', filter: 'label:gold' });

      expect(spans('add')).toMatchObject([
        { event: { outcome: 'failure' }, error: { type: 'ValidationError' } },
      ]);
      assert.equal(spans('add')[0].labels.rejection, undefined);
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

    type StoredAction = { id: string; context: string };

    /** The administrator's actions on settings, as they're stored. */
    const settingActions = () =>
      models.Base.knex('actions')
        .where({ resource_type: 'setting', actor_id: adminId })
        .select('id', 'resource_id', 'resource_type', 'actor_id', 'actor_type', 'event', 'context');

    beforeEach(async function () {
      await agent.loginAsAdmin();
      adminId = (await agent.get('users/me/').expectStatus(200)).body.users[0].id;
      await models.Base.knex('actions').where({ actor_id: adminId }).del();
    });

    afterEach(async function () {
      await dbUtils.truncate('rate_limits');
      await agent.loginAsOwner();
    });

    it('records each change as the edit of the setting that a settings save records, named after the setting', async function () {
      await saveSharedViews(JSON.stringify([memberView('Free', 'status:free')]));
      const [{ id: savedId, ...settingsSave }] = await settingActions();

      const { id } = await add('VIP', 'label:vip');
      await rename(id, 'Gold');
      await agent.delete(`segments/${id}/`).expectStatus(204);

      const withParsedContext = ({ id: _id, context, ...action }: StoredAction) => ({
        ...action,
        context: JSON.parse(context),
      });
      const writes = (await settingActions())
        .filter((action: StoredAction) => action.id !== savedId)
        .map(withParsedContext);
      const named = {
        ...withParsedContext({ id: savedId, ...settingsSave }),
        context: { primary_name: 'shared_views', key: 'shared_views', group: 'views' },
      };
      assert.deepEqual(JSON.parse(settingsSave.context), { key: 'shared_views', group: 'views' });
      assert.deepEqual(writes, [named, named, named]);
    });

    it('records nothing for a rename to the name the segment already has', async function () {
      const { id } = await add('VIP', 'label:vip');
      const recorded = (await settingActions()).length;

      assert.equal((await rename(id, 'VIP')).name, 'VIP');

      assert.equal((await settingActions()).length, recorded);
    });

    it('loads the setting as the resource of the action', async function () {
      await add('VIP', 'label:vip');

      const filter = encodeURIComponent(`resource_type:setting+actor_id:'${adminId}'`);
      const { body } = await agent
        .get(`actions/?filter=${filter}&include=resource`)
        .expectStatus(200);

      const setting = await models.Base.knex('settings').where('key', 'shared_views').first('id');
      assert.equal(body.actions.length, 1);
      assert.equal(body.actions[0].resource?.id, setting.id);
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
