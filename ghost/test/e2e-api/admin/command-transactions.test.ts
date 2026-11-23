import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Knex } from 'knex';
import { portsOf } from '@tryghost/checkout';
import { CUSTOM_NAMESPACE, KeySchema } from '@tryghost/metafield-types/identity';
import { createLoggingFake } from '../../utils/logging-utils';

// Required rather than imported, so the test shares the module instances Ghost boots with.
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const metafields: typeof import('../../../core/server/services/members-metafields') = require('../../../core/server/services/members-metafields');
const giftLinks: typeof import('../../../core/server/services/gift-links') = require('../../../core/server/services/gift-links');
const stripeCheckoutConfig: typeof import('../../../core/server/services/stripe-checkout-config') = require('../../../core/server/services/stripe-checkout-config');
const tiers: typeof import('../../../core/server/services/tiers') = require('../../../core/server/services/tiers');
const segments: typeof import('../../../core/server/services/segments') = require('../../../core/server/services/segments');
const {
  SegmentFilter,
  SegmentName,
}: typeof import('../../../core/server/services/segments/models') = require('../../../core/server/services/segments/models');
const {
  SegmentsService,
}: typeof import('../../../core/server/services/segments/service') = require('../../../core/server/services/segments/service');
const {
  SettingsSegmentRepository,
}: typeof import('../../../core/server/services/segments/settings-repository') = require('../../../core/server/services/segments/settings-repository');
const {
  refreshSettingsCache,
}: typeof import('../../../core/server/services/segments/settings-cache') = require('../../../core/server/services/segments/settings-cache');
const {
  segmentsTracking,
}: typeof import('../../../core/server/services/segments/tracking') = require('../../../core/server/services/segments/tracking');
const {
  meter,
  tracer,
}: typeof import('../../../core/server/lib/tracing') = require('../../../core/server/lib/tracing');
const settingsCache: typeof import('../../../core/shared/settings-cache') = require('../../../core/shared/settings-cache');

/** Runs a command on the connection or transaction it is given, or on its own when given none. */
type Run = (executor?: Knex) => Promise<unknown>;

interface Query {
  name: string;
  /**
   * Sets up what the query needs through the API. Returns a change to make inside a transaction,
   * and how to read what that change affects on the connection or transaction it is given.
   */
  arrange: () => Promise<{ change: (trx: Knex.Transaction) => Promise<unknown>; read: Run }>;
}

interface Command {
  name: string;
  /** Every table the command writes. */
  tables: string[];
  /** Whether the command writes a staff history entry. */
  recorded: boolean;
  /** Sets up what the command needs through the API, and returns how to run it. */
  arrange: () => Promise<Run>;
}

// Every command in the services built on Knex without a Bookshelf model takes part in a
// transaction the same way: called on its own it opens one, and handed a caller's it joins that
// one. No request can hand a command a transaction, so these call each command directly.
describe('Commands and transactions', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };
  let knex: Knex;
  let postId: string;
  let context: { actor: { id: string; type: 'user'; viaApiKey: boolean } };

  const HISTORY = ['gift_link', 'member_custom_field', 'setting', 'stripe_checkout_config'];
  const PHONE_PORT = portsOf('phone')[0];
  const SHIPPING = {
    shipping: {
      collect: true,
      address: { custom_field_key: 'delivery_address' },
      name: { custom_field_key: 'recipient_name' },
    },
  };

  async function createField(name: string, type = 'short_text') {
    const { body } = await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type }] })
      .expectStatus(201);
    return KeySchema.parse(body.members_metafields[0].key);
  }

  async function createMember(): Promise<string> {
    const { body } = await agent
      .post('members/')
      .body({ members: [{ email: 'commands@example.com' }] })
      .expectStatus(201);
    return body.members[0].id;
  }

  /** A paid tier to name, so a requirement also writes the rows that say which tiers it covers. */
  async function paidTierId(): Promise<string> {
    const tier = await knex('products').where('type', 'paid').first('id');
    return tier.id;
  }

  async function plannedValue() {
    const key = await createField('Nickname');
    const memberId = await createMember();
    const { values } = metafields.booted();
    const planned = await values.planWrite(
      values.unwrapWire({ custom: { [key]: 'Bex' } }),
      metafields.ADMIN,
    );
    return { memberId, planned };
  }

  const newSegment = () => ({
    name: SegmentName.parse('VIP'),
    filter: SegmentFilter.parse('label:vip'),
  });

  /** Adds a segment in a transaction of its own, and returns its id. */
  async function addSegment(): Promise<string> {
    return (await segments.default.service.add(context, newSegment())).id;
  }

  /** `shared_views` as the settings cache holds it, which `GET /settings/` returns. */
  const cachedSharedViews = () => settingsCache.get('shared_views', { resolve: false })?.value;

  /** `shared_views` as it is stored. */
  async function storedSharedViews(): Promise<unknown> {
    const row = await knex('settings').where('key', 'shared_views').first('value');
    return row?.value;
  }

  // Every row of each table, in an order that doesn't depend on how the database returns them.
  const snapshot = (tables: string[]) =>
    Promise.all(
      tables.map(async (table) =>
        (await knex(table).select('*')).map((row) => JSON.stringify(row)).sort(),
      ),
    );

  const recordedCount = async () => {
    const row = await knex('actions')
      .whereIn('resource_type', HISTORY)
      .count({ count: '*' })
      .first();
    return Number(row?.count ?? 0);
  };

  const FIELDS = 'members_metafields';
  const VALUES = ['members_metafield_values', 'members_metafield_change_events'];
  const BINDINGS = 'members_metafield_bindings';
  const REQUIREMENTS = ['tier_requirements', 'tier_requirement_tiers'];
  const GIFT_LINKS = ['gift_links', 'post_gift_links'];

  const commands: Command[] = [
    {
      name: 'gift links: ensure',
      tables: GIFT_LINKS,
      recorded: true,
      arrange: async () => (executor) =>
        giftLinks.default.service.ensure(context, postId, executor),
    },
    {
      name: 'gift links: create',
      tables: GIFT_LINKS,
      recorded: true,
      arrange: async () => (executor) =>
        giftLinks.default.service.create(context, postId, executor),
    },
    {
      name: 'gift links: removeAll',
      tables: ['post_gift_links'],
      recorded: true,
      arrange: async () => {
        await agent.put(`posts/${postId}/gift_links/`).expectStatus(200);
        return (executor) => giftLinks.default.service.removeAll(context, executor);
      },
    },
    {
      name: 'custom field definitions: add',
      tables: [FIELDS],
      recorded: true,
      arrange: async () => (executor) =>
        metafields
          .booted()
          .definitions.add(
            context,
            CUSTOM_NAMESPACE,
            [{ name: 'Company', type: 'short_text' }],
            executor,
          ),
    },
    {
      name: 'custom field definitions: edit',
      tables: [FIELDS],
      recorded: true,
      arrange: async () => {
        const key = await createField('Company');
        return (executor) =>
          metafields
            .booted()
            .definitions.edit(context, CUSTOM_NAMESPACE, key, { name: 'Employer' }, executor);
      },
    },
    {
      name: 'custom field definitions: reorder',
      tables: [FIELDS],
      recorded: true,
      arrange: async () => {
        const first = await createField('Company');
        const second = await createField('Role');
        return (executor) =>
          metafields
            .booted()
            .definitions.reorder(
              context,
              CUSTOM_NAMESPACE,
              [{ key: second }, { key: first }],
              executor,
            );
      },
    },
    {
      name: 'custom field definitions: destroy',
      tables: [FIELDS],
      recorded: true,
      arrange: async () => {
        const key = await createField('Company');
        await agent
          .put(`members/metafields/custom/${key}/`)
          .body({ members_metafields: [{ status: 'archived' }] })
          .expectStatus(200);
        return (executor) =>
          metafields.booted().definitions.destroy(context, CUSTOM_NAMESPACE, key, executor);
      },
    },
    {
      name: 'custom field values: applyWrite',
      tables: VALUES,
      recorded: false,
      arrange: async () => {
        const { memberId, planned } = await plannedValue();
        return (executor) =>
          metafields
            .booted()
            .values.applyWrite(
              memberId,
              planned,
              { writtenBy: { type: 'user', id: context.actor.id }, source: 'admin' },
              executor,
            );
      },
    },
    {
      name: 'custom field values: applyImportedWrite',
      tables: VALUES,
      recorded: false,
      arrange: async () => {
        const { memberId, planned } = await plannedValue();
        return (executor) =>
          metafields.booted().values.applyImportedWrite(memberId, planned, executor);
      },
    },
    {
      name: 'custom field bindings: bind',
      tables: [BINDINGS],
      recorded: false,
      arrange: async () => {
        const key = await createField('Company');
        return (executor) =>
          metafields
            .booted()
            .bindings.bind(PHONE_PORT, { namespace: CUSTOM_NAMESPACE, key }, new Date(), executor);
      },
    },
    {
      name: 'custom field bindings: remove',
      tables: [BINDINGS],
      recorded: false,
      arrange: async () => {
        const key = await createField('Company');
        const { bindings } = metafields.booted();
        await bindings.bind(PHONE_PORT, { namespace: CUSTOM_NAMESPACE, key }, new Date());
        return (executor) => bindings.remove(PHONE_PORT, executor);
      },
    },
    {
      name: 'tier requirements: require',
      tables: REQUIREMENTS,
      recorded: false,
      arrange: async () => {
        const tierIds = [await paidTierId()];
        return (executor) =>
          tiers.default.service.requirements.require(
            { name: 'phone', tierIds },
            new Date(),
            executor,
          );
      },
    },
    {
      name: 'tier requirements: release',
      tables: REQUIREMENTS,
      recorded: false,
      arrange: async () => {
        const { requirements } = tiers.default.service;
        await requirements.require({ name: 'phone', tierIds: [await paidTierId()] }, new Date());
        return (executor) => requirements.release('phone', executor);
      },
    },
    {
      name: 'Stripe Checkout settings: edit',
      tables: ['stripe_checkout_config', ...REQUIREMENTS, BINDINGS],
      recorded: true,
      arrange: async () => {
        await createField('Delivery address', 'address');
        await createField('Recipient name');
        return (executor) =>
          stripeCheckoutConfig.default.service.config.edit(context, SHIPPING, executor);
      },
    },
    {
      name: 'segments: add',
      tables: ['settings', 'segments'],
      recorded: true,
      arrange: async () => (executor) =>
        segments.default.service.add(context, newSegment(), executor),
    },
    {
      name: 'segments: edit',
      tables: ['settings', 'segments'],
      recorded: true,
      arrange: async () => {
        const id = await addSegment();
        const rename = { name: SegmentName.parse('Gold') };
        return (executor) => segments.default.service.edit(context, id, rename, executor);
      },
    },
    {
      name: 'segments: destroy',
      tables: ['settings', 'segments'],
      recorded: true,
      arrange: async () => {
        const id = await addSegment();
        return (executor) => segments.default.service.destroy(context, id, executor);
      },
    },
  ];

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'posts');
    await agent.loginAsOwner();
    knex = models.Base.knex;
    postId = fixtureManager.get('posts', 0).id;
    context = { actor: { id: fixtureManager.get('users', 0).id, type: 'user', viaApiKey: false } };
  });

  afterEach(async function () {
    await knex('stripe_checkout_config').del();
    await knex('members_metafield_bindings').del();
    await knex('tier_requirement_tiers').del();
    await knex('tier_requirements').del();
    await knex('members_metafield_change_events').del();
    await knex('members_metafield_values').del();
    await knex('members_metafields').del();
    await knex('post_gift_links').del();
    await knex('gift_links').del();
    await knex('members').where('email', 'commands@example.com').del();
    // In one transaction, so every settings cache refresh it schedules reads the same state.
    await knex.transaction(async (trx) => {
      for (const { id } of await segments.default.service.browse(trx)) {
        await segments.default.service.destroy(context, id, trx);
      }
    });
    await knex('actions').whereIn('resource_type', HISTORY).del();
  });

  describe.each(commands)('$name', function ({ tables, recorded, arrange }) {
    it('changes nothing when the transaction it joined is rolled back', async function () {
      const run = await arrange();
      const before = await snapshot(tables);
      const recordedBefore = await recordedCount();

      await assert.rejects(
        knex.transaction(async (trx) => {
          await run(trx);
          throw new Error('The caller failed');
        }),
        /The caller failed/,
      );

      assert.deepEqual(await snapshot(tables), before);
      assert.equal(await recordedCount(), recordedBefore);
    });

    it('saves its change only when the transaction it joined commits', async function () {
      const run = await arrange();
      const before = await snapshot(tables);
      const recordedBefore = await recordedCount();

      await knex.transaction(async (trx) => {
        await run(trx);
        // Read on another connection, which sees only what has been committed.
        assert.deepEqual(await snapshot(tables), before);
        assert.equal(await recordedCount(), recordedBefore);
      });

      assert.notDeepEqual(await snapshot(tables), before);
      assert.equal((await recordedCount()) > recordedBefore, recorded);
    });

    it('saves its change when called on its own', async function () {
      const run = await arrange();
      const before = await snapshot(tables);
      const recordedBefore = await recordedCount();

      await run();

      assert.notDeepEqual(await snapshot(tables), before);
      assert.equal((await recordedCount()) > recordedBefore, recorded);
    });
  });

  // A query run inside a caller's transaction has to read through it. On the service's own
  // connection it would miss what the transaction has written so far, and on a pool of one
  // connection it would wait forever for the connection the transaction holds.
  const queries: Query[] = [
    {
      name: 'gift links: getPost',
      arrange: async () => ({
        change: (trx) => giftLinks.default.service.ensure(context, postId, trx),
        read: (executor) => giftLinks.default.service.getPost(postId, executor),
      }),
    },
    {
      name: 'gift links: getPostByToken',
      arrange: async () => {
        let token = 'not-minted-yet';
        return {
          change: async (trx) => {
            const post = await giftLinks.default.service.ensure(context, postId, trx);
            token = post.giftLinks[0].token;
          },
          read: (executor) => giftLinks.default.service.getPostByToken(token, executor),
        };
      },
    },
    {
      name: 'custom field definitions: browse',
      arrange: async () => ({
        change: (trx) =>
          metafields
            .booted()
            .definitions.add(
              context,
              CUSTOM_NAMESPACE,
              [{ name: 'Company', type: 'short_text' }],
              trx,
            ),
        read: (executor) =>
          metafields
            .booted()
            .definitions.browse({ namespace: CUSTOM_NAMESPACE }, metafields.ADMIN, executor),
      }),
    },
    {
      name: 'custom field definitions: read',
      arrange: async () => {
        const key = await createField('Company');
        const { definitions } = metafields.booted();
        return {
          change: (trx) =>
            definitions.edit(context, CUSTOM_NAMESPACE, key, { name: 'Employer' }, trx),
          read: (executor) => definitions.read(CUSTOM_NAMESPACE, key, metafields.ADMIN, executor),
        };
      },
    },
    {
      name: 'custom field values: getValuesForMember',
      arrange: async () => {
        const { memberId, planned } = await plannedValue();
        const { values } = metafields.booted();
        return {
          change: (trx) => values.applyImportedWrite(memberId, planned, trx),
          read: (executor) => values.getValuesForMember(memberId, metafields.ADMIN, executor),
        };
      },
    },
    {
      name: 'custom field values: getValuesForMembers',
      arrange: async () => {
        const { memberId, planned } = await plannedValue();
        const { values } = metafields.booted();
        return {
          change: (trx) => values.applyImportedWrite(memberId, planned, trx),
          read: (executor) => values.getValuesForMembers([memberId], metafields.ADMIN, executor),
        };
      },
    },
    {
      name: 'custom field values: browseChangeEvents',
      arrange: async () => {
        const { memberId, planned } = await plannedValue();
        const { values } = metafields.booted();
        return {
          change: (trx) => values.applyImportedWrite(memberId, planned, trx),
          read: async (executor) => (await values.browseChangeEvents({}, executor)).total,
        };
      },
    },
    {
      name: 'custom field values: planOrRefuse',
      arrange: async () => {
        const { definitions, values } = metafields.booted();
        return {
          change: (trx) =>
            definitions.add(
              context,
              CUSTOM_NAMESPACE,
              [{ name: 'Nickname', type: 'short_text' }],
              trx,
            ),
          // A value for a field that doesn't exist is refused, and one for a field that does is
          // planned.
          read: async (executor) => {
            const { writes } = await values.planOrRefuse(
              values.unwrapWire({ custom: { nickname: 'Bex' } }),
              metafields.ADMIN,
              undefined,
              executor,
            );
            return writes.length;
          },
        };
      },
    },
    {
      name: 'custom field values: planWrite',
      arrange: async () => {
        const { definitions, values } = metafields.booted();
        return {
          change: (trx) =>
            definitions.add(
              context,
              CUSTOM_NAMESPACE,
              [{ name: 'Nickname', type: 'short_text' }],
              trx,
            ),
          read: (executor) =>
            values
              .planWrite(
                values.unwrapWire({ custom: { nickname: 'Bex' } }),
                metafields.ADMIN,
                executor,
              )
              .then(
                (writes) => writes.length,
                () => 'refused',
              ),
        };
      },
    },
    {
      name: 'custom field bindings: boundPorts',
      arrange: async () => {
        const key = await createField('Company');
        const { bindings } = metafields.booted();
        return {
          change: (trx) =>
            bindings.bind(PHONE_PORT, { namespace: CUSTOM_NAMESPACE, key }, new Date(), trx),
          read: async (executor) => [...(await bindings.boundPorts([PHONE_PORT], executor)).keys()],
        };
      },
    },
    {
      name: 'custom field bindings: isBound',
      arrange: async () => {
        const key = await createField('Company');
        const { bindings } = metafields.booted();
        return {
          change: (trx) =>
            bindings.bind(PHONE_PORT, { namespace: CUSTOM_NAMESPACE, key }, new Date(), trx),
          read: (executor) => bindings.isBound({ namespace: CUSTOM_NAMESPACE, key }, executor),
        };
      },
    },
    {
      name: 'custom field bindings: planThrough',
      arrange: async () => {
        const key = await createField('Company');
        const { bindings } = metafields.booted();
        return {
          change: (trx) =>
            bindings.bind(PHONE_PORT, { namespace: CUSTOM_NAMESPACE, key }, new Date(), trx),
          read: async (executor) => {
            const routed = await bindings.planThrough(
              [{ port: PHONE_PORT, value: 'Acme' }],
              { type: 'binding' },
              executor,
            );
            return routed.plans.length;
          },
        };
      },
    },
    {
      name: 'tier requirements: browse',
      arrange: async () => {
        const key = await createField('Company');
        const { bindings } = metafields.booted();
        const { requirements } = tiers.default.service;
        return {
          change: async (trx) => {
            await bindings.bind(PHONE_PORT, { namespace: CUSTOM_NAMESPACE, key }, new Date(), trx);
            await requirements.require({ name: 'phone', tierIds: null }, new Date(), trx);
          },
          read: (executor) => requirements.browse(executor),
        };
      },
    },
    {
      name: 'tier requirements: forTiers',
      arrange: async () => {
        const key = await createField('Company');
        const { bindings } = metafields.booted();
        const { requirements } = tiers.default.service;
        const paidTier = await knex('products').where('type', 'paid').first('id');
        return {
          change: async (trx) => {
            await bindings.bind(PHONE_PORT, { namespace: CUSTOM_NAMESPACE, key }, new Date(), trx);
            await requirements.require({ name: 'phone', tierIds: null }, new Date(), trx);
          },
          read: async (executor) => [
            ...(
              await requirements.forTiers([{ id: paidTier.id, type: 'paid' }], executor)
            ).values(),
          ],
        };
      },
    },
    {
      name: 'Stripe Checkout settings: read',
      arrange: async () => {
        await createField('Delivery address', 'address');
        await createField('Recipient name');
        const { config } = stripeCheckoutConfig.default.service;
        return {
          change: (trx) => config.edit(context, SHIPPING, trx),
          read: (executor) => config.read(executor),
        };
      },
    },
    {
      name: 'Stripe Checkout settings: readForCheckout',
      arrange: async () => {
        await createField('Delivery address', 'address');
        await createField('Recipient name');
        const { config } = stripeCheckoutConfig.default.service;
        return {
          change: (trx) => config.edit(context, SHIPPING, trx),
          read: (executor) => config.readForCheckout({}, executor),
        };
      },
    },
    {
      name: 'segments: browse',
      arrange: async () => ({
        change: (trx) => segments.default.service.add(context, newSegment(), trx),
        read: (executor) => segments.default.service.browse(executor),
      }),
    },
    {
      name: 'segments: read',
      arrange: async () => {
        let id = 'not-added-yet';
        return {
          change: async (trx) => {
            id = (await segments.default.service.add(context, newSegment(), trx)).id;
          },
          read: (executor) =>
            segments.default.service.read(id, executor).then(
              (segment) => segment.name,
              () => 'not found',
            ),
        };
      },
    },
  ];

  describe.each(queries)('$name', function ({ arrange }) {
    it('reads what the transaction it is given has written, before it is committed', async function () {
      const { change, read } = await arrange();
      const before = await read();

      await assert.rejects(
        knex.transaction(async (trx) => {
          await change(trx);
          assert.notDeepEqual(await read(trx), before);
          // Read on the service's own connection, which sees only what has been committed.
          assert.deepEqual(await read(), before);
          throw new Error('The caller failed');
        }),
        /The caller failed/,
      );

      assert.deepEqual(await read(), before);
    });
  });

  // A segment write keeps the settings cache, which `GET /settings/` reads, in step with what is
  // stored, and records History in the same transaction.
  describe('segments: settings cache and History', function () {
    /**
     * `shared_views` as it is stored, once the settings cache holds the same value. A segment
     * write refreshes the cache shortly after its transaction ends.
     */
    /** What is cached for `shared_views`, which `GET /settings/` returns. */
    const cachedEntry = () => settingsCache.get('shared_views', { resolve: false });

    /**
     * Lets what runs once a transaction has ended run. That work starts as the transaction's
     * promise settles, and whatever it does without waiting on the database is done by the next
     * turn of the event loop.
     */
    async function afterTransaction(trx: Knex.Transaction) {
      await trx.executionPromise.catch(() => {});
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
    }

    async function settledSharedViews(): Promise<unknown> {
      return vi.waitFor(
        async () => {
          const stored = await storedSharedViews();
          assert.equal(cachedSharedViews(), stored);
          return stored;
        },
        { timeout: 5000, interval: 20 },
      );
    }

    afterEach(function () {
      mockManager.restore();
    });

    it('leaves both as they were when the transaction it joined is rolled back', async function () {
      const stored = await settledSharedViews();
      const recordedBefore = await recordedCount();

      const trx = await knex.transaction();
      await segments.default.service.add(context, newSegment(), trx);
      await trx.rollback(new Error('The caller failed'));
      await afterTransaction(trx);

      assert.equal(cachedSharedViews(), stored);
      assert.equal(await storedSharedViews(), stored);
      assert.equal(await recordedCount(), recordedBefore);
    });

    it('leaves both as they were when the transaction it joined is rolled back without an error', async function () {
      const stored = await settledSharedViews();
      const recordedBefore = await recordedCount();

      const cached = cachedEntry();

      const trx = await knex.transaction();
      await segments.default.service.add(context, newSegment(), trx);
      await trx.rollback();
      await afterTransaction(trx);
      assert.equal(cachedSharedViews(), stored);

      // The refresh reads the setting again and replaces the cached entry with what is stored.
      await vi.waitFor(() => assert.notEqual(cachedEntry(), cached), {
        timeout: 5000,
        interval: 20,
      });
      assert.equal(cachedSharedViews(), stored);
      assert.equal(await storedSharedViews(), stored);
      assert.equal(await recordedCount(), recordedBefore);
    });

    it('updates both when the transaction it joined commits', async function () {
      const recordedBefore = await recordedCount();

      await knex.transaction((trx) => segments.default.service.add(context, newSegment(), trx));

      assert.equal(
        await settledSharedViews(),
        JSON.stringify([{ name: 'VIP', route: 'members', filter: { filter: 'label:vip' } }]),
      );
      assert.equal(await recordedCount(), recordedBefore + 1);
    });

    it('rolls the change back when the function it reports the change to fails', async function () {
      const metrics = mockManager.mockMetrics();
      const failing = new SegmentsService({
        knex,
        repository: new SettingsSegmentRepository({
          key: 'shared_views',
          logging: createLoggingFake(),
          maxValueLength: 65535,
        }),
        tracking: segmentsTracking({ tracer, meter }),
        onSegmentUpdated: async () => {
          throw new Error('Reporting the change failed');
        },
      });
      const stored = await storedSharedViews();

      await assert.rejects(failing.add(context, newSegment()), /Reporting the change failed/);

      assert.equal(await storedSharedViews(), stored);
      assert.deepEqual(await segments.default.service.browse(), []);
      // The span fails without a rejection, so a dashboard counts it as a failure.
      await vi.waitFor(() =>
        expect(metrics.tracked('segments.add')).toMatchObject([
          { event: { outcome: 'failure' }, error: { type: 'Error' } },
        ]),
      );
      assert.deepEqual(metrics.tracked('segments.add')[0].labels, {});
    });

    it('logs and counts a refresh of the settings cache that fails, and keeps the change', async function () {
      const metrics = mockManager.mockMetrics();
      const logging = createLoggingFake();
      const tracking = segmentsTracking({ tracer, meter });
      const refreshingNothing = new SegmentsService({
        knex,
        repository: new SettingsSegmentRepository({
          key: 'shared_views',
          logging: createLoggingFake(),
          maxValueLength: 65535,
        }),
        tracking,
        // No setting has this key, so the refresh finds nothing to cache.
        onSegmentUpdated: refreshSettingsCache({
          knex,
          cache: settingsCache,
          logging,
          tracking,
          settingKey: 'not_a_setting',
        }),
      });

      await refreshingNothing.add(context, newSegment());

      await vi.waitFor(() =>
        sinon.assert.calledOnceWithMatch(logging.error, {
          event: { name: 'segments.refresh-settings-cache.failed' },
        }),
      );
      await vi.waitFor(() =>
        expect(metrics.tracked('segments.failed_settings_cache_refreshes')).toMatchObject([
          { value: 1 },
        ]),
      );
      assert.deepEqual(
        (await segments.default.service.browse()).map((segment) => segment.name),
        ['VIP'],
      );
    });
  });
});
