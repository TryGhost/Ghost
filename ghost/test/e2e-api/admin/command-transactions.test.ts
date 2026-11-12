import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import { portsOf } from '@tryghost/checkout';
import { CUSTOM_NAMESPACE, KeySchema } from '@tryghost/metafield-types/identity';

// Required rather than imported, so the test shares the module instances Ghost boots with.
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const metafields: typeof import('../../../core/server/services/members-metafields') = require('../../../core/server/services/members-metafields');
const giftLinks: typeof import('../../../core/server/services/gift-links') = require('../../../core/server/services/gift-links');
const stripeCheckoutConfig: typeof import('../../../core/server/services/stripe-checkout-config') = require('../../../core/server/services/stripe-checkout-config');
const tiers: typeof import('../../../core/server/services/tiers') = require('../../../core/server/services/tiers');

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

  const HISTORY = ['gift_link', 'member_custom_field', 'stripe_checkout_config'];
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
});
