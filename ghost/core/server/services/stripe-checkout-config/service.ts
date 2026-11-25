import { isDeepStrictEqual } from 'node:util';
import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import type { Knex } from 'knex';
import {
  PORT_FIELD,
  REQUIREMENTS,
  CHECKOUT_PORT,
  CHECKOUT_PORTS,
  type CheckoutPort,
} from '@tryghost/checkout';
import type { FieldStatus } from '../members-metafields/schema';
import type { FieldSource } from '../members-metafields';
import type {
  RequiredTiers,
  SetRequirement,
  TierRequirement,
  TierRequirements as TierRequirementsService,
} from '../tiers/requirements';
import {
  CUSTOM_NAMESPACE,
  type Identity,
  type Key,
  KeySchema,
} from '@tryghost/metafield-types/identity';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RequestContext } from '../../lib/actor';
import type { ActionLog } from '../../lib/action-log/action-log';
import { configRow, type ConfigRowSchema } from './codec';
import {
  COLLECTED_NOUNS,
  COLLECTED_SECTIONS,
  SECTION_NAMES,
  type CheckoutSessionConfig,
  type CollectedSection,
  type PhoneSettings,
  type ShippingSettings,
  type StripeCheckoutConfig,
} from './models';
import { CONFIG_SLUG, CONFIG_TABLE, DbConfigParts } from './schema';
import { parseRequest } from '../../lib/parse-request';
import { CheckoutConfigInput } from './serializers';
import { ensureTransaction } from '../../lib/ensure-transaction';

// A `custom_field_key` is a key in the publisher's `custom` namespace, so the config reads and
// checks only the bindings and fields there.
const BINDINGS_TABLE = 'members_metafield_bindings';
/** A custom field that can take a value: not archived. */
const ACTIVE: FieldStatus = 'active';

/** The settings a request saves for each collected part of the config. */
type CollectedSettings = {
  [Section in CollectedSection]: NonNullable<CheckoutConfigInput[Section]>;
};

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
 * The tier requirement each collected part keeps its tiers and options as, which has the part's
 * name. Its answers come back through that requirement's ports.
 */
type RequiredUnder<Section extends CollectedSection> = (typeof SECTION_NAMES)[Section];

/** The ports of the requirement a part keeps its tiers as, by role. */
type RolesOf<Section extends CollectedSection> = (typeof REQUIREMENTS)[RequiredUnder<Section>];

/**
 * The ports a part's answers come back through: the ports of its requirement. Distributed over
 * each part, so a port of any part reads as a `CheckoutPort`.
 */
type PartPort<Section extends CollectedSection> = Section extends CollectedSection
  ? RolesOf<Section>[keyof RolesOf<Section>]
  : never;

/** Where one of a part's answers is saved: the port it comes back through, and its field. */
type PartDestination<Section extends CollectedSection> = Omit<
  Destination,
  'port' | 'customFieldKey'
> & {
  port: PartPort<Section>;
  customFieldKey: (settings: CollectedSettings[Section]) => Key;
};

/**
 * Each part saves each port of its tier requirement, by the role it plays there, so a port added
 * to the requirement has to be given somewhere to go.
 */
type SavedWhere = {
  [Section in CollectedSection]: {
    destinations: {
      readonly [Role in keyof RolesOf<Section>]: PartDestination<Section> & {
        port: RolesOf<Section>[Role];
      };
    };
  };
};

/**
 * Where each collected part's answers are saved: for each port they come back through, the
 * custom field its settings name.
 */
const PARTS: {
  [Section in CollectedSection]: {
    destinations: Readonly<Record<string, PartDestination<Section>>>;
  };
} = {
  shipping: {
    destinations: {
      address: {
        port: CHECKOUT_PORT.shippingAddress,
        customFieldKey: (shipping) => shipping.addressCustomFieldKey,
        property: 'shipping.address.custom_field_key',
        wrongType: 'Choose an address custom field for the shipping address.',
        holds: 'the shipping address',
      },
      recipient: {
        port: CHECKOUT_PORT.shippingName,
        customFieldKey: (shipping) => shipping.nameCustomFieldKey,
        property: 'shipping.name.custom_field_key',
        wrongType: "Choose a short text custom field for the recipient's name.",
        holds: "the recipient's name",
      },
    },
  },
  phone: {
    destinations: {
      number: {
        port: CHECKOUT_PORT.phone,
        customFieldKey: (phone) => phone.customFieldKey,
        property: 'phone.custom_field_key',
        wrongType: 'Choose a phone custom field for the phone number.',
        holds: 'the phone number',
      },
    },
  },
} satisfies SavedWhere;

/** Where each of a part's answers is saved, whatever role it plays. */
function destinationsOf<Section extends CollectedSection>(
  section: Section,
): PartDestination<Section>[] {
  return Object.values(PARTS[section].destinations);
}

/** The ports the collected parts bind to custom fields, each with what its field holds. */
const PORT_HOLDS = new Map(
  COLLECTED_SECTIONS.flatMap((section) =>
    destinationsOf(section).map(({ port, holds }) => [port, holds] as const),
  ),
);
const COLLECTED_PORTS = [...PORT_HOLDS.keys()];

/** The collected parts a request includes, each with its settings, or null to switch it off. */
export type RequestedParts = { [Section in CollectedSection]?: CollectedSettings[Section] | null };

/**
 * The tier requirement a part is set to, from the settings a request saves: the tiers it's asked
 * on, and its own settings, such as the countries shipping is limited to. Distributed over each
 * part, so the requirement of any part reads as a `SetRequirement`.
 */
const SET_AS: {
  [Section in CollectedSection]: (
    settings: CollectedSettings[Section],
  ) => Section extends CollectedSection ? SetRequirement<RequiredUnder<Section>> : never;
} = {
  shipping: ({ tierIds, allowedCountries }) => ({
    name: SECTION_NAMES.shipping,
    tierIds,
    ...(allowedCountries ? { countries: allowedCountries } : {}),
  }),
  phone: ({ tierIds }) => ({ name: SECTION_NAMES.phone, tierIds }),
};

/**
 * What saving a collected part settles: the tier requirement it's set to, which names the tiers
 * it is limited to, or none for every paid tier, and the custom fields it lands in. Null once
 * the part is switched off.
 */
interface Change {
  section: CollectedSection;
  targets: {
    requirement: SetRequirement;
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
      requirement: SET_AS[section](settings),
      destinations: destinationsOf(section).map(
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

/**
 * One row of the config read: the row's parts, and one port the collected parts bind with its
 * field (or nulls). A config binding several ports comes back as a row for each port.
 */
const ReadRow = DbConfigParts.extend({
  port: z.enum(CHECKOUT_PORTS).nullable(),
  bound_key: z.nullable(KeySchema),
});
type ReadRow = z.output<typeof ReadRow>;

/** The custom field each port is bound to, as the read found them. */
function boundFields(rows: ReadRow[]): Map<CheckoutPort, Key> {
  const bound = new Map<CheckoutPort, Key>();
  for (const row of rows) {
    if (row.port && row.bound_key) {
      bound.set(row.port, row.bound_key);
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
    port: string,
    field: Pick<Identity, 'namespace' | 'key'>,
    now: Date,
    executor: Knex,
  ): Promise<string>;
  remove(port: string, executor: Knex): Promise<void>;
}

/** The custom fields as the metafields domain reads them for this site. */
type FieldReads = Pick<FieldSource, 'locked'>;

/** Which paid tiers' members must give what a port collects. */
export type TierRequirements = Pick<TierRequirementsService, 'browse' | 'require' | 'release'>;

/** Reads and saves the site-wide Stripe Checkout config. */
export class StripeCheckoutConfigService {
  private knex: Knex;
  private actionLog: ActionLog;
  private bindings: PortBinder;
  private fields: FieldReads;
  private requirements: () => TierRequirements;
  private configRow: ConfigRowSchema;

  constructor({
    knex,
    actionLog,
    bindings,
    fields,
    requirements,
    logging,
  }: {
    knex: Knex;
    actionLog: ActionLog;
    bindings: PortBinder;
    fields: FieldReads;
    /** Looked up on each use, as tiers are set up after the config. */
    requirements: () => TierRequirements;
    logging: GhostLogger;
  }) {
    this.knex = knex;
    this.actionLog = actionLog;
    this.bindings = bindings;
    this.fields = fields;
    this.requirements = requirements;
    this.configRow = configRow(logging);
  }

  /**
   * Reads the config, without caching it: the row, the custom fields its ports are bound to, and
   * the tier requirements the collected parts are required under.
   *
   * A collected part is on while tiers list its requirement. Any of its fields being deleted
   * takes its binding with it, which reads as off.
   *
   * Read in one transaction, as the requirements are a second query, so a save committing in
   * between can't pair one save's bindings with another's requirements. Given a transaction as
   * `executor` it reads inside that transaction; given a plain connection it opens its own.
   */
  async read(executor: Knex = this.knex): Promise<StripeCheckoutConfig> {
    return ensureTransaction(executor, (trx) => this.readSaved(trx));
  }

  /**
   * Reads the config as checkouts use it: the design, and for each collected part the tiers it
   * asks on and how.
   *
   * Parts given unsaved take the place of the saved ones, refused as saving them would be, so a
   * preview asks for each part exactly as checkouts would once it was saved. Nothing is written.
   * Given a transaction as `executor` it reads inside that transaction; given a plain connection
   * it opens its own.
   */
  async readForCheckout(
    unsaved: RequestedParts = {},
    executor: Knex = this.knex,
  ): Promise<CheckoutSessionConfig> {
    const changes = changesOf(unsaved);
    // Checked in the same transaction as the read, so both see the same tiers and fields.
    const saved = await ensureTransaction(executor, async (trx) => {
      if (changes.length) {
        await assertTargets(trx, changes, this.fields);
      }
      return this.readSaved(trx);
    });
    const config = { ...saved, ...unsaved };
    return {
      design: config.design,
      shipping: config.shipping && {
        tierIds: config.shipping.tierIds,
        allowedCountries: config.shipping.allowedCountries,
      },
      phone: config.phone && { tierIds: config.phone.tierIds },
    };
  }

  /**
   * The config as saved, with the paid tiers each part is required on, and the custom field each
   * port is bound to.
   */
  private async readSaved(db: Knex.Transaction): Promise<StripeCheckoutConfig> {
    const rows = z.array(ReadRow).parse(
      await db(`${CONFIG_TABLE} as config`)
        // Every port in one join, so the rows grow with the ports rather than with a join per
        // port multiplied together.
        .leftJoin(`${BINDINGS_TABLE} as binding`, (join) =>
          join
            .onIn('binding.port', COLLECTED_PORTS)
            .andOnVal('binding.metafield_namespace', '=', CUSTOM_NAMESPACE),
        )
        .where('config.slug', CONFIG_SLUG)
        .select(
          ...DbConfigParts.keyof().options.map((column) => `config.${column}`),
          'binding.port',
          'binding.metafield_key as bound_key',
        ),
    );

    const [first] = rows;
    const bound = boundFields(rows);
    if (!first) {
      return { design: null, shipping: null, phone: null };
    }
    // A part is on only while tiers list its requirement, so checkouts never ask for more than
    // tiers say their members must give.
    const listed = await this.requirements().browse(db);
    const { design } = z.decode(this.configRow, first);
    return {
      design,
      shipping: shippingFrom(
        bound,
        listed.find((requirement) => requirement.name === SECTION_NAMES.shipping),
      ),
      phone: phoneFrom(
        bound,
        listed.find((requirement) => requirement.name === SECTION_NAMES.phone)?.tierIds,
      ),
    };
  }

  /**
   * Saves the parts of the config that the request includes, and records the save in the staff
   * history.
   *
   * The tiers and fields the collected parts name are checked inside the same transaction as
   * the write, with their rows locked, so nothing can change between the check and the write.
   *
   * Says whether it changed what tiers list to anyone: a requirement, whether each of its ports is
   * bound, or the field a port names.
   *
   * Given a transaction as `executor` it joins that transaction; given a plain connection it
   * opens its own.
   */
  async edit(
    context: RequestContext,
    input: unknown,
    executor: Knex = this.knex,
  ): Promise<{ changedRequirements: boolean }> {
    const { design, ...requested } = parseRequest(CheckoutConfigInput, input, 'checkout_config');
    // Only the parts in the request are written, so saving one part never overwrites another.
    const changes = changesOf(requested);
    const columns = z.encode(this.configRow.partial(), design === undefined ? {} : { design });
    const at = new Date();
    const now = toDatabaseDate(at);

    return ensureTransaction(executor, async (trx) => {
      await assertTargets(trx, changes, this.fields);
      const before = await this.requirements().browse(trx);

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
      // An existing row keeps its id, so read the id back for the history entry.
      const saved = await trx(CONFIG_TABLE).where('slug', CONFIG_SLUG).first('id');
      if (!saved) {
        throw new errors.InternalServerError({
          message: 'The Stripe Checkout config was not found right after saving it.',
        });
      }
      await this.actionLog.record(trx, context, {
        resourceType: 'stripe_checkout_config',
        event: 'edited',
        resourceId: saved.id,
        // The config has no name of its own, so the entry is named after what it configures.
        primaryName: 'Stripe Checkout',
      });
      return {
        changedRequirements: !isDeepStrictEqual(before, await this.requirements().browse(trx)),
      };
    });
  }

  /**
   * Settles which tiers a collected part is limited to and which fields it lands in, as the tier
   * requirement it's required under and the bindings of that requirement's ports. Switched off,
   * it keeps neither, so turning it back on doesn't inherit old tiers or fields.
   */
  private async writeTargets(
    trx: Knex.Transaction,
    { section, targets }: Change,
    now: Date,
  ): Promise<void> {
    if (targets) {
      await this.requirements().require(targets.requirement, now, trx);
      for (const { port, customFieldKey } of targets.destinations) {
        await this.bindings.bind(
          port,
          { namespace: CUSTOM_NAMESPACE, key: customFieldKey },
          now,
          trx,
        );
      }
    } else {
      await this.requirements().release(SECTION_NAMES[section], trx);
      for (const { port } of destinationsOf(section)) {
        await this.bindings.remove(port, trx);
      }
    }
  }
}

/**
 * Shipping as the read found it: on while tiers list its requirement, asked on the tiers and in
 * the countries the requirement covers.
 */
function shippingFrom(
  bound: Map<CheckoutPort, Key>,
  listed: (TierRequirement<'shipping'> & { tierIds: RequiredTiers }) | undefined,
): ShippingSettings | null {
  const address = bound.get(CHECKOUT_PORT.shippingAddress);
  const name = bound.get(CHECKOUT_PORT.shippingName);
  if (!address || !name || !listed) {
    return null;
  }
  return {
    tierIds: listed.tierIds,
    allowedCountries: listed.countries ? [...listed.countries] : null,
    addressCustomFieldKey: address,
    nameCustomFieldKey: name,
  };
}

/**
 * The phone number settings as the read found them: on while tiers list its requirement, asked on
 * the tiers the requirement covers.
 */
function phoneFrom(
  bound: Map<CheckoutPort, Key>,
  tierIds: RequiredTiers | undefined,
): PhoneSettings | null {
  const field = bound.get(CHECKOUT_PORT.phone);
  if (!field || tierIds === undefined) {
    return null;
  }
  return { tierIds, customFieldKey: field };
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

  const tierIds = [...new Set(switchedOn.flatMap((part) => part.requirement.tierIds ?? []))];
  const tiers = tierIds.length
    ? z
        .array(LockedTier)
        .parse(await trx('products').whereIn('id', tierIds).select('id', 'type').forShare())
    : [];
  const typeOfTier = new Map(tiers.map((tier) => [tier.id, tier.type]));
  for (const { section, requirement } of switchedOn) {
    const unusable = requirement.tierIds?.find((id) => typeOfTier.get(id) !== 'paid');
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
    changes.flatMap(({ section }) => destinationsOf(section).map(({ port }) => port)),
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
