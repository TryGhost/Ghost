import type { Knex } from 'knex';
import { z } from 'zod';
import {
  PORT_FIELD,
  PORT_PARTS,
  isAskable,
  isRequiredPort,
  type CheckoutPort,
  type RequiredPort,
} from '@tryghost/checkout';
import type { FieldType } from '@tryghost/metafield-types';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { FieldStatus } from '../members-metafields/schema';

const REQUIREMENTS_TABLE = 'tier_requirements';
const REQUIREMENT_TIERS_TABLE = 'tier_requirement_tiers';

/** The paid tiers a requirement covers: null for every paid tier, including tiers added later. */
export type RequiredTiers = string[] | null;

/**
 * Whether a requirement covers every paid tier, including tiers added later, or only the tiers
 * it names. Stored as a choice rather than read off an empty list, so a requirement limited to
 * some tiers never quietly widens to all of them.
 */
const TierScope = z.enum(['all_paid', 'selected_paid']);
type TierScope = z.infer<typeof TierScope>;

/** How these tiers are stored: every paid tier for null, or only the tiers named. */
function tierScopeOf(tierIds: RequiredTiers): TierScope {
  return tierIds ? 'selected_paid' : 'all_paid';
}

/** A part a requirement is asked in, named by the port its answer is collected under. */
export interface RequirementPart {
  /** Such as `checkout.shipping.address`. */
  port: CheckoutPort;
  /** What the answer is, such as an address. */
  type: FieldType;
}

/**
 * What a tier's members must give: what a port collects, and the parts it's asked in. Where the
 * answers are kept is the ports' bindings' business, so a tier never names a field.
 */
export interface TierRequirement {
  /** The port a checkout collects it under, such as `checkout.shipping`. */
  port: RequiredPort;
  /** Each of its parts whose field can take a value. */
  parts: RequirementPart[];
}

/**
 * One row of the requirements read: a requirement, and one tier it names again only if that tier
 * is paid (or null). A requirement naming several tiers comes back as a row for each.
 */
const ReadRow = z.object({
  port: z.string(),
  tier_scope: TierScope,
  paid_tier_id: z.string().nullable(),
});

interface ReadOptions {
  transacting?: Knex.Transaction;
}

/**
 * What each tier's members must give, named by the port a checkout collects it under: on every
 * paid tier, including tiers added later, or only on the paid tiers named for it. Whatever
 * collects a port asks for it on those tiers, and where each part's answer is kept is the port's
 * binding.
 */
export class TierRequirements {
  private knex: Knex;
  private statusesFor: (db: Knex, ports: readonly string[]) => Promise<Map<string, FieldStatus>>;

  constructor({
    knex,
    statusesFor,
  }: {
    knex: Knex;
    /** The status of the field each of these ports writes into, leaving out ports bound nowhere. */
    statusesFor: (db: Knex, ports: readonly string[]) => Promise<Map<string, FieldStatus>>;
  }) {
    this.knex = knex;
    this.statusesFor = statusesFor;
  }

  /**
   * The paid tiers each of these ports is required on, leaving out ports nothing requires. A
   * requirement only counts the named tiers that are paid, and once every tier it named has been
   * deleted it requires nothing, rather than widening to every paid tier.
   */
  async read(
    ports: readonly RequiredPort[],
    { transacting }: ReadOptions = {},
  ): Promise<Map<RequiredPort, RequiredTiers>> {
    return this.readWhere(transacting ?? this.knex, ports);
  }

  /**
   * What each of these tiers' members must give, by tier, as checkouts would ask for it: a port
   * is left out while it can't be asked for, and a part whose field is archived is left out.
   */
  async forTiers(
    tiers: ReadonlyArray<{ id: string; type: string }>,
  ): Promise<Map<string, TierRequirement[]>> {
    // Only paid tiers have requirements, so nothing is read for the others. Read in one
    // transaction, as the fields' statuses are a second query, so a save committing in between
    // can't pair one save's requirements with another's fields.
    const askable = tiers.some(({ type }) => type === 'paid')
      ? await this.knex.transaction((trx) => this.askable(trx))
      : [];

    return new Map(
      tiers.map((tier): [string, TierRequirement[]] => [
        tier.id,
        tier.type === 'paid'
          ? askable
              .filter(({ tierIds }) => tierIds === null || tierIds.includes(tier.id))
              .map(({ port, parts }) => ({ port, parts }))
          : [],
      ]),
    );
  }

  /** Each requirement that can be asked for, with the paid tiers it covers. */
  private async askable(db: Knex): Promise<Array<TierRequirement & { tierIds: RequiredTiers }>> {
    const required = await this.readWhere(db, null);
    const statuses = await this.statusesFor(
      db,
      [...required.keys()].flatMap((port) => PORT_PARTS[port].map((part) => part.port)),
    );
    const kept = (part: CheckoutPort) => {
      const status = statuses.get(part);
      return status && { ready: status === 'active' };
    };
    return [...required].flatMap(([port, tierIds]) => {
      if (!isAskable(port, kept)) {
        return [];
      }
      const parts = PORT_PARTS[port].flatMap(({ port: part }) =>
        kept(part)?.ready ? [{ port: part, type: PORT_FIELD[part].type }] : [],
      );
      return [{ port, tierIds, parts }];
    });
  }

  /**
   * Requires the port of members on these paid tiers, or on every paid tier for null, in place
   * of whatever it required before.
   */
  async require(
    port: RequiredPort,
    tierIds: RequiredTiers,
    now: Date,
    { transacting }: { transacting: Knex.Transaction },
  ): Promise<void> {
    const tierScope = tierScopeOf(tierIds);
    const at = toDatabaseDate(now);
    await transacting(REQUIREMENTS_TABLE)
      .insert({ port, tier_scope: tierScope, created_at: at, updated_at: at })
      .onConflict('port')
      .merge({ tier_scope: tierScope, updated_at: at });

    await transacting(REQUIREMENT_TIERS_TABLE).where('port', port).del();
    if (tierIds?.length) {
      await transacting(REQUIREMENT_TIERS_TABLE).insert(
        tierIds.map((productId) => ({ port, product_id: productId })),
      );
    }
  }

  /** Stops requiring the port on any tier. */
  async release(
    port: RequiredPort,
    { transacting }: { transacting: Knex.Transaction },
  ): Promise<void> {
    await transacting(REQUIREMENT_TIERS_TABLE).where('port', port).del();
    await transacting(REQUIREMENTS_TABLE).where('port', port).del();
  }

  /** The requirements for these ports, or for every port when null. */
  private async readWhere(
    db: Knex,
    ports: readonly RequiredPort[] | null,
  ): Promise<Map<RequiredPort, RequiredTiers>> {
    if (ports?.length === 0) {
      return new Map();
    }
    const query = db(`${REQUIREMENTS_TABLE} as requirement`)
      .leftJoin(`${REQUIREMENT_TIERS_TABLE} as named`, 'named.port', 'requirement.port')
      .leftJoin('products as tier', (join) =>
        join.on('tier.id', '=', 'named.product_id').andOnVal('tier.type', '=', 'paid'),
      )
      .orderBy(['requirement.port', 'tier.id'])
      .select('requirement.port', 'requirement.tier_scope', 'tier.id as paid_tier_id');
    const rows = z
      .array(ReadRow)
      .parse(ports ? await query.whereIn('requirement.port', ports) : await query);

    const required = new Map<RequiredPort, RequiredTiers>();
    for (const { port, tier_scope: tierScope, paid_tier_id: tierId } of rows) {
      // A port no longer offered requires nothing.
      if (!isRequiredPort(port)) {
        continue;
      }
      if (tierScope === 'all_paid') {
        required.set(port, null);
      } else if (tierId) {
        required.set(port, [...new Set([...(required.get(port) ?? []), tierId])]);
      }
    }
    return required;
  }
}

declare module 'knex/types/tables' {
  interface Tables {
    tier_requirements: Knex.CompositeTableType<{
      port: string;
      tier_scope: TierScope;
      created_at: string;
      updated_at: string | null;
    }>;
    tier_requirement_tiers: Knex.CompositeTableType<{ port: string; product_id: string }>;
  }
}
