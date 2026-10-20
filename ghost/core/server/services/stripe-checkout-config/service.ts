import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import type { Knex } from 'knex';
import { PORT_FIELD, STRIPE_PORT, STRIPE_PORTS, type StripePort } from '@tryghost/checkout';
import type { FieldStatus } from '../members-metafields/schema';
import { type Key, KeySchema } from '@tryghost/metafield-types/identity';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RecordCheckoutConfigAction, RequestContext } from './actions';
import { configRow, type ConfigRowSchema, type TierScope } from './codec';
import {
  COLLECTED_NOUNS,
  COLLECTED_SECTIONS,
  type CheckoutSessionConfig,
  type CollectedSection,
  type PhoneSettings,
  type ShippingSettings,
  type StripeCheckoutConfig,
} from './models';
import { CONFIG_SLUG, CONFIG_TABLE, CONFIG_TIERS_TABLE } from './schema';
import { parseRequest } from '../../lib/parse-request';
import { CheckoutConfigInput } from './serializers';

const BINDINGS_TABLE = 'members_metafield_bindings';
const FIELDS_TABLE = 'members_metafields';
/** A custom field that can take a value: not archived. */
const ACTIVE: FieldStatus = 'active';

/** The settings a request saves for each collected part of the config. */
type CollectedSettings = {
  [Section in CollectedSection]: NonNullable<CheckoutConfigInput[Section]>;
};

/** What a collected part keeps in its own column of the config row. */
type StoredPart<Section extends CollectedSection> = NonNullable<z.output<ConfigRowSchema>[Section]>;

/** A custom field a request names for a port, and how to say it can't take the port's values. */
interface Destination {
  port: StripePort;
  customFieldKey: Key;
  /** The request property naming the field. */
  property: string;
  wrongType: string;
  /** What the field holds once the port fills it, as messages name it. */
  holds: string;
}

/**
 * How each collected part is saved: what it keeps in its column, and for each port its answers
 * come back through, the custom field its settings name.
 */
const PARTS: {
  [Section in CollectedSection]: {
    stored: (settings: CollectedSettings[Section]) => StoredPart<Section>;
    destinations: Array<
      Omit<Destination, 'customFieldKey'> & {
        customFieldKey: (settings: CollectedSettings[Section]) => Key;
        /**
         * Whether checkouts stop asking for the part while this field can't take a value, as
         * the answer would have nowhere to go.
         */
        essential: boolean;
      }
    >;
  };
} = {
  shipping: {
    stored: (shipping) => ({
      tier_scope: tierScopeOf(shipping),
      allowed_countries: shipping.allowedCountries,
    }),
    destinations: [
      {
        port: STRIPE_PORT.shippingAddress,
        customFieldKey: (shipping) => shipping.addressCustomFieldKey,
        property: 'shipping.address.custom_field_key',
        wrongType: 'Choose an address custom field for the shipping address.',
        holds: 'the shipping address',
        essential: true,
      },
      {
        port: STRIPE_PORT.shippingName,
        customFieldKey: (shipping) => shipping.nameCustomFieldKey,
        property: 'shipping.name.custom_field_key',
        wrongType: "Choose a short text custom field for the recipient's name.",
        holds: "the recipient's name",
        // Without the name, the address is still kept.
        essential: false,
      },
    ],
  },
  phone: {
    stored: (phone) => ({ tier_scope: tierScopeOf(phone) }),
    destinations: [
      {
        port: STRIPE_PORT.phone,
        customFieldKey: (phone) => phone.customFieldKey,
        property: 'phone.custom_field_key',
        wrongType: 'Choose a short text custom field for the phone number.',
        holds: 'the phone number',
        essential: true,
      },
    ],
  },
};

/** The ports the collected parts bind to custom fields, each with what its field holds. */
const PORT_HOLDS = new Map(
  COLLECTED_SECTIONS.flatMap((section) =>
    PARTS[section].destinations.map(({ port, holds }) => [port, holds] as const),
  ),
);
const COLLECTED_PORTS = [...PORT_HOLDS.keys()];

function tierScopeOf({ tierIds }: { tierIds: string[] | null }): TierScope {
  return tierIds ? 'selected_paid' : 'all_paid';
}

/** The collected parts a request includes, each with its settings, or null to switch it off. */
type RequestedParts = { [Section in CollectedSection]?: CollectedSettings[Section] | null };

/**
 * What saving a collected part settles: the tiers it is limited to, or null for every paid tier,
 * and the custom fields it lands in. Null once the part is switched off.
 */
interface Change {
  section: CollectedSection;
  targets: {
    tierIds: string[] | null;
    destinations: Destination[];
  } | null;
}

function changeOf<Section extends CollectedSection>(
  section: Section,
  settings: CollectedSettings[Section] | null,
): Change {
  return {
    section,
    targets: settings && {
      tierIds: settings.tierIds,
      destinations: PARTS[section].destinations.map(
        ({ port, customFieldKey, property, wrongType, holds }): Destination => ({
          port,
          customFieldKey: customFieldKey(settings),
          property,
          wrongType,
          holds,
        }),
      ),
    },
  };
}

/** The columns the collected parts in a request are stored in. */
function storedColumns(requested: RequestedParts): {
  [Section in CollectedSection]?: StoredPart<Section> | null;
} {
  const columns: { [Section in CollectedSection]?: StoredPart<Section> | null } = {};
  const store = <Section extends CollectedSection>(section: Section) => {
    const settings = requested[section];
    if (settings !== undefined) {
      columns[section] = settings && PARTS[section].stored(settings);
    }
  };
  COLLECTED_SECTIONS.forEach(store);
  return columns;
}

/**
 * One row of the config read: the row's parts, one tier a collected part names and that tier
 * again only if it is paid (or nulls), and one port the collected parts bind with its field,
 * and that field again only while it is active (or nulls). A config whose parts name several
 * tiers or bind several ports comes back as a row for each pairing.
 */
const ReadRow = z.object({
  design: z.string().nullable(),
  shipping: z.string().nullable(),
  phone: z.string().nullable(),
  section: z.enum(COLLECTED_SECTIONS).nullable(),
  paid_tier_id: z.string().nullable(),
  port: z.enum(STRIPE_PORTS).nullable(),
  bound_key: z.nullable(KeySchema),
  active_key: z.string().nullable(),
  active_type: z.string().nullable(),
});
type ReadRow = z.output<typeof ReadRow>;

/** A port's custom field as the read found it, and whether it can take a value right now. */
interface Bound {
  customFieldKey: Key;
  ready: boolean;
}

/** The custom field each port is bound to, as the read found them. */
function boundFields(rows: ReadRow[]): Map<StripePort, Bound> {
  const bound = new Map<StripePort, Bound>();
  for (const row of rows) {
    if (row.port && row.bound_key) {
      bound.set(row.port, {
        customFieldKey: row.bound_key,
        // Ready while the field is active and still holds what the port supplies.
        ready: row.active_key !== null && row.active_type === PORT_FIELD[row.port].type,
      });
    }
  }
  return bound;
}

const LockedTier = z.object({ id: z.string(), type: z.string() });
const LockedField = z.object({ key: KeySchema, type: z.string(), status: z.string() });
const LockedBinding = z.object({ port: z.enum(STRIPE_PORTS), metafield_key: KeySchema });

/** Points a port at a custom field, or stops it writing anywhere. */
export interface PortBinder {
  bind(db: Knex, port: string, customFieldKey: Key, now: Date): Promise<string>;
  remove(db: Knex, port: string): Promise<void>;
}

/** Reads and saves the site-wide Stripe Checkout config. */
export class StripeCheckoutConfigService {
  private knex: Knex;
  private recordAction: RecordCheckoutConfigAction;
  private bindings: PortBinder;
  private configRow: ConfigRowSchema;

  constructor({
    knex,
    recordAction,
    bindings,
    logging,
  }: {
    knex: Knex;
    recordAction: RecordCheckoutConfigAction;
    bindings: PortBinder;
    logging: GhostLogger;
  }) {
    this.knex = knex;
    this.recordAction = recordAction;
    this.bindings = bindings;
    this.configRow = configRow(logging);
  }

  /**
   * Reads the config, without caching it, in one query over the row and what it points at.
   *
   * A collected part only counts the named tiers that are paid, and reads as off when it is
   * limited to tiers that have all been deleted, never widening to every tier. Any of its fields
   * being deleted takes its binding with it, which also reads as off.
   */
  async read(): Promise<StripeCheckoutConfig> {
    const { config } = await this.readSaved();
    return config;
  }

  /**
   * Reads the config as checkouts use it: the design, and for each collected part the tiers it
   * asks on and whether it can ask right now.
   */
  async readForCheckout(): Promise<CheckoutSessionConfig> {
    const { config, bound } = await this.readSaved();
    return {
      design: config.design,
      shipping: config.shipping && {
        tierIds: config.shipping.tierIds,
        allowedCountries: config.shipping.allowedCountries,
        collectable: collectableFrom('shipping', bound),
      },
      phone: config.phone && {
        tierIds: config.phone.tierIds,
        collectable: collectableFrom('phone', bound),
      },
    };
  }

  /** The config as saved, and the custom field each port is bound to. */
  private async readSaved(): Promise<{
    config: StripeCheckoutConfig;
    bound: Map<StripePort, Bound>;
  }> {
    const rows = z.array(ReadRow).parse(
      await this.knex(`${CONFIG_TABLE} as config`)
        // Every part's tiers in one join and every port in another, so the rows grow with the
        // tiers times the ports, rather than with a join per part and per port multiplied
        // together.
        .leftJoin(`${CONFIG_TIERS_TABLE} as named`, (join) =>
          join.onIn('named.section', [...COLLECTED_SECTIONS]),
        )
        .leftJoin('products as tier', (join) =>
          join.on('tier.id', '=', 'named.product_id').andOnVal('tier.type', '=', 'paid'),
        )
        .leftJoin(`${BINDINGS_TABLE} as binding`, (join) =>
          join.onIn('binding.port', COLLECTED_PORTS),
        )
        .leftJoin(`${FIELDS_TABLE} as field`, (join) =>
          join.on('field.key', '=', 'binding.metafield_key').andOnVal('field.status', '=', ACTIVE),
        )
        .where('config.slug', CONFIG_SLUG)
        .select(
          'config.design',
          ...COLLECTED_SECTIONS.map((section) => `config.${section}`),
          'named.section',
          'tier.id as paid_tier_id',
          'binding.port',
          'binding.metafield_key as bound_key',
          'field.key as active_key',
          'field.type as active_type',
        ),
    );

    const [first] = rows;
    const bound = boundFields(rows);
    if (!first) {
      return { config: { design: null, shipping: null, phone: null }, bound };
    }
    const { design, shipping, phone } = z.decode(this.configRow, first);
    return {
      config: {
        design,
        shipping: shipping && shippingFrom(shipping, tierIdsOf('shipping', shipping, rows), bound),
        phone: phone && phoneFrom(tierIdsOf('phone', phone, rows), bound),
      },
      bound,
    };
  }

  /**
   * Saves the parts of the config that the request includes, and records the save in the staff
   * history.
   *
   * The tiers and fields the collected parts name are checked inside the same transaction as
   * the write, with their rows locked, so nothing can change between the check and the write.
   */
  async edit(context: RequestContext, input: unknown): Promise<void> {
    const { design, ...requested } = parseRequest(CheckoutConfigInput, input, 'checkout_config');
    // Only the parts in the request are written, so saving one part never overwrites another.
    const changes = COLLECTED_SECTIONS.flatMap((section) => {
      const settings = requested[section];
      return settings === undefined ? [] : [changeOf(section, settings)];
    });
    const columns = z.encode(this.configRow.partial(), {
      ...(design === undefined ? {} : { design }),
      ...storedColumns(requested),
    });
    const at = new Date();
    const now = toDatabaseDate(at);

    await this.knex.transaction(async (trx) => {
      await assertTargets(trx, changes);

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

      for (const change of changes) {
        await this.writeTargets(trx, change, at);
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
   * Settles which tiers a collected part is limited to and which fields it lands in. Switched
   * off, it keeps neither, so turning it back on doesn't inherit old tiers or fields.
   */
  private async writeTargets(
    trx: Knex.Transaction,
    { section, targets }: Change,
    now: Date,
  ): Promise<void> {
    await trx(CONFIG_TIERS_TABLE).where('section', section).del();
    if (targets?.tierIds) {
      await trx(CONFIG_TIERS_TABLE).insert(
        targets.tierIds.map((productId) => ({ section, product_id: productId })),
      );
    }

    if (targets) {
      for (const { port, customFieldKey } of targets.destinations) {
        await this.bindings.bind(trx, port, customFieldKey, now);
      }
    } else {
      for (const { port } of PARTS[section].destinations) {
        await this.bindings.remove(trx, port);
      }
    }
  }
}

/**
 * The tiers a collected part is limited to as the read found them: null for every paid tier,
 * and empty once every tier it named has been deleted.
 */
function tierIdsOf(
  section: CollectedSection,
  { tier_scope: tierScope }: { tier_scope: TierScope },
  rows: ReadRow[],
): string[] | null {
  if (tierScope === 'all_paid') {
    return null;
  }
  return [
    ...new Set(
      rows.flatMap((row) =>
        row.section === section && row.paid_tier_id ? [row.paid_tier_id] : [],
      ),
    ),
  ];
}

/** Shipping as the read found it, or null when what it points at is gone. */
function shippingFrom(
  stored: StoredPart<'shipping'>,
  tierIds: string[] | null,
  bound: Map<StripePort, Bound>,
): ShippingSettings | null {
  const address = bound.get(STRIPE_PORT.shippingAddress);
  const name = bound.get(STRIPE_PORT.shippingName);
  if (!address || !name || tierIds?.length === 0) {
    return null;
  }
  return {
    tierIds,
    allowedCountries: stored.allowed_countries,
    addressCustomFieldKey: address.customFieldKey,
    nameCustomFieldKey: name.customFieldKey,
  };
}

/** The phone number settings as the read found them, or null when what they point at is gone. */
function phoneFrom(tierIds: string[] | null, bound: Map<StripePort, Bound>): PhoneSettings | null {
  const field = bound.get(STRIPE_PORT.phone);
  if (!field || tierIds?.length === 0) {
    return null;
  }
  return { tierIds, customFieldKey: field.customFieldKey };
}

/** Whether checkouts can ask for a part: while every field it can't do without can take a value. */
function collectableFrom(section: CollectedSection, bound: Map<StripePort, Bound>): boolean {
  return PARTS[section].destinations.every(
    ({ port, essential }) => !essential || bound.get(port)?.ready === true,
  );
}

/**
 * Refuses tiers and custom fields the collected parts can't use, checking every part in one
 * pass. The tiers, the fields and the current bindings are locked until the write commits.
 *
 * A part names paid tiers or none. A free tier has no checkout, so naming one would be a
 * setting that looks saved and does nothing. An archived paid tier is accepted, so it keeps its
 * place for when it is restored.
 *
 * A custom field has to exist, be active unless it is the one already chosen, and be the type
 * its port supplies. A publisher who named a field meant that field, so being told now beats
 * finding out later that nothing was saved. Each port needs a field of its own, as two ports
 * writing one field would overwrite each other on every checkout.
 */
async function assertTargets(trx: Knex.Transaction, changes: Change[]) {
  const switchedOn = changes.flatMap(({ section, targets }) =>
    targets ? [{ section, ...targets }] : [],
  );
  if (!switchedOn.length) {
    return;
  }

  const tierIds = [...new Set(switchedOn.flatMap((part) => part.tierIds ?? []))];
  const tiers = tierIds.length
    ? z
        .array(LockedTier)
        .parse(await trx('products').whereIn('id', tierIds).select('id', 'type').forShare())
    : [];
  const typeOfTier = new Map(tiers.map((tier) => [tier.id, tier.type]));
  for (const { section, tierIds: named } of switchedOn) {
    const unusable = named?.find((id) => typeOfTier.get(id) !== 'paid');
    if (unusable) {
      throw new errors.ValidationError({
        message: typeOfTier.has(unusable)
          ? `Only paid tiers have a checkout to collect a ${COLLECTED_NOUNS[section]} at.`
          : `Unknown tier: ${unusable}`,
        property: `${section}.tier_ids`,
      });
    }
  }

  const destinations = switchedOn.flatMap((part) => part.destinations);
  const fields = z.array(LockedField).parse(
    await trx(FIELDS_TABLE)
      .whereIn(
        'key',
        destinations.map((destination) => destination.customFieldKey),
      )
      .select('key', 'type', 'status')
      .forShare(),
  );
  const bindings = z
    .array(LockedBinding)
    .parse(
      await trx(BINDINGS_TABLE)
        .whereIn('port', COLLECTED_PORTS)
        .select('port', 'metafield_key')
        .forUpdate(),
    );
  const chosen = new Map(bindings.map((binding) => [binding.port, binding.metafield_key]));

  for (const { port, customFieldKey, property, wrongType } of destinations) {
    const field = fields.find((candidate) => candidate.key === customFieldKey);
    if (!field) {
      throw new errors.ValidationError({
        message: 'Choose a custom field the site already has.',
        property,
      });
    }
    // Keeping a field that was archived after it was chosen is allowed, so a client can save
    // back what it read. Nothing is written to it while it stays archived.
    if (field.status !== ACTIVE && chosen.get(port) !== customFieldKey) {
      throw new errors.ValidationError({
        message: 'An archived custom field cannot receive collected data. Restore it first.',
        property,
      });
    }
    if (field.type !== PORT_FIELD[port].type) {
      throw new errors.ValidationError({ message: wrongType, property });
    }
  }

  // Only once every field could take its value, so a field of the wrong type says so first.
  // The fields the parts left out of the request keep saving into count too.
  const replaced = new Set(
    changes.flatMap(({ section }) => PARTS[section].destinations.map(({ port }) => port)),
  );
  const saving = [
    ...bindings
      .filter(({ port }) => !replaced.has(port))
      .map(({ port, metafield_key: customFieldKey }) => ({ port, customFieldKey })),
    ...destinations,
  ];
  for (const { port, customFieldKey, property } of destinations) {
    const sharing = saving.find(
      (other) => other.port !== port && other.customFieldKey === customFieldKey,
    );
    if (sharing) {
      throw new errors.ValidationError({
        message: `That custom field already holds ${PORT_HOLDS.get(sharing.port)}. Choose another.`,
        property,
      });
    }
  }
}
