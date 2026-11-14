import type { Knex } from 'knex';
import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import {
  REQUIREMENTS,
  isRequirementName,
  isStripeAllowedCountry,
  portsOf,
  type CheckoutPort,
  type ListedPort,
  type ListedRequirement,
  type RequirementName,
  type RequirementSettings,
} from '@tryghost/checkout';
import { toDatabaseDate, type DatabaseDate } from '../../lib/db-types/date';
import { DbJson } from '../../lib/db-types/json';
import { ensureTransaction } from '../../lib/ensure-transaction';

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
 * of its answers is collected under, by the role it plays, such as `recipient`, and the field it's
 * saved into where the port names one, and its own settings, such as the countries shipping is
 * limited to. The shape tiers list it in, which Portal reads.
 */
export type TierRequirement<Name extends RequirementName = RequirementName> =
  ListedRequirement<Name>;

/**
 * A requirement as it's set: its name, the paid tiers it covers, and its own settings, such as the
 * countries shipping is limited to, so a requirement with no countries of its own can't be set to
 * some.
 */
export type SetRequirement<Name extends RequirementName = RequirementName> = {
  [N in Name]: { name: N; tierIds: RequiredTiers } & RequirementSettings[N];
}[Name];

/**
 * The countries shipping is limited to, as stored. An empty list, or a country Stripe no longer
 * ships to, would leave nowhere a member could give, so either reads as unreadable.
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
type ReadRow = z.infer<typeof ReadRow>;

/**
 * Each of these ports that writes into a custom field, whatever that field's status, with the
 * field it names, or null when it names none.
 */
type BoundPorts = (
  ports: readonly string[],
  executor: Knex,
) => Promise<ReadonlyMap<string, string | null>>;

/**
 * What each tier's members must give, such as a shipping address: on every paid tier, including
 * tiers added later, or only on the paid tiers named for it. Whatever collects it asks for it on
 * those tiers, and where each answer is kept is the binding of the port it's collected under.
 */
export class TierRequirements {
  private knex: Knex;
  private boundPorts: BoundPorts;
  private logging: Pick<GhostLogger, 'warn'>;

  constructor({
    knex,
    boundPorts,
    logging,
  }: {
    knex: Knex;
    boundPorts: BoundPorts;
    logging: Pick<GhostLogger, 'warn'>;
  }) {
    this.knex = knex;
    this.boundPorts = boundPorts;
    this.logging = logging;
  }

  /**
   * What each of these tiers' members must give, by tier, as checkouts would ask for it: a
   * requirement is left out while one of its ports is bound to no custom field. Given a
   * transaction as `executor` it reads inside that transaction.
   */
  async forTiers(
    tiers: ReadonlyArray<{ id: string; type: string }>,
    executor: Knex = this.knex,
  ): Promise<Map<string, TierRequirement[]>> {
    // Only paid tiers have requirements, so nothing is read for the others.
    const listed = tiers.some(({ type }) => type === 'paid') ? await this.browse(executor) : [];

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
   *
   * Read in one transaction, as the bindings are a second query, so a save committing in between
   * can't pair one save's requirements with another's bindings. Given a transaction as `executor`
   * it reads inside that transaction; given a plain connection it opens its own.
   */
  async browse(
    executor: Knex = this.knex,
  ): Promise<Array<TierRequirement & { tierIds: RequiredTiers }>> {
    return ensureTransaction(executor, async (trx) => {
      const required = await this.readRequired(trx);
      const bound = await this.boundPorts(
        required.flatMap(({ name }) => portsOf(name)),
        trx,
      );
      return required.flatMap((requirement) =>
        portsOf(requirement.name).every((port) => bound.has(port))
          ? [listedAs(requirement, bound)]
          : [],
      );
    });
  }

  /**
   * Sets a requirement to cover these paid tiers, or every paid tier for null, with its own
   * settings, in place of whatever it was set to before. Given a transaction as `executor` it
   * joins that transaction; given a plain connection it opens its own.
   */
  async require(
    requirement: SetRequirement,
    now: Date,
    executor: Knex = this.knex,
  ): Promise<SetRequirement> {
    const { name, tierIds } = requirement;
    const tierScope = tierScopeOf(tierIds);
    const countries = storedCountries(requirement);
    const at = toDatabaseDate(now);
    return ensureTransaction(executor, async (trx) => {
      await trx(REQUIREMENTS_TABLE)
        .insert({
          requirement: name,
          tier_scope: tierScope,
          countries,
          created_at: at,
          updated_at: at,
        })
        .onConflict('requirement')
        .merge({ tier_scope: tierScope, countries, updated_at: at });

      await trx(REQUIREMENT_TIERS_TABLE).where('requirement', name).del();
      if (tierIds?.length) {
        await trx(REQUIREMENT_TIERS_TABLE).insert(
          tierIds.map((productId) => ({ requirement: name, product_id: productId })),
        );
      }
      return requirement;
    });
  }

  /**
   * Stops requiring this on any tier, and returns the requirement as it was set, or null when
   * nothing required it. Given a transaction as `executor` it joins that transaction; given a
   * plain connection it opens its own.
   */
  async release(
    requirement: RequirementName,
    executor: Knex = this.knex,
  ): Promise<SetRequirement | null> {
    return ensureTransaction(executor, async (trx) => {
      const released = (await this.readRequired(trx)).find(({ name }) => name === requirement);
      await trx(REQUIREMENT_TIERS_TABLE).where('requirement', requirement).del();
      await trx(REQUIREMENTS_TABLE).where('requirement', requirement).del();
      return released ?? null;
    });
  }

  /**
   * Every requirement as it's set, leaving out what nothing requires. A requirement only counts
   * the named tiers that are paid, and once every tier it named has been deleted it requires
   * nothing, rather than widening to every paid tier.
   */
  private async readRequired(db: Knex): Promise<SetRequirement[]> {
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

    // A requirement comes back as a row for each tier it names, each with its scope and settings.
    const stored = new Map<RequirementName, { row: ReadRow; paidTierIds: string[] }>();
    for (const row of rows) {
      // A requirement no longer offered requires nothing.
      if (!isRequirementName(row.requirement)) {
        continue;
      }
      const entry = stored.get(row.requirement) ?? { row, paidTierIds: [] };
      if (row.paid_tier_id) {
        entry.paidTierIds.push(row.paid_tier_id);
      }
      stored.set(row.requirement, entry);
    }

    return [...stored].flatMap(([name, { row, paidTierIds }]) => {
      // Nor does a scope this version doesn't know, such as one a later version stored, or
      // settings that can't be read, so the other requirements and settings still read, and the
      // requirement never widens to everywhere.
      const tierScope = TierScope.safeParse(row.tier_scope);
      const tierIds = tierScope.data === 'all_paid' ? null : [...new Set(paidTierIds)];
      const requirement = tierScope.success ? setAs(name, tierIds, row.countries) : null;
      if (!requirement) {
        this.logging.warn(
          {
            event: { name: 'tiers.requirement_unreadable' },
            requirement: name,
            tier_scope: row.tier_scope,
            countries: row.countries,
          },
          'Ignoring a tier requirement that could not be read',
        );
        return [];
      }
      return tierIds?.length === 0 ? [] : [requirement];
    });
  }
}

/**
 * A requirement as stored, with these tiers, or null when its countries can't be read: shipping
 * keeps its countries in the countries column, or nothing there for anywhere, and a requirement
 * with no countries of its own keeps nothing there.
 */
function setAs(
  name: RequirementName,
  tierIds: RequiredTiers,
  countries: string | null,
): SetRequirement | null {
  switch (name) {
    case 'shipping': {
      if (countries === null) {
        return { name, tierIds };
      }
      const read = DbCountries.safeParse(countries);
      return read.success ? { name, tierIds, countries: read.data } : null;
    }
    case 'phone':
      return countries === null ? { name, tierIds } : null;
  }
}

/** What a requirement keeps in the countries column: shipping's countries, or nothing. */
function storedCountries(requirement: SetRequirement): string | null {
  switch (requirement.name) {
    case 'shipping':
      return requirement.countries ? z.encode(DbCountries, [...requirement.countries]) : null;
    case 'phone':
      return null;
  }
}

/** A requirement as tiers list it, each of its roles' port with the field it names, if any. */
function listedAs(
  requirement: SetRequirement,
  bound: ReadonlyMap<string, string | null>,
): TierRequirement & { tierIds: RequiredTiers } {
  const listed = (port: CheckoutPort): ListedPort => {
    const field = bound.get(port);
    return field ? { port, field } : { port };
  };
  switch (requirement.name) {
    case 'shipping': {
      const { name, tierIds, countries } = requirement;
      const { recipient, address } = REQUIREMENTS.shipping;
      return {
        name,
        ports: { recipient: listed(recipient), address: listed(address) },
        tierIds,
        ...(countries ? { countries } : {}),
      };
    }
    case 'phone': {
      const { name, tierIds } = requirement;
      return { name, ports: { number: listed(REQUIREMENTS.phone.number) }, tierIds };
    }
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
