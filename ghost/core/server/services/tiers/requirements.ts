import type { Knex } from 'knex';
import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import {
  REQUIREMENTS,
  isRequirementName,
  isStripeAllowedCountry,
  portsOf,
  type CheckoutPort,
  type RequirementName,
} from '@tryghost/checkout';
import { toDatabaseDate, type DatabaseDate } from '../../lib/db-types/date';
import { DbJson } from '../../lib/db-types/json';

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

/**
 * What a tier's members must give: a requirement by name, such as `shipping`, with the port each
 * of its answers is collected under, by the role it plays, such as `recipient`, and for a shipping
 * address limited to some countries, those countries. Where the answers are kept is the ports'
 * bindings' business, so a tier never names a field.
 */
export interface TierRequirement {
  name: RequirementName;
  ports: Readonly<Record<string, CheckoutPort>>;
  /** ISO 3166-1 alpha-2 codes an address must be in, when fewer than everywhere Stripe ships. */
  countries?: readonly string[];
}

/** Where a requirement applies: on which paid tiers, and in which countries, or null for all. */
export interface RequiredOn {
  tierIds: RequiredTiers;
  countries: readonly string[] | null;
}

/**
 * The countries a requirement is limited to, as stored. An empty list, or a country Stripe no
 * longer ships to, would leave nowhere a member could give, so either reads as unreadable.
 */
const DbCountries = DbJson(
  z.array(z.string().refine((code): boolean => isStripeAllowedCountry(code))).min(1),
  {
    message: 'The stored countries are not JSON.',
  },
);

/**
 * One row of the requirements read: a requirement, and one tier it names again only if that tier
 * is paid (or null). A requirement naming several tiers comes back as a row for each. Its name,
 * scope and countries are read as stored, and checked against what this version knows as they're
 * used.
 */
const ReadRow = z.object({
  requirement: z.string(),
  tier_scope: z.string(),
  countries: z.string().nullable(),
  paid_tier_id: z.string().nullable(),
});

/**
 * What each tier's members must give, such as a shipping address: on every paid tier, including
 * tiers added later, or only on the paid tiers named for it. Whatever collects it asks for it on
 * those tiers, and where each answer is kept is the binding of the port it's collected under.
 */
export class TierRequirements {
  private knex: Knex;
  private boundPorts: (db: Knex, ports: readonly string[]) => Promise<ReadonlySet<string>>;
  private logging: Pick<GhostLogger, 'warn'>;

  constructor({
    knex,
    boundPorts,
    logging,
  }: {
    knex: Knex;
    /** Which of these ports write into a custom field, whatever that field's status. */
    boundPorts: (db: Knex, ports: readonly string[]) => Promise<ReadonlySet<string>>;
    logging: Pick<GhostLogger, 'warn'>;
  }) {
    this.knex = knex;
    this.boundPorts = boundPorts;
    this.logging = logging;
  }

  /**
   * What each of these tiers' members must give, by tier, as checkouts would ask for it: a
   * requirement is left out while one of its ports is bound to no custom field.
   */
  async forTiers(
    tiers: ReadonlyArray<{ id: string; type: string }>,
  ): Promise<Map<string, TierRequirement[]>> {
    // Only paid tiers have requirements, so nothing is read for the others. Read in one
    // transaction, as the bindings are a second query, so a save committing in between can't
    // pair one save's requirements with another's bindings.
    const listed = tiers.some(({ type }) => type === 'paid')
      ? await this.knex.transaction((trx) => this.browse({ transacting: trx }))
      : [];

    return new Map(
      tiers.map((tier): [string, TierRequirement[]] => [
        tier.id,
        tier.type === 'paid'
          ? listed
              .filter(({ tierIds }) => tierIds === null || tierIds.includes(tier.id))
              .map(({ tierIds: _tierIds, ...requirement }) => requirement)
          : [],
      ]),
    );
  }

  /**
   * Every requirement as tiers list it, with the paid tiers it covers: one is left out while one
   * of its ports is bound to no custom field. A port whose field is archived still counts, as
   * checkouts still ask for it and drop the answer.
   */
  async browse({
    transacting,
  }: {
    transacting: Knex.Transaction;
  }): Promise<Array<TierRequirement & { tierIds: RequiredTiers }>> {
    const required = await this.readRequired(transacting);
    const bound = await this.boundPorts(transacting, [...required.keys()].flatMap(portsOf));
    return [...required].flatMap(([name, { tierIds, countries }]) =>
      portsOf(name).every((port) => bound.has(port))
        ? [{ name, ports: REQUIREMENTS[name], tierIds, ...(countries ? { countries } : {}) }]
        : [],
    );
  }

  /**
   * Requires this of members on these paid tiers, or on every paid tier for null, and in these
   * countries, or everywhere Stripe ships for null, in place of whatever it required before.
   */
  async require(
    requirement: RequirementName,
    { tierIds, countries }: RequiredOn,
    now: Date,
    { transacting }: { transacting: Knex.Transaction },
  ): Promise<void> {
    const tierScope = tierScopeOf(tierIds);
    const storedCountries = countries ? z.encode(DbCountries, [...countries]) : null;
    const at = toDatabaseDate(now);
    await transacting(REQUIREMENTS_TABLE)
      .insert({
        requirement,
        tier_scope: tierScope,
        countries: storedCountries,
        created_at: at,
        updated_at: at,
      })
      .onConflict('requirement')
      .merge({ tier_scope: tierScope, countries: storedCountries, updated_at: at });

    await transacting(REQUIREMENT_TIERS_TABLE).where('requirement', requirement).del();
    if (tierIds?.length) {
      await transacting(REQUIREMENT_TIERS_TABLE).insert(
        tierIds.map((productId) => ({ requirement, product_id: productId })),
      );
    }
  }

  /** Stops requiring this on any tier. */
  async release(
    requirement: RequirementName,
    { transacting }: { transacting: Knex.Transaction },
  ): Promise<void> {
    await transacting(REQUIREMENT_TIERS_TABLE).where('requirement', requirement).del();
    await transacting(REQUIREMENTS_TABLE).where('requirement', requirement).del();
  }

  /**
   * Where each requirement applies, leaving out what nothing requires. A requirement only counts
   * the named tiers that are paid, and once every tier it named has been deleted it requires
   * nothing, rather than widening to every paid tier.
   */
  private async readRequired(db: Knex): Promise<Map<RequirementName, RequiredOn>> {
    const query = db(`${REQUIREMENTS_TABLE} as required`)
      .leftJoin(`${REQUIREMENT_TIERS_TABLE} as named`, 'named.requirement', 'required.requirement')
      .leftJoin('products as tier', (join) =>
        join.on('tier.id', '=', 'named.product_id').andOnVal('tier.type', '=', 'paid'),
      )
      .orderBy(['required.requirement', 'tier.id'])
      .select(
        'required.requirement',
        'required.tier_scope',
        'required.countries',
        'tier.id as paid_tier_id',
      );
    const rows = z.array(ReadRow).parse(await query);

    const required = new Map<RequirementName, RequiredOn>();
    const unreadable = new Set<RequirementName>();
    for (const row of rows) {
      const { requirement: name, paid_tier_id: tierId } = row;
      // A requirement no longer offered requires nothing.
      if (!isRequirementName(name)) {
        continue;
      }
      // Nor does a scope this version doesn't know, such as one a later version stored, or
      // countries that can't be read, so the other requirements and settings still read, and
      // the requirement never widens to everywhere. It comes back as a row per tier it names,
      // and is reported once.
      const tierScope = TierScope.safeParse(row.tier_scope);
      const countries = row.countries === null ? null : DbCountries.safeParse(row.countries);
      if (!tierScope.success || countries?.success === false) {
        if (!unreadable.has(name)) {
          unreadable.add(name);
          this.logging.warn(
            {
              event: { name: 'tiers.requirement_unreadable' },
              requirement: name,
              tier_scope: row.tier_scope,
              countries: row.countries,
            },
            'Ignoring a tier requirement that could not be read',
          );
        }
        continue;
      }
      const limitedTo = countries?.data ?? null;
      if (tierScope.data === 'all_paid') {
        required.set(name, { tierIds: null, countries: limitedTo });
      } else if (tierId) {
        const tierIds = [...new Set([...(required.get(name)?.tierIds ?? []), tierId])];
        required.set(name, { tierIds, countries: limitedTo });
      }
    }
    return required;
  }
}

declare module 'knex/types/tables' {
  interface Tables {
    // Read as stored, where a later version may have kept a scope this one doesn't know, and
    // written as this one stores it.
    tier_requirements: Knex.CompositeTableType<
      {
        requirement: string;
        tier_scope: string;
        countries: string | null;
        created_at: DatabaseDate;
        updated_at: DatabaseDate | null;
      },
      {
        requirement: string;
        tier_scope: TierScope;
        countries: string | null;
        created_at: string;
        updated_at: string | null;
      },
      { tier_scope?: TierScope; countries?: string | null; updated_at?: string }
    >;
    tier_requirement_tiers: Knex.CompositeTableType<{ requirement: string; product_id: string }>;
  }
}
