import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import type { Knex } from 'knex';
import type { FieldType } from '@tryghost/metafield-types';
import { PORT_FIELD, STRIPE_PORT, type StripePort } from '@tryghost/checkout';
import { FIELD_STATUS } from '../members-metafields/schema';
import type { Metafield } from '../members-metafields';
import {
  ConfigColumns,
  DesignColumn,
  SectionColumns,
  assemble,
  boundPorts,
  fromDesign,
  selectedTiers,
  toDesign,
  type ConfigParts,
  type TierScope,
} from './codec';
import {
  CONFIG_SLUG,
  CONFIG_TABLE,
  CONFIG_TIERS_TABLE,
  boundPortRows,
  designColumn,
  sectionColumns,
  selectedTierRows,
  tierTypes,
} from './queries';
import { CHECKOUT_SECTIONS } from './schema';
import {
  nothingCollected,
  type CheckoutTier,
  type ResolvedCheckout,
  type StripeCheckoutConfig,
  type StripeCheckoutDesign,
  type TierIds,
} from './models';
import { CheckoutConfigInput } from './serializers';

/**
 * A request states its settings in named sections. Shipping and phone each stand for one or
 * more of the values Stripe hands back when a checkout is completed — shipping covers both
 * the recipient's name and their address, phone covers only the phone number.
 *
 * Naming those values here means that a request which includes a section settles every
 * value in it: each one is either given a destination or has its old one removed. Without
 * this list, a value the request never mentioned could keep a destination from an earlier
 * save that the publisher believes they have turned off.
 */
/** Where a request names each port's destination, so a refusal can point at that input. */
const DESTINATION_PATH = {
  shipping_name: 'shipping.name.custom_field_key',
  shipping_address: 'shipping.address.custom_field_key',
  phone: 'phone.custom_field_key',
} as const satisfies Record<StripePort, string>;

const SECTION_PORTS = {
  shipping: [STRIPE_PORT.shippingName, STRIPE_PORT.shippingAddress],
  phone: [STRIPE_PORT.phone],
} as const satisfies Record<string, readonly StripePort[]>;

interface BindingPlan {
  clear: StripePort[];
  bind: Array<{ port: StripePort; key: string }>;
}

export interface PortBinder {
  bind(db: Knex, port: string, customFieldKey: string, now: Date): Promise<string>;
  remove(db: Knex, port: string): Promise<void>;
}

export interface FieldFinder {
  findByKey(key: string): Promise<Metafield | null>;
}

/**
 * How Stripe Checkout looks and what it collects beyond the payment, for the whole site, and
 * what that comes to for any one tier.
 */
export class StripeCheckoutConfigService {
  private knex: Knex;
  private bindings: PortBinder;
  private fields: FieldFinder;

  constructor({
    knex,
    bindings,
    fields,
  }: {
    knex: Knex;
    bindings: PortBinder;
    fields: FieldFinder;
  }) {
    this.knex = knex;
    this.bindings = bindings;
    this.fields = fields;
  }

  async read(): Promise<StripeCheckoutConfig> {
    const [{ config }, design] = await Promise.all([this.parts(), this.design()]);
    return { ...config, design };
  }

  /**
   * The publisher's design, or null to keep the one in their Stripe dashboard.
   *
   * A stored design that no longer reads, such as one using a font Stripe has since
   * dropped, is null too, so it costs the styling and nothing else: checkouts keep selling,
   * and the publisher can still open and save the rest of their settings.
   */
  async design(): Promise<StripeCheckoutDesign | null> {
    const decoded = z.safeDecode(DesignColumn, await designColumn(this.knex));
    if (!decoded.success) {
      logging.warn(
        { event: { name: 'stripe_checkout.design.unreadable' }, err: decoded.error },
        'Ignoring a Stripe Checkout design that can no longer be read',
      );
      return null;
    }
    return toDesign(decoded.data.design);
  }

  /**
   * What a tier's checkout asks Stripe to collect, read fresh for every checkout. A tier
   * that does not exist, or is free, collects nothing.
   */
  async resolve(tierId: string): Promise<ResolvedCheckout> {
    return (await this.resolveEach([tierId])).get(tierId) ?? nothingCollected();
  }

  /** The same, for every tier on a page, from one read. */
  async resolveEach(tierIds: string[]): Promise<Map<string, ResolvedCheckout>> {
    const [parts, tiers] = await Promise.all([this.parts(), tierTypes(this.knex, tierIds)]);
    return new Map(tiers.map((tier) => [tier.id, forTier(parts, tier)]));
  }

  /**
   * The ports a completed checkout for this tier may write through. Stripe can return a
   * value it was not asked for, such as a saved shipping address, and what the tier did not
   * ask for is not the publisher's to keep.
   */
  async collectedPorts(tierId: string): Promise<Set<StripePort>> {
    const checkout = await this.resolve(tierId);
    return new Set([
      ...(checkout.shipping ? SECTION_PORTS.shipping : []),
      ...(checkout.phone ? SECTION_PORTS.phone : []),
    ]);
  }

  /**
   * Saves the sections a request states, and leaves the rest alone.
   *
   * A request only has to include the sections it wants to change. Say nothing about
   * shipping and the shipping settings stay exactly as they were, so a client that only
   * knows how to edit the phone number cannot wipe out the shipping settings by omitting
   * them.
   */
  async edit(input: unknown): Promise<void> {
    const stated = parseInput(input);
    await assertPaidTiers(this.knex, stated);
    const plan = await this.planBindings(stated);
    const now = new Date();

    await this.knex.transaction(async (trx) => {
      await writeColumns(trx, stated, now);
      await writeSelectedTiers(trx, stated);

      for (const port of plan.clear) {
        await this.bindings.remove(trx, port);
      }
      for (const { port, key } of plan.bind) {
        await this.bindings.bind(trx, port, key, now);
      }
    });
  }

  private async parts(): Promise<ConfigParts> {
    const [sections, selected, bound] = await Promise.all([
      sectionColumns(this.knex),
      selectedTierRows(this.knex),
      boundPortRows(this.knex),
    ]);
    return assemble(z.decode(SectionColumns, sections), selectedTiers(selected), boundPorts(bound));
  }

  /**
   * Destinations are chosen, never made. A publisher picks a field they already keep, so
   * nothing turns up in their custom fields that they did not create themselves.
   */
  private async planBindings(stated: CheckoutConfigInput): Promise<BindingPlan> {
    const bind: Array<{ port: StripePort; key: string }> = [];

    if (stated.shipping?.collect) {
      bind.push(
        { port: STRIPE_PORT.shippingName, key: stated.shipping.name.custom_field_key },
        { port: STRIPE_PORT.shippingAddress, key: stated.shipping.address.custom_field_key },
      );
    }
    if (stated.phone?.collect) {
      bind.push({ port: STRIPE_PORT.phone, key: stated.phone.custom_field_key });
    }

    for (const { port, key } of bind) {
      assertCollectableInto(port, await this.fields.findByKey(key), PORT_FIELD[port].type);
    }

    const bound = new Set<StripePort>(bind.map(({ port }) => port));
    const clear: StripePort[] = [];
    for (const section of ['shipping', 'phone'] as const) {
      if (stated[section]) {
        clear.push(...SECTION_PORTS[section].filter((port) => !bound.has(port)));
      }
    }

    return { clear, bind };
  }
}

/**
 * A section applies to a paid tier when it names that tier, or names none and so covers
 * every paid tier. It is asked for only while it has somewhere to put what it collects.
 */
function forTier({ config, collectable }: ConfigParts, tier: CheckoutTier): ResolvedCheckout {
  if (tier.type !== 'paid') {
    return nothingCollected();
  }

  const appliesTo = (section: { tierIds: TierIds } | null): boolean =>
    section !== null && (section.tierIds === null || section.tierIds.includes(tier.id));

  return {
    shipping:
      config.shipping && appliesTo(config.shipping) && collectable.shipping
        ? { allowedCountries: config.shipping.allowedCountries }
        : null,
    phone: appliesTo(config.phone) && collectable.phone,
    taxNumber: appliesTo(config.taxNumber),
  };
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

/**
 * A section names paid tiers or none. A free tier never reaches a checkout, so naming one
 * would be a setting that looks saved and does nothing. An archived paid tier is accepted:
 * it keeps its place in the list for when it is restored.
 */
async function assertPaidTiers(db: Knex, stated: CheckoutConfigInput): Promise<void> {
  const named = CHECKOUT_SECTIONS.flatMap((section) => {
    const block = stated[section];
    return block?.collect && block.tier_ids ? [{ section, ids: block.tier_ids }] : [];
  });
  if (named.length === 0) {
    return;
  }

  const rows = await tierTypes(db, [...new Set(named.flatMap(({ ids }) => ids))]);
  const typeOf = new Map(rows.map((row) => [row.id, row.type]));

  for (const { section, ids } of named) {
    const unusable = ids.find((id) => typeOf.get(id) !== 'paid');
    if (unusable) {
      throw new errors.ValidationError({
        message: typeOf.has(unusable)
          ? 'Only paid tiers have a checkout to collect at.'
          : `Unknown tier: ${unusable}`,
        property: `${section}.tier_ids`,
      });
    }
  }
}

/**
 * Refuses a custom field that cannot hold what Stripe will send back.
 *
 * A request names the custom field each collected value should be saved into. That field
 * has to exist, it has to be active, because an archived field accepts no new values, and
 * it has to store the right kind of data: Stripe returns a structured address for the
 * shipping address, and plain text for a name or a phone number.
 *
 * The refusals are deliberate rather than defensive. Ghost could save the value into some
 * other field, or accept the request and quietly collect nothing, but a publisher who named
 * a field meant that field. Being told now is better than finding out weeks later that
 * nothing was ever recorded.
 */
function assertCollectableInto(
  port: StripePort,
  field: Metafield | null,
  valueType: FieldType,
): asserts field is Metafield {
  const property = DESTINATION_PATH[port];
  if (!field) {
    throw new errors.ValidationError({
      message: 'Choose a custom field the site already has.',
      property,
    });
  }
  if (field.status !== FIELD_STATUS.active) {
    throw new errors.ValidationError({
      message: 'An archived custom field cannot receive collected data. Restore it first.',
      property,
    });
  }
  if (field.type !== valueType) {
    throw new errors.ValidationError({
      message: `This can only be collected into a ${valueType} field.`,
      property,
    });
  }
}

async function writeColumns(
  trx: Knex.Transaction,
  stated: CheckoutConfigInput,
  now: Date,
): Promise<void> {
  const { shipping, phone, tax_number: taxNumber, design } = stated;
  const tierScope = (block: { tier_ids?: string[] }): TierScope =>
    block.tier_ids ? 'selected_paid' : 'all_paid';

  // Only the columns this request spoke about are written, so two requests changing
  // different sections cannot undo each other.
  const columns = z.encode(ConfigColumns.partial(), {
    ...(shipping
      ? {
          shipping: shipping.collect
            ? {
                tier_scope: tierScope(shipping),
                allowed_countries: shipping.allowed_countries ?? null,
              }
            : null,
        }
      : {}),
    ...(phone ? { phone: phone.collect ? { tier_scope: tierScope(phone) } : null } : {}),
    ...(taxNumber
      ? { tax_number: taxNumber.collect ? { tier_scope: tierScope(taxNumber) } : null }
      : {}),
    ...(design
      ? {
          design: design.customize
            ? fromDesign({
                buttonColor: design.button_color,
                backgroundColor: design.background_color,
                borderStyle: design.border_style,
                fontFamily: design.font_family,
              })
            : null,
        }
      : {}),
  });

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
}

/**
 * A section the request names has its tiers settled: the ones it lists, or none when it
 * covers every paid tier or is switched off. A section the request leaves out keeps its
 * tiers.
 */
async function writeSelectedTiers(trx: Knex.Transaction, stated: CheckoutConfigInput) {
  for (const section of CHECKOUT_SECTIONS) {
    const block = stated[section];
    if (!block) {
      continue;
    }
    await trx(CONFIG_TIERS_TABLE).where('section', section).del();
    if (block.collect && block.tier_ids) {
      await trx(CONFIG_TIERS_TABLE).insert(
        block.tier_ids.map((productId) => ({ section, product_id: productId })),
      );
    }
  }
}
