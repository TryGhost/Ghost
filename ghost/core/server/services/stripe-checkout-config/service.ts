import { isDeepStrictEqual } from 'node:util';
import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import type { Knex } from 'knex';
import {
  PORT_FIELD,
  PORT_PARTS,
  CHECKOUT_PORT,
  CHECKOUT_PORTS,
  isAskable,
  type CheckoutPort,
  type RequiredPort,
} from '@tryghost/checkout';
import type { FieldStatus } from '../members-metafields/schema';
import type {
  RequiredTiers,
  TierRequirements as TierRequirementsService,
} from '../tiers/requirements';
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
  SECTION_OF,
  CONFIG_TIER_SECTIONS,
  keepsTiersInConfig,
  type CheckoutSessionConfig,
  type CollectedSection,
  type ConfigTierSection,
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
const FIELDS_TABLE = 'members_metafields';
/** A custom field that can take a value: not archived. */
const ACTIVE: FieldStatus = 'active';

/** The settings a request saves for each collected part of the config. */
type CollectedSettings = {
  [Section in CollectedSection]: NonNullable<CheckoutConfigInput[Section]>;
};

type StoredRow = z.output<ConfigRowSchema>;

/**
 * What each collected part with settings of Stripe's own keeps in its column of the config row.
 * The phone number has none, so it has no column.
 */
type StoredParts = {
  [
    Column in Extract<keyof StoredRow, keyof typeof SECTION_OF> as (typeof SECTION_OF)[Column]
  ]: NonNullable<StoredRow[Column]>;
};
type StoredSection = keyof StoredParts;

/** A custom field a request names for a port, and how to say it can't take the port's values. */
interface Destination {
  port: CheckoutPort;
  customFieldKey: Key;
  /** The request property naming the field. */
  property: string;
  wrongType: string;
  /** What the field holds once the port fills it, as messages name it. */
  holds: string;
}

/**
 * The port each part saved into custom fields is required under: the tier requirement its tiers
 * are kept as. Its answers come back through that port's parts.
 */
const REQUIRED_UNDER = {
  shipping: CHECKOUT_PORT.shipping,
  phone: CHECKOUT_PORT.phone,
} as const satisfies { [Section in Exclude<CollectedSection, ConfigTierSection>]: RequiredPort };
const REQUIRED_PORTS = Object.values(REQUIRED_UNDER);

type RequiredSection = keyof typeof REQUIRED_UNDER;

/** The parts of the port a part saved into custom fields is required under, in order. */
type PartsOf<Section extends RequiredSection> =
  (typeof PORT_PARTS)[(typeof REQUIRED_UNDER)[Section]];

/** The ports a part's answers come back through: the parts of the port it's required under. */
type PartPort<Section extends CollectedSection> = Section extends RequiredSection
  ? PartsOf<Section>[number]['port']
  : never;

/** Where one of a part's answers is saved: the port it comes back through, and its field. */
type PartDestination<Section extends CollectedSection> = Omit<
  Destination,
  'port' | 'customFieldKey'
> & {
  port: PartPort<Section>;
  customFieldKey: (settings: CollectedSettings[Section]) => Key;
};

/** A destination for each of these parts, in the same order. */
type DestinationsOf<Section extends CollectedSection, Parts> = {
  readonly [Index in keyof Parts]: PartDestination<Section> & {
    port: Parts[Index] extends { port: infer Port } ? Port : never;
  };
};

/**
 * A part keeping its tiers in the config saves nowhere. Any other saves each part of the port
 * it's required under, as its tiers are that port's tier requirement, so a part added to the
 * port has to be given somewhere to go.
 */
type SavedWhere = {
  [Section in CollectedSection]: {
    destinations: Section extends RequiredSection
      ? DestinationsOf<Section, PartsOf<Section>>
      : readonly [];
  };
};

/**
 * Where each collected part's answers are saved: for each port they come back through, the
 * custom field its settings name.
 */
const PARTS: {
  [Section in CollectedSection]: { destinations: readonly PartDestination<Section>[] };
} = {
  shipping: {
    destinations: [
      {
        port: CHECKOUT_PORT.shippingAddress,
        customFieldKey: (shipping) => shipping.addressCustomFieldKey,
        property: 'shipping.address.custom_field_key',
        wrongType: 'Choose an address custom field for the shipping address.',
        holds: 'the shipping address',
      },
      {
        port: CHECKOUT_PORT.shippingName,
        customFieldKey: (shipping) => shipping.nameCustomFieldKey,
        property: 'shipping.name.custom_field_key',
        wrongType: "Choose a short text custom field for the recipient's name.",
        holds: "the recipient's name",
      },
    ],
  },
  phone: {
    destinations: [
      {
        port: CHECKOUT_PORT.phone,
        customFieldKey: (phone) => phone.customFieldKey,
        property: 'phone.custom_field_key',
        wrongType: 'Choose a short text custom field for the phone number.',
        holds: 'the phone number',
      },
    ],
  },
  taxNumber: {
    // Stripe keeps the tax ID on the customer, so Ghost saves nothing from it.
    destinations: [],
  },
} satisfies SavedWhere;

/** How each part with a column of its own fills it from the settings a request saves. */
const STORED: {
  [Section in StoredSection]: (settings: CollectedSettings[Section]) => StoredParts[Section];
} = {
  shipping: (shipping) => ({ allowed_countries: shipping.allowedCountries }),
  taxNumber: (taxNumber) => ({ tier_scope: tierScopeOf(taxNumber) }),
};

function hasColumn(section: CollectedSection): section is StoredSection {
  return section in STORED;
}

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
  [Section in StoredSection]?: StoredParts[Section] | null;
} {
  const columns: { [Section in StoredSection]?: StoredParts[Section] | null } = {};
  const store = <Section extends StoredSection>(section: Section) => {
    const settings = requested[section];
    if (settings !== undefined) {
      columns[section] = settings && STORED[section](settings);
    }
  };
  COLLECTED_SECTIONS.filter(hasColumn).forEach(store);
  return columns;
}

/**
 * One row of the config read: the row's parts, one tier a part keeping its tiers in the config
 * names and that tier again only if it is paid (or nulls), and one port the collected parts bind
 * with its field, and that field again only while it is active (or nulls). A config naming
 * several tiers or binding several ports comes back as a row for each pairing.
 */
const ReadRow = DbConfigParts.extend({
  section: DbSection.nullable(),
  paid_tier_id: z.string().nullable(),
  port: z.enum(CHECKOUT_PORTS).nullable(),
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
function boundFields(rows: ReadRow[]): Map<CheckoutPort, Bound> {
  const bound = new Map<CheckoutPort, Bound>();
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
const LockedBinding = z.object({ port: z.enum(CHECKOUT_PORTS), metafield_key: KeySchema });

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

/** Which paid tiers' members must give what a port collects. */
export type TierRequirements = Pick<TierRequirementsService, 'read' | 'require' | 'release'>;

/** Reads and saves the site-wide Stripe Checkout config. */
export class StripeCheckoutConfigService {
  private knex: Knex;
  private recordAction: RecordCheckoutConfigAction;
  private bindings: PortBinder;
  private requirements: TierRequirements;
  private configRow: ConfigRowSchema;

  constructor({
    knex,
    recordAction,
    bindings,
    requirements,
    logging,
  }: {
    knex: Knex;
    recordAction: RecordCheckoutConfigAction;
    bindings: PortBinder;
    requirements: TierRequirements;
    logging: GhostLogger;
  }) {
    this.knex = knex;
    this.recordAction = recordAction;
    this.bindings = bindings;
    this.requirements = requirements;
    this.configRow = configRow(logging);
  }

  /**
   * Reads the config, without caching it: the row and what it points at, and the tier
   * requirements the collected parts are required under.
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
   *
   * Parts given unsaved take the place of the saved ones, refused as saving them would be, so a
   * preview asks for each part exactly as checkouts would once it was saved. Nothing is written.
   */
  async readForCheckout(unsaved: RequestedParts = {}): Promise<CheckoutSessionConfig> {
    const changes = changesOf(unsaved);
    // Checked in the same transaction as the read, so both see the same tiers and fields.
    const { named, saved } = changes.length
      ? await this.knex.transaction(async (trx) => ({
          named: await assertTargets(trx, changes),
          saved: await this.readSaved(trx),
        }))
      : { named: new Map<CheckoutPort, Bound>(), saved: await this.readSaved() };
    const config = { ...saved.config, ...unsaved };
    const bound = new Map([...saved.bound, ...named]);
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
      taxNumber: config.taxNumber && {
        tierIds: config.taxNumber.tierIds,
        collectable: collectableFrom('taxNumber', bound),
      },
    };
  }

  /**
   * The config as saved, the custom field each port is bound to, and the paid tiers each port is
   * required on. Read in one transaction, as the requirements are a second query, so a save
   * committing in between can't pair one save's bindings with another's requirements.
   */
  private async readSaved(db?: Knex.Transaction): Promise<{
    config: StripeCheckoutConfig;
    bound: Map<CheckoutPort, Bound>;
    required: Map<RequiredPort, RequiredTiers>;
  }> {
    if (!db) {
      return this.knex.transaction((trx) => this.readSaved(trx));
    }
    const rows = z.array(ReadRow).parse(
      await db(`${CONFIG_TABLE} as config`)
        // Every part's tiers in one join and every port in another, so the rows grow with the
        // tiers times the ports, rather than with a join per part and per port multiplied
        // together.
        .leftJoin(`${CONFIG_TIERS_TABLE} as named`, (join) =>
          join.onIn(
            'named.section',
            CONFIG_TIER_SECTIONS.map((section) => z.encode(DbSection, section)),
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
        .leftJoin(`${FIELDS_TABLE} as field`, (join) =>
          join
            .on('field.namespace', '=', 'binding.metafield_namespace')
            .andOn('field.key', '=', 'binding.metafield_key')
            .andOnVal('field.status', '=', ACTIVE),
        )
        .where('config.slug', CONFIG_SLUG)
        .select(
          ...DbConfigParts.keyof().options.map((column) => `config.${column}`),
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
      return {
        config: { design: null, shipping: null, phone: null, taxNumber: null },
        bound,
        required: new Map(),
      };
    }
    const required = await this.requirements.read(REQUIRED_PORTS, { transacting: db });
    const { design, shipping, tax_number: taxNumber } = z.decode(this.configRow, first);
    return {
      config: {
        design,
        shipping: shippingFrom(shipping, bound, required.get(REQUIRED_UNDER.shipping)),
        phone: phoneFrom(bound, required.get(REQUIRED_UNDER.phone)),
        taxNumber: taxNumber && taxNumberFrom(tierIdsOf('taxNumber', taxNumber, rows)),
      },
      bound,
      required,
    };
  }

  /**
   * Saves the parts of the config that the request includes, and records the save in the staff
   * history.
   *
   * The tiers and fields the collected parts name are checked inside the same transaction as
   * the write, with their rows locked, so nothing can change between the check and the write.
   *
   * Says whether it changed what tiers list to anyone: a requirement, or whether its parts can be
   * asked for.
   */
  async edit(context: RequestContext, input: unknown): Promise<{ changedRequirements: boolean }> {
    const { design, ...requested } = parseRequest(CheckoutConfigInput, input, 'checkout_config');
    // Only the parts in the request are written, so saving one part never overwrites another.
    const changes = changesOf(requested);
    const columns = z.encode(this.configRow.partial(), {
      ...(design === undefined ? {} : { design }),
      ...snakeKeys(storedColumns(requested)),
    });
    const at = new Date();
    const now = toDatabaseDate(at);

    let changedRequirements = false;
    await this.knex.transaction(async (trx) => {
      await assertTargets(trx, changes);
      const before = await this.listedOnTiers(trx);

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
      changedRequirements = !isDeepStrictEqual(before, await this.listedOnTiers(trx));
    });

    // An existing row keeps its id, so read the id back for the history entry.
    const saved = await this.knex(CONFIG_TABLE).where('slug', CONFIG_SLUG).first('id');
    if (!saved) {
      throw new errors.InternalServerError({
        message: 'The Stripe Checkout config was not found right after saving it.',
      });
    }
    await this.recordAction({ context, subject: saved.id });
    return { changedRequirements };
  }

  /**
   * What a save can change of what tiers list: the requirements, and whether each bound port can
   * take a value. Tiers don't say which field a port writes into, so moving it changes nothing.
   */
  private async listedOnTiers(trx: Knex.Transaction) {
    const { bound, required } = await this.readSaved(trx);
    return { required, ready: new Map([...bound].map(([port, { ready }]) => [port, ready])) };
  }

  /**
   * Settles which tiers a collected part is limited to and which fields it lands in. Switched
   * off, it keeps neither, so turning it back on doesn't inherit old tiers or fields.
   *
   * A part that lands in custom fields keeps its tiers as the tier requirement it's required
   * under. One that lands nowhere keeps them in the config.
   */
  private async writeTargets(
    trx: Knex.Transaction,
    { section, targets }: Change,
    now: Date,
  ): Promise<void> {
    if (keepsTiersInConfig(section)) {
      const name = z.encode(DbSection, section);
      await trx(CONFIG_TIERS_TABLE).where('section', name).del();
      if (targets?.tierIds) {
        await trx(CONFIG_TIERS_TABLE).insert(
          targets.tierIds.map((productId) => ({ section: name, product_id: productId })),
        );
      }
      return;
    }

    const requires = REQUIRED_UNDER[section];
    if (targets) {
      await this.requirements.require(requires, targets.tierIds, now, { transacting: trx });
      for (const { port, customFieldKey } of targets.destinations) {
        await this.bindings.bind(
          trx,
          port,
          { namespace: CUSTOM_NAMESPACE, key: customFieldKey },
          now,
        );
      }
    } else {
      await this.requirements.release(requires, { transacting: trx });
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
  section: ConfigTierSection,
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

/**
 * Shipping as the read found it: on while it's required on some paid tier, both its fields are
 * bound and its countries can be read, asked on the tiers that require it. Countries that can
 * no longer be read leave it off rather than widening to everywhere.
 */
function shippingFrom(
  stored: StoredParts['shipping'] | null,
  bound: Map<CheckoutPort, Bound>,
  tierIds: RequiredTiers | undefined,
): ShippingSettings | null {
  const address = bound.get(CHECKOUT_PORT.shippingAddress);
  const name = bound.get(CHECKOUT_PORT.shippingName);
  if (!stored || !address || !name || tierIds === undefined) {
    return null;
  }
  return {
    tierIds,
    allowedCountries: stored.allowed_countries,
    addressCustomFieldKey: address.customFieldKey,
    nameCustomFieldKey: name.customFieldKey,
  };
}

/**
 * The phone number settings as the read found them: on while it's required on some paid tier
 * and its field is bound, asked on the tiers that require it.
 */
function phoneFrom(
  bound: Map<CheckoutPort, Bound>,
  tierIds: RequiredTiers | undefined,
): PhoneSettings | null {
  const field = bound.get(CHECKOUT_PORT.phone);
  if (!field || tierIds === undefined) {
    return null;
  }
  return { tierIds, customFieldKey: field.customFieldKey };
}

/** The tax ID settings as the read found them, or null once every tier they named is gone. */
function taxNumberFrom(tierIds: string[] | null): TaxNumberSettings | null {
  return tierIds?.length === 0 ? null : { tierIds };
}

/** Whether checkouts can ask for a part: while every field it can't do without can take a value. */
function collectableFrom(section: CollectedSection, bound: Map<CheckoutPort, Bound>): boolean {
  return (
    keepsTiersInConfig(section) || isAskable(REQUIRED_UNDER[section], (part) => bound.get(part))
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
 *
 * Returns the custom field each port the parts name would be bound to once saved.
 */
async function assertTargets(
  trx: Knex.Transaction,
  changes: Change[],
): Promise<Map<CheckoutPort, Bound>> {
  const switchedOn = changes.flatMap(({ section, targets }) =>
    targets ? [{ section, ...targets }] : [],
  );
  if (!switchedOn.length) {
    return new Map();
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
    await trx(FIELDS_TABLE)
      .where('namespace', CUSTOM_NAMESPACE)
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

  return new Map(
    destinations.map(({ port, customFieldKey }): [CheckoutPort, Bound] => [
      port,
      {
        customFieldKey,
        // Each field was checked to be the type its port supplies, so only an archived one
        // kept from before can't take a value.
        ready: fields.some((field) => field.key === customFieldKey && field.status === ACTIVE),
      },
    ]),
  );
}
