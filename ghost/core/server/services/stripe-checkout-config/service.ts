import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import type { Knex } from 'knex';
import { PORT_FIELD, STRIPE_PORT, STRIPE_PORTS, type StripePort } from '@tryghost/checkout';
import type { FieldStatus } from '../members-metafields/schema';
import type { FieldSource } from '../members-metafields';
import {
  CUSTOM_NAMESPACE,
  type Identity,
  type Key,
  KeySchema,
} from '@tryghost/metafield-types/identity';
import { snakeKeys } from '../../lib/case-keys';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RecordCheckoutConfigAction, RequestContext } from './actions';
import { configRow, type ConfigRowSchema, type TierScope } from './codec';
import {
  COLLECTED_NOUNS,
  COLLECTED_SECTIONS,
  SECTION_NAMES,
  type CheckoutSessionConfig,
  type CollectedSection,
  type PhoneSettings,
  type ShippingSettings,
  type StripeCheckoutConfig,
  type TaxNumberSettings,
} from './models';
import { CONFIG_SLUG, CONFIG_TABLE, CONFIG_TIERS_TABLE, DbConfigParts, DbSection } from './schema';
import { parseRequest } from '../../lib/parse-request';
import { CheckoutConfigInput } from './serializers';

// A `custom_field_key` is a key in the publisher's `custom` namespace, so the config reads and
// checks only the bindings and fields there.
const BINDINGS_TABLE = 'members_metafield_bindings';
/** A custom field that can take a value: not archived. */
const ACTIVE: FieldStatus = 'active';

/** The settings a request saves for each collected part of the config. */
type CollectedSettings = {
  [Section in CollectedSection]: NonNullable<CheckoutConfigInput[Section]>;
};

/** What each collected part keeps in its own column of the config row. */
type StoredParts = {
  [Section in CollectedSection]: NonNullable<
    z.output<ConfigRowSchema>[(typeof SECTION_NAMES)[Section]]
  >;
};
type StoredPart<Section extends CollectedSection> = StoredParts[Section];

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
      },
      {
        port: STRIPE_PORT.shippingName,
        customFieldKey: (shipping) => shipping.nameCustomFieldKey,
        property: 'shipping.name.custom_field_key',
        wrongType: "Choose a short text custom field for the recipient's name.",
        holds: "the recipient's name",
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
      },
    ],
  },
  taxNumber: {
    stored: (taxNumber) => ({ tier_scope: tierScopeOf(taxNumber) }),
    // Stripe keeps the tax ID on the customer, so Ghost saves nothing from it.
    destinations: [],
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
export type RequestedParts = { [Section in CollectedSection]?: CollectedSettings[Section] | null };

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

/** What saving the parts in a request settles, for the parts it includes. */
function changesOf(requested: RequestedParts): Change[] {
  return COLLECTED_SECTIONS.flatMap((section) => {
    const settings = requested[section];
    return settings === undefined ? [] : [changeOf(section, settings)];
  });
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

/** What the collected parts in a request keep in their columns, by part. */
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
 * again only if it is paid (or nulls), and one port the collected parts bind with its field (or
 * nulls). A config whose parts name several tiers or bind several ports comes back as a row for
 * each pairing.
 */
const ReadRow = DbConfigParts.extend({
  section: DbSection.nullable(),
  paid_tier_id: z.string().nullable(),
  port: z.enum(STRIPE_PORTS).nullable(),
  bound_key: z.nullable(KeySchema),
});
type ReadRow = z.output<typeof ReadRow>;

/** The custom field each port is bound to, as the read found them. */
function boundFields(rows: ReadRow[]): Map<StripePort, Key> {
  const bound = new Map<StripePort, Key>();
  for (const row of rows) {
    if (row.port && row.bound_key) {
      bound.set(row.port, row.bound_key);
    }
  }
  return bound;
}

const LockedTier = z.object({ id: z.string(), type: z.string() });
const LockedField = z.object({ key: KeySchema, type: z.string(), status: z.string() });
const LockedBinding = z.object({ port: z.enum(STRIPE_PORTS), metafield_key: KeySchema });

/** Points a port at a field, or stops it writing anywhere. */
export interface PortBinder {
  bind(
    db: Knex,
    port: string,
    field: Pick<Identity, 'namespace' | 'key'>,
    now: Date,
  ): Promise<string>;
  remove(db: Knex, port: string): Promise<void>;
}

/** The custom fields as the metafields domain reads them for this site. */
type FieldReads = Pick<FieldSource, 'locked'>;

/** Reads and saves the site-wide Stripe Checkout config. */
export class StripeCheckoutConfigService {
  private knex: Knex;
  private recordAction: RecordCheckoutConfigAction;
  private bindings: PortBinder;
  private fields: FieldReads;
  private configRow: ConfigRowSchema;

  constructor({
    knex,
    recordAction,
    bindings,
    fields,
    logging,
  }: {
    knex: Knex;
    recordAction: RecordCheckoutConfigAction;
    bindings: PortBinder;
    fields: FieldReads;
    logging: GhostLogger;
  }) {
    this.knex = knex;
    this.recordAction = recordAction;
    this.bindings = bindings;
    this.fields = fields;
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
    return this.readSaved();
  }

  /**
   * Reads the config as checkouts use it: the design, and for each collected part the tiers it
   * asks on and how.
   *
   * Parts given unsaved take the place of the saved ones, refused as saving them would be, so a
   * preview asks for each part exactly as checkouts would once it was saved. Nothing is written.
   */
  async readForCheckout(unsaved: RequestedParts = {}): Promise<CheckoutSessionConfig> {
    const changes = changesOf(unsaved);
    // Checked in the same transaction as the read, so both see the same tiers and fields.
    const saved = changes.length
      ? await this.knex.transaction(async (trx) => {
          await assertTargets(trx, changes, this.fields);
          return this.readSaved(trx);
        })
      : await this.readSaved();
    const config = { ...saved, ...unsaved };
    return {
      design: config.design,
      shipping: config.shipping && {
        tierIds: config.shipping.tierIds,
        allowedCountries: config.shipping.allowedCountries,
      },
      phone: config.phone && { tierIds: config.phone.tierIds },
      taxNumber: config.taxNumber && { tierIds: config.taxNumber.tierIds },
    };
  }

  /** The config as saved, with the custom field each port is bound to. */
  private async readSaved(db: Knex = this.knex): Promise<StripeCheckoutConfig> {
    const rows = z.array(ReadRow).parse(
      await db(`${CONFIG_TABLE} as config`)
        // Every part's tiers in one join and every port in another, so the rows grow with the
        // tiers times the ports, rather than with a join per part and per port multiplied
        // together.
        .leftJoin(`${CONFIG_TIERS_TABLE} as named`, (join) =>
          join.onIn(
            'named.section',
            COLLECTED_SECTIONS.map((section) => z.encode(DbSection, section)),
          ),
        )
        .leftJoin('products as tier', (join) =>
          join.on('tier.id', '=', 'named.product_id').andOnVal('tier.type', '=', 'paid'),
        )
        .leftJoin(`${BINDINGS_TABLE} as binding`, (join) =>
          join
            .onIn('binding.port', COLLECTED_PORTS)
            .andOnVal('binding.metafield_namespace', '=', CUSTOM_NAMESPACE),
        )
        .where('config.slug', CONFIG_SLUG)
        .select(
          ...DbConfigParts.keyof().options.map((column) => `config.${column}`),
          'named.section',
          'tier.id as paid_tier_id',
          'binding.port',
          'binding.metafield_key as bound_key',
        ),
    );

    const [first] = rows;
    const bound = boundFields(rows);
    if (!first) {
      return { design: null, shipping: null, phone: null, taxNumber: null };
    }
    const { design, shipping, phone, tax_number: taxNumber } = z.decode(this.configRow, first);
    return {
      design,
      shipping: shipping && shippingFrom(shipping, tierIdsOf('shipping', shipping, rows), bound),
      phone: phone && phoneFrom(tierIdsOf('phone', phone, rows), bound),
      taxNumber: taxNumber && taxNumberFrom(tierIdsOf('taxNumber', taxNumber, rows)),
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
    const changes = changesOf(requested);
    const columns = z.encode(this.configRow.partial(), {
      ...(design === undefined ? {} : { design }),
      ...snakeKeys(storedColumns(requested)),
    });
    const at = new Date();
    const now = toDatabaseDate(at);

    await this.knex.transaction(async (trx) => {
      await assertTargets(trx, changes, this.fields);

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
    const name = z.encode(DbSection, section);
    await trx(CONFIG_TIERS_TABLE).where('section', name).del();
    if (targets?.tierIds) {
      await trx(CONFIG_TIERS_TABLE).insert(
        targets.tierIds.map((productId) => ({ section: name, product_id: productId })),
      );
    }

    if (targets) {
      for (const { port, customFieldKey } of targets.destinations) {
        await this.bindings.bind(
          trx,
          port,
          { namespace: CUSTOM_NAMESPACE, key: customFieldKey },
          now,
        );
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
  bound: Map<StripePort, Key>,
): ShippingSettings | null {
  const address = bound.get(STRIPE_PORT.shippingAddress);
  const name = bound.get(STRIPE_PORT.shippingName);
  if (!address || !name || tierIds?.length === 0) {
    return null;
  }
  return {
    tierIds,
    allowedCountries: stored.allowed_countries,
    addressCustomFieldKey: address,
    nameCustomFieldKey: name,
  };
}

/** The phone number settings as the read found them, or null when what they point at is gone. */
function phoneFrom(tierIds: string[] | null, bound: Map<StripePort, Key>): PhoneSettings | null {
  const field = bound.get(STRIPE_PORT.phone);
  if (!field || tierIds?.length === 0) {
    return null;
  }
  return { tierIds, customFieldKey: field };
}

/** The tax ID settings as the read found them, or null once every tier they named is gone. */
function taxNumberFrom(tierIds: string[] | null): TaxNumberSettings | null {
  return tierIds?.length === 0 ? null : { tierIds };
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
async function assertTargets(
  trx: Knex.Transaction,
  changes: Change[],
  fieldReads: FieldReads,
): Promise<void> {
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
        property: `${SECTION_NAMES[section]}.tier_ids`,
      });
    }
  }

  const destinations = switchedOn.flatMap((part) => part.destinations);
  const fields = z.array(LockedField).parse(
    await fieldReads
      .locked(
        trx,
        CUSTOM_NAMESPACE,
        destinations.map((destination) => destination.customFieldKey),
      )
      .select('key', 'type', 'status'),
  );
  const bindings = z
    .array(LockedBinding)
    .parse(
      await trx(BINDINGS_TABLE)
        .whereIn('port', COLLECTED_PORTS)
        .where('metafield_namespace', CUSTOM_NAMESPACE)
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
