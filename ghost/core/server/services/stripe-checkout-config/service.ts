import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import { z } from 'zod';
import type { Knex } from 'knex';
import { PORT_FIELD, STRIPE_PORT, type StripePort } from '@tryghost/checkout';
import { FIELD_STATUS } from '../members-metafields/schema';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RecordCheckoutConfigAction, RequestContext } from './actions';
import { ConfigRow } from './codec';
import type { ShippingCollection, ShippingSettings, StripeCheckoutConfig } from './models';
import { CONFIG_SLUG, CONFIG_TABLE, CONFIG_TIERS_TABLE } from './schema';
import { CheckoutConfigInput, parseRequest } from './serializers';

const BINDINGS_TABLE = 'members_metafield_bindings';
const FIELDS_TABLE = 'members_metafields';

/**
 * The ports a shipping address comes back through, where a request names the field each one
 * lands in, and what to say when that field is the wrong type.
 */
const SHIPPING_PORTS = {
  [STRIPE_PORT.shippingAddress]: {
    property: 'shipping.address.custom_field_key',
    wrongType: 'Choose an address custom field for the shipping address.',
  },
  [STRIPE_PORT.shippingName]: {
    property: 'shipping.name.custom_field_key',
    wrongType: "Choose a short text custom field for the recipient's name.",
  },
} as const satisfies Partial<Record<StripePort, { property: string; wrongType: string }>>;

/**
 * One row of the config read: the row's parts, one named tier that is paid (or null), and for
 * each shipping port the field it is bound to and that field again only if it can take a value
 * right now. A config limited to several tiers comes back as several rows.
 */
const ReadRow = z.object({
  design: z.string().nullable(),
  shipping: z.string().nullable(),
  paid_tier_id: z.string().nullable(),
  address_key: z.string().nullable(),
  address_ready: z.string().nullable(),
  name_key: z.string().nullable(),
  name_ready: z.string().nullable(),
});

const LockedTier = z.object({ id: z.string(), type: z.string() });
const LockedField = z.object({ key: z.string(), type: z.string(), status: z.string() });
const LockedBinding = z.object({ port: z.string(), metafield_key: z.string() });

/** Points a port at a custom field, or stops it writing anywhere. */
export interface PortBinder {
  bind(db: Knex, port: string, customFieldKey: string, now: Date): Promise<string>;
  remove(db: Knex, port: string): Promise<void>;
}

/** Reads and saves the site-wide Stripe Checkout config. */
export class StripeCheckoutConfigService {
  private knex: Knex;
  private recordAction: RecordCheckoutConfigAction;
  private bindings: PortBinder;

  constructor({
    knex,
    recordAction,
    bindings,
  }: {
    knex: Knex;
    recordAction: RecordCheckoutConfigAction;
    bindings: PortBinder;
  }) {
    this.knex = knex;
    this.recordAction = recordAction;
    this.bindings = bindings;
  }

  /**
   * Reads the config, without caching it, in one query over the row and what it points at.
   *
   * Shipping only counts the named tiers that are paid, and reads as off when it is limited
   * to tiers that have all been deleted, never widening to every tier. Either of its fields
   * being deleted takes its binding with it, which also reads as off. Checkouts ask for an
   * address only while the address field is active and still holds addresses.
   */
  async read(): Promise<StripeCheckoutConfig> {
    const rows = z.array(ReadRow).parse(
      await this.knex(`${CONFIG_TABLE} as config`)
        .leftJoin(`${CONFIG_TIERS_TABLE} as named`, (join) =>
          join.onVal('named.section', '=', 'shipping'),
        )
        .leftJoin('products as tier', (join) =>
          join.on('tier.id', '=', 'named.product_id').andOnVal('tier.type', '=', 'paid'),
        )
        .leftJoin(`${BINDINGS_TABLE} as address_binding`, (join) =>
          join.onVal('address_binding.port', '=', STRIPE_PORT.shippingAddress),
        )
        .leftJoin(`${FIELDS_TABLE} as address_field`, (join) =>
          join
            .on('address_field.key', '=', 'address_binding.metafield_key')
            .andOnVal('address_field.type', '=', PORT_FIELD.shipping_address.type)
            .andOnVal('address_field.status', '=', FIELD_STATUS.active),
        )
        .leftJoin(`${BINDINGS_TABLE} as name_binding`, (join) =>
          join.onVal('name_binding.port', '=', STRIPE_PORT.shippingName),
        )
        .leftJoin(`${FIELDS_TABLE} as name_field`, (join) =>
          join
            .on('name_field.key', '=', 'name_binding.metafield_key')
            .andOnVal('name_field.type', '=', PORT_FIELD.shipping_name.type)
            .andOnVal('name_field.status', '=', FIELD_STATUS.active),
        )
        .where('config.slug', CONFIG_SLUG)
        .select(
          'config.design',
          'config.shipping',
          'tier.id as paid_tier_id',
          'address_binding.metafield_key as address_key',
          'address_field.key as address_ready',
          'name_binding.metafield_key as name_key',
          'name_field.key as name_ready',
        ),
    );

    const [first] = rows;
    if (!first) {
      return { design: null, shipping: null };
    }
    const { design, shipping } = z.decode(ConfigRow, first);
    return { design, shipping: shipping && shippingFrom(shipping, rows) };
  }

  /**
   * Saves the parts of the config that the request includes, and records the save in the staff
   * history.
   *
   * The tiers and fields shipping names are checked inside the same transaction as the write,
   * with their rows locked, so nothing can change between the check and the write.
   */
  async edit(context: RequestContext, input: unknown): Promise<void> {
    const { design, shipping } = parseRequest(CheckoutConfigInput, input, 'checkout_config');
    const at = new Date();
    const now = toDatabaseDate(at);

    // Only the columns for parts in the request are written, so saving one part never
    // overwrites another.
    const columns = z.encode(ConfigRow.partial(), {
      ...(design === undefined ? {} : { design }),
      ...(shipping === undefined
        ? {}
        : {
            shipping: shipping && {
              tier_scope: shipping.tierIds ? ('selected_paid' as const) : ('all_paid' as const),
              allowed_countries: shipping.allowedCountries,
            },
          }),
    });

    await this.knex.transaction(async (trx) => {
      if (shipping) {
        await assertPaidTiers(trx, shipping);
        await assertDestinations(trx, shipping);
      }

      await trx(CONFIG_TABLE)
        .insert({
          id: new ObjectID().toHexString(),
          slug: CONFIG_SLUG,
          created_at: now,
          updated_at: now,
          ...columns,
        })
        .onConflict('slug')
        .merge({ ...columns, updated_at: now });

      if (shipping !== undefined) {
        await this.writeShippingTargets(trx, shipping, at);
      }
    });

    // An existing row keeps its id, so read the id back for the history entry.
    const saved = await this.knex(CONFIG_TABLE).where('slug', CONFIG_SLUG).first('id');
    if (!saved) {
      throw new errors.InternalServerError({
        message: 'The Stripe Checkout config was not found right after saving it.',
      });
    }
    await this.recordAction({ context, subject: saved.id });
  }

  /**
   * Settles which tiers shipping is limited to and which fields it lands in. Switched off,
   * shipping keeps neither, so turning it back on doesn't inherit old tiers or fields.
   */
  private async writeShippingTargets(
    trx: Knex.Transaction,
    shipping: ShippingSettings | null,
    now: Date,
  ): Promise<void> {
    await trx(CONFIG_TIERS_TABLE).where('section', 'shipping').del();
    if (shipping?.tierIds) {
      await trx(CONFIG_TIERS_TABLE).insert(
        shipping.tierIds.map((productId) => ({
          section: 'shipping' as const,
          product_id: productId,
        })),
      );
    }

    if (shipping) {
      await this.bindings.bind(
        trx,
        STRIPE_PORT.shippingAddress,
        shipping.addressCustomFieldKey,
        now,
      );
      await this.bindings.bind(trx, STRIPE_PORT.shippingName, shipping.nameCustomFieldKey, now);
    } else {
      await this.bindings.remove(trx, STRIPE_PORT.shippingAddress);
      await this.bindings.remove(trx, STRIPE_PORT.shippingName);
    }
  }
}

/** Shipping as the read found it, or null when what it points at is gone. */
function shippingFrom(
  stored: NonNullable<z.output<typeof ConfigRow>['shipping']>,
  rows: Array<z.output<typeof ReadRow>>,
): ShippingCollection | null {
  const [{ address_key: addressKey, address_ready: addressReady, name_key: nameKey }] = rows;
  if (!addressKey || !nameKey) {
    return null;
  }
  const paidTierIds = [
    ...new Set(rows.flatMap((row) => (row.paid_tier_id ? [row.paid_tier_id] : []))),
  ];
  const tierIds = stored.tier_scope === 'all_paid' ? null : paidTierIds;
  if (tierIds?.length === 0) {
    return null;
  }
  return {
    tierIds,
    allowedCountries: stored.allowed_countries,
    addressCustomFieldKey: addressKey,
    nameCustomFieldKey: nameKey,
    collectable: addressReady !== null,
  };
}

/**
 * Shipping names paid tiers or none. A free tier has no checkout, so naming one would be a
 * setting that looks saved and does nothing. An archived paid tier is accepted, so it keeps
 * its place for when it is restored. The tiers are locked until the write commits.
 */
async function assertPaidTiers(trx: Knex.Transaction, { tierIds }: ShippingSettings) {
  if (!tierIds) {
    return;
  }
  const rows = z
    .array(LockedTier)
    .parse(await trx('products').whereIn('id', tierIds).select('id', 'type').forShare());
  const typeOf = new Map(rows.map((tier) => [tier.id, tier.type]));
  const unusable = tierIds.find((id) => typeOf.get(id) !== 'paid');
  if (unusable) {
    throw new errors.ValidationError({
      message: typeOf.has(unusable)
        ? 'Only paid tiers have a checkout to collect a shipping address at.'
        : `Unknown tier: ${unusable}`,
      property: 'shipping.tier_ids',
    });
  }
}

/**
 * Refuses a custom field that can't hold what Stripe sends back. The field has to exist, be
 * active unless it is the one already chosen, and be the right type: an address field for the
 * address, and a short text field for the recipient's name. A publisher who named a field
 * meant that field, so being told now beats finding out later that nothing was saved. The
 * fields and the current bindings are locked until the write commits.
 */
async function assertDestinations(trx: Knex.Transaction, shipping: ShippingSettings) {
  const named: Array<[keyof typeof SHIPPING_PORTS, string]> = [
    [STRIPE_PORT.shippingAddress, shipping.addressCustomFieldKey],
    [STRIPE_PORT.shippingName, shipping.nameCustomFieldKey],
  ];
  const fields = z.array(LockedField).parse(
    await trx(FIELDS_TABLE)
      .whereIn(
        'key',
        named.map(([, key]) => key),
      )
      .select('key', 'type', 'status')
      .forShare(),
  );
  const bindings = z
    .array(LockedBinding)
    .parse(
      await trx(BINDINGS_TABLE)
        .whereIn('port', Object.keys(SHIPPING_PORTS))
        .select('port', 'metafield_key')
        .forUpdate(),
    );
  const chosen = new Map(bindings.map((binding) => [binding.port, binding.metafield_key]));

  for (const [port, key] of named) {
    const { property, wrongType } = SHIPPING_PORTS[port];
    const field = fields.find((candidate) => candidate.key === key);
    if (!field) {
      throw new errors.ValidationError({
        message: 'Choose a custom field the site already has.',
        property,
      });
    }
    // Keeping a field that was archived after it was chosen is allowed, so a client can save
    // back what it read. Checkouts stop asking while the address field is archived, and an
    // archived name field just isn't written to.
    if (field.status !== FIELD_STATUS.active && chosen.get(port) !== key) {
      throw new errors.ValidationError({
        message: 'An archived custom field cannot receive collected data. Restore it first.',
        property,
      });
    }
    if (field.type !== PORT_FIELD[port].type) {
      throw new errors.ValidationError({ message: wrongType, property });
    }
  }
}
