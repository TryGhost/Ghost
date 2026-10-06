import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import { z } from 'zod';
import type { Knex } from 'knex';
import type { FieldType } from '@tryghost/metafield-types';
import { FIELD_STATUS } from '../members-metafields/schema';
import { MEMBER_ACCESS, type MemberAccess } from '../members-metafields';
import type { Metafield, RequestContext } from '../members-metafields';
import { PORT_FIELD, STRIPE_PORT, type StripePort } from '@tryghost/checkout';
import {
  collectionRowCodec,
  optionsCodec,
  type CollectionParts,
  type CollectionRow,
} from './codec';
import { CONFIG_TABLE, collectionRowsForTier, configuredCollectionRows } from './queries';
import { emptyCollection, type ResolvedCheckout, type TierCheckoutConfig } from './models';
import { CheckoutConfigInput } from './serializers';

type NewField = { key: string; name: string; type: FieldType; access: { member: MemberAccess } };

/**
 * What a member may do with a field this service creates for them.
 *
 * The opposite of the default a publisher-made field gets. These hold what the member
 * themselves gave at checkout, and collection can be switched on while the screen for
 * opening a field to members is not, since the two sit behind different flags. A closed
 * default would then leave a member unable to correct their own address and nobody able
 * to open it for them.
 */
const COLLECTED_FIELD_ACCESS = { member: MEMBER_ACCESS.write } as const;

/**
 * A request states its settings in named sections: one for shipping, one for phone. Each
 * section stands for one or more of the values Stripe hands back when a checkout is
 * completed — shipping covers both the recipient's name and their address, phone covers
 * only the phone number.
 *
 * Naming those values here means that a request which includes a section settles every
 * value in it: each one is either given a destination or has its old one removed. Without
 * this list, a value the request never mentioned could keep a destination from an earlier
 * save that the publisher believes they have turned off.
 */
const BLOCK_PORTS = {
  shipping: [STRIPE_PORT.shippingName, STRIPE_PORT.shippingAddress],
  phone: [STRIPE_PORT.phone],
} as const satisfies Record<string, readonly StripePort[]>;

interface CollectionPlan {
  clear: StripePort[];
  create: NewField[];
  bind: Array<{ port: StripePort; key: string }>;
}

export interface PortBinder {
  bind(
    db: Knex,
    productId: string,
    port: string,
    customFieldKey: string,
    now: Date,
  ): Promise<string>;
  remove(db: Knex, productId: string, port: string): Promise<void>;
}

export interface FieldMaker {
  findByKey(key: string, options?: { executor?: Knex }): Promise<Metafield | null>;
  addOne(wanted: NewField, options?: { executor?: Knex }): Promise<Metafield>;
  recordCreated(context: RequestContext, fields: Metafield[]): Promise<void>;
}

export class TierCheckoutConfigService {
  private knex: Knex;
  private bindings: PortBinder;
  private fields: FieldMaker;

  constructor({
    knex,
    bindings,
    fields,
  }: {
    knex: Knex;
    bindings: PortBinder;
    fields: FieldMaker;
  }) {
    this.knex = knex;
    this.bindings = bindings;
    this.fields = fields;
  }

  async browse(): Promise<TierCheckoutConfig[]> {
    const rows = decodeCollection(await configuredCollectionRows(this.knex));
    if (rows.length === 0) {
      return [];
    }

    return rows.map(assemble);
  }

  async read(productId: string): Promise<TierCheckoutConfig | null> {
    const [row] = decodeCollection(await collectionRowsForTier(this.knex, productId));
    if (!row) {
      throw new errors.NotFoundError({ message: 'Tier not found.' });
    }
    if (!row.configured) {
      return null;
    }

    return assemble(row);
  }

  async resolve(productId: string): Promise<ResolvedCheckout> {
    const [row] = decodeCollection(await collectionRowsForTier(this.knex, productId));
    return row?.configured ? row.collecting : emptyCollection();
  }

  /**
   * Saves the checkout settings a request states, and leaves the rest alone.
   *
   * A request only has to include the sections it wants to change. Say nothing about
   * shipping and the shipping settings stay exactly as they were, so a client that only
   * knows how to edit the phone number cannot wipe out the shipping settings by omitting
   * them.
   */
  async edit(context: RequestContext, productId: string, input: unknown): Promise<void> {
    const stated = parseInput(input);
    const now = new Date();

    const plan = await this.planCollection(stated);

    const created = await this.knex.transaction(async (trx) => {
      await assertTierExists(trx, productId);
      await writeOptions(trx, productId, stated, now);

      for (const port of plan.clear) {
        await this.bindings.remove(trx, productId, port);
      }

      const made: Metafield[] = [];
      for (const wanted of plan.create) {
        made.push(await this.fields.addOne(wanted, { executor: trx }));
      }
      for (const { port, key } of plan.bind) {
        await this.bindings.bind(trx, productId, port, key, now);
      }
      return made;
    });

    await this.fields.recordCreated(context, created);
  }

  private async planCollection(stated: CheckoutConfigInput): Promise<CollectionPlan> {
    const wanted: Array<{ port: StripePort; key: string }> = [];

    if (stated.shipping?.collect) {
      wanted.push(
        { port: STRIPE_PORT.shippingName, key: stated.shipping.name.custom_field_key },
        { port: STRIPE_PORT.shippingAddress, key: stated.shipping.address.custom_field_key },
      );
    }
    if (stated.phone?.collect) {
      wanted.push({ port: STRIPE_PORT.phone, key: stated.phone.custom_field_key });
    }

    const bound = new Set<StripePort>(wanted.map(({ port }) => port));
    const clear: StripePort[] = [];
    for (const block of ['shipping', 'phone'] as const) {
      if (stated[block]) {
        clear.push(...BLOCK_PORTS[block].filter((port) => !bound.has(port)));
      }
    }

    const create = new Map<string, NewField>();
    for (const { port, key } of wanted) {
      const wants = PORT_FIELD[port];
      const existing = await this.fields.findByKey(key);
      if (existing) {
        assertCollectableInto(port, existing, wants.type);
        continue;
      }

      const alreadyPlanned = create.get(key);
      if (alreadyPlanned && alreadyPlanned.type !== wants.type) {
        throw new errors.ValidationError({
          message: `This can only be collected into a ${wants.type} field.`,
          property: `checkout.${port}.custom_field_key`,
        });
      }
      if (!alreadyPlanned) {
        create.set(key, {
          key,
          name: wants.name,
          type: wants.type,
          access: COLLECTED_FIELD_ACCESS,
        });
      }
    }

    return { clear, create: [...create.values()], bind: wanted };
  }
}

function parseInput(input: unknown): CheckoutConfigInput {
  const parsed = CheckoutConfigInput.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  const issue = parsed.error.issues[0];
  throw new errors.ValidationError({
    message: issue.message,
    property: issue.path.join('.') || 'checkout',
  });
}

function decodeCollection(rows: CollectionRow[]): CollectionParts[] {
  return rows.map((row) => z.decode(collectionRowCodec, row));
}

function assemble(row: CollectionParts): TierCheckoutConfig {
  return { tierId: row.tierId, ...row.collection };
}

async function assertTierExists(db: Knex, productId: string): Promise<void> {
  const tier = await db('products').where('id', productId).first();
  if (!tier) {
    throw new errors.NotFoundError({ message: 'Tier not found.' });
  }
}

/**
 * Refuses a custom field that cannot hold what Stripe will send back.
 *
 * A request names the custom field each collected value should be saved into. That field
 * has to be active, because an archived field accepts no new values, and it has to store
 * the right kind of data: Stripe returns a structured address for the shipping address,
 * and plain text for a name or a phone number.
 *
 * Both refusals are deliberate rather than defensive. Ghost could save the value into some
 * other field, or accept the request and quietly collect nothing, but a publisher who named
 * a field meant that field. Being told now is better than finding out weeks later that
 * nothing was ever recorded.
 */
function assertCollectableInto(port: StripePort, field: Metafield, valueType: FieldType): void {
  if (field.status !== FIELD_STATUS.active) {
    throw new errors.ValidationError({
      message: 'An archived custom field cannot receive collected data. Restore it first.',
      property: `checkout.${port}.custom_field_key`,
    });
  }
  if (field.type !== valueType) {
    throw new errors.ValidationError({
      message: `This can only be collected into a ${valueType} field.`,
      property: `checkout.${port}.custom_field_key`,
    });
  }
}

async function writeOptions(
  trx: Knex.Transaction,
  productId: string,
  stated: CheckoutConfigInput,
  now: Date,
): Promise<void> {
  const all = z.encode(optionsCodec, {
    shippingAllowedCountries: stated.shipping?.collect
      ? (stated.shipping.allowed_countries ?? null)
      : null,
    taxNumber: stated.tax_number?.collect ?? false,
  });

  // Only the columns this request spoke about are written, so two requests changing
  // different parts of the same tier cannot undo each other, and a request that mentions
  // neither still leaves the row behind as the record that this tier has been set up.
  const columns = {
    ...(stated.shipping ? { shipping_allowed_countries: all.shipping_allowed_countries } : {}),
    ...(stated.tax_number ? { tax_number_collect: all.tax_number_collect } : {}),
  };

  await trx(CONFIG_TABLE)
    .insert({
      id: new ObjectID().toHexString(),
      product_id: productId,
      created_at: now,
      updated_at: now,
      ...columns,
    })
    .onConflict('product_id')
    .merge({ ...columns, updated_at: now });
}
