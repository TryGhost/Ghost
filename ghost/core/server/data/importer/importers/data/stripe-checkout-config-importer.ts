import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import { CHECKOUT_PORT, COLLECTED_PARTS, type CheckoutPartSettings } from '@tryghost/checkout';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';
import stripeCheckoutConfig from '../../../../services/stripe-checkout-config';
import { COLLECTION_FLAG } from '../../../../services/stripe-checkout-config/models';

const labs = require('../../../../../shared/labs');

// Imports a site's Stripe Checkout settings: the design checkout pages are shown in, and what
// checkout asks buyers for on which paid tiers, with the custom field each answer is saved into.
//
// An export holds them as the rows they are stored in: the design in the config's row, the tiers
// each collected part asks on as the tier requirement of the same name, and the field each of
// its answers is saved into as the binding of the port it's collected under. They are read back
// into what a save through the Admin API states, and saved through the checkout config service,
// so an imported part is checked as any save is: its tiers must be paid tiers the site has, and
// its fields custom fields of the right type, which the custom fields step has added by then.

const ExportData = z.object({
  stripe_checkout_config: z.array(z.unknown()).catch([]),
  tier_requirements: z.array(z.unknown()).catch([]),
  tier_requirement_tiers: z.array(z.unknown()).catch([]),
  members_metafield_bindings: z.array(z.unknown()).catch([]),
  products: z.array(z.unknown()).catch([]),
});
type ExportData = z.output<typeof ExportData>;

const ConfigRow = z.object({ design: z.string().nullable() });
const RequirementRow = z.object({
  requirement: z.string(),
  tier_scope: z.enum(['all_paid', 'selected_paid']),
  countries: z.string().nullable(),
});
const RequirementTierRow = z.object({ requirement: z.string(), product_id: z.string() });
const BindingRow = z.object({
  port: z.string(),
  metafield_namespace: z.string(),
  metafield_key: z.string(),
});
const ProductRow = z.object({ id: z.string(), name: z.string(), slug: z.string() });

const JsonText = z.string().transform((text, ctx): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Not JSON.' });
    return z.NEVER;
  }
});
const Countries = JsonText.pipe(z.array(z.string()));

/** The rows of `rows` that `schema` reads, as it reads them. */
function rowsOf<T extends object>(schema: z.ZodType<T>, rows: unknown[]): T[] {
  return rows.flatMap((row) => schema.safeParse(row).data ?? []);
}

/** A collected part as the file's site set it, before its tiers are found on this site. */
interface ExportedPart {
  countries: string[] | null;
  /** The key of the custom field the file's site saved the answers of `port` into. */
  fieldOf(port: string): string | undefined;
}

/**
 * Each collected part, as a save through the Admin API states it, from the part as the file's
 * site set it with its tiers found on this site. Null when the file doesn't say where each of its
 * answers is saved, which a site that collects the part always does.
 */
const PART_INPUTS: {
  [Part in keyof CheckoutPartSettings]: (
    part: ExportedPart,
    tierIds: string[] | null,
  ) => CheckoutPartSettings[Part] | null;
} = {
  shipping(part, tierIds) {
    const address = part.fieldOf(CHECKOUT_PORT.shippingAddress);
    const name = part.fieldOf(CHECKOUT_PORT.shippingName);
    if (!address || !name) {
      return null;
    }
    return {
      collect: true,
      ...(tierIds ? { tier_ids: tierIds } : {}),
      ...(part.countries ? { allowed_countries: part.countries } : {}),
      address: { custom_field_key: address },
      name: { custom_field_key: name },
    };
  },
  phone(part, tierIds) {
    const field = part.fieldOf(CHECKOUT_PORT.phone);
    if (!field) {
      return null;
    }
    return { collect: true, ...(tierIds ? { tier_ids: tierIds } : {}), custom_field_key: field };
  },
};

interface ImportProblem {
  message: string;
  help: string;
  context: string;
}

/** A tier the products step imported, by the id it has now and the id it had in the file. */
interface ImportedTier {
  id: string;
  originalId: string;
}

/**
 * The step of a data import that saves the file's Stripe Checkout settings. It has the shape the
 * data importer drives every step through, and runs after the tiers and custom fields steps, as
 * the settings name both.
 */
export class StripeCheckoutConfigImporter {
  readonly dataKeyToImport = 'stripe_checkout_config';
  readonly options = { requiredImportedData: ['products'], requiredExistingData: [] };
  readonly requiredImportedData: { products?: ImportedTier[] } = {};
  readonly requiredExistingData = {};
  readonly problems: ImportProblem[] = [];
  readonly errors: unknown[] = [];
  readonly importedData: unknown[] = [];
  readonly importedDataToReturn: unknown[] = [];

  private readonly data: ExportData;

  constructor(allDataFromFile: unknown) {
    this.data = ExportData.safeParse(allDataFromFile).data ?? ExportData.parse({});
  }

  async fetchExisting(): Promise<void> {}

  async beforeImport(): Promise<void> {}

  async replaceIdentifiers(): Promise<void> {}

  /**
   * Saves the design and each collected part the file's site had set, each on its own and in the
   * import's transaction, so a part that can't be saved leaves the others saved. What the file's
   * site had set replaces what this site has, as the settings import does with settings, and what
   * it hadn't set, such as a part it didn't collect, leaves this site's as it is.
   *
   * A part is saved for the tiers of the file that are on this site, whether the import added the
   * tier or the site had it already. A part none of whose tiers are, or that names a field this
   * site doesn't have, such as one the import had to leave out, is left out, and the problems say
   * why.
   */
  async doImport({ transacting }: { transacting: Knex.Transaction }): Promise<void> {
    const inputs: Array<[string, unknown]> = [];
    const [config] = rowsOf(ConfigRow, this.data.stripe_checkout_config);
    const design = config?.design ? JsonText.safeParse(config.design).data : undefined;
    if (design && typeof design === 'object') {
      inputs.push(['design', { customize: true, ...design }]);
    }
    if (labs.isSet(COLLECTION_FLAG)) {
      inputs.push(...(await this.collectedParts(transacting)));
    }
    if (inputs.length === 0) {
      return;
    }

    const { config: service } = stripeCheckoutConfig.service;
    for (const [part, input] of inputs) {
      try {
        await service.edit({ actor: null }, { [part]: input }, transacting);
        this.importedData.push({ [part]: input });
        this.importedDataToReturn.push({ [part]: input });
      } catch (err) {
        // A refused save has saved none of the part, so the import goes on without it.
        if (!(err instanceof errors.ValidationError)) {
          throw err;
        }
        this.skipped(part, input, `Checkout setting was not imported: ${err.message}`);
      }
    }
  }

  /** Each collected part the file's site set, as a save states it, with its tiers on this site. */
  private async collectedParts(transacting: Knex.Transaction): Promise<Array<[string, unknown]>> {
    const requirements = rowsOf(RequirementRow, this.data.tier_requirements);
    if (requirements.length === 0) {
      return [];
    }
    const requirementTiers = rowsOf(RequirementTierRow, this.data.tier_requirement_tiers);
    const bindings = rowsOf(BindingRow, this.data.members_metafield_bindings).filter(
      ({ metafield_namespace: namespace }) => namespace === CUSTOM_NAMESPACE,
    );
    const fieldOf = (port: string) =>
      bindings.find((binding) => binding.port === port)?.metafield_key;
    const tierOnSite = await this.tiersOnSite(transacting);

    const parts: Array<[string, unknown]> = [];
    for (const name of COLLECTED_PARTS) {
      const requirement = requirements.find((row) => row.requirement === name);
      if (!requirement) {
        continue;
      }
      // Null for every paid tier, otherwise the ids the file gives its tiers. A part limited to
      // tiers none of which are left asks on none, which reads as off.
      const fileTierIds =
        requirement.tier_scope === 'all_paid'
          ? null
          : requirementTiers.filter((row) => row.requirement === name).map((row) => row.product_id);
      if (fileTierIds?.length === 0) {
        continue;
      }
      const countries = requirement.countries ? Countries.safeParse(requirement.countries) : null;
      if (countries && !countries.success) {
        // Asking anywhere instead would ask buyers the file's site never asked.
        this.skipped(
          name,
          requirement,
          'Checkout setting was not imported because its countries could not be read.',
        );
        continue;
      }
      const part: ExportedPart = { countries: countries?.data ?? null, fieldOf };
      const tierIds = fileTierIds?.flatMap((id) => tierOnSite.get(id) ?? []) ?? null;
      const input = PART_INPUTS[name](part, tierIds);
      if (!input) {
        continue;
      }
      if (tierIds?.length === 0) {
        this.skipped(
          name,
          input,
          'Checkout setting was not imported because none of its tiers were imported.',
        );
        continue;
      }
      parts.push([name, input]);
    }
    return parts;
  }

  /**
   * The id each tier of the file has on this site, by the id it has in the file: the tier the
   * products step added for it, or otherwise the tier the site has under its name and slug, which
   * is how the products step finds a tier the site had already.
   */
  private async tiersOnSite(transacting: Knex.Transaction): Promise<Map<string, string>> {
    const onSite = new Map<string, string>();
    for (const { id, originalId } of this.requiredImportedData.products ?? []) {
      onSite.set(originalId, id);
    }
    const fileTiers = rowsOf(ProductRow, this.data.products).filter(({ id }) => !onSite.has(id));
    if (fileTiers.length > 0) {
      const siteTiers = z.array(ProductRow).parse(
        await transacting('products')
          .whereIn(
            'slug',
            fileTiers.map(({ slug }) => slug),
          )
          .select('id', 'name', 'slug'),
      );
      for (const { id, name, slug } of fileTiers) {
        const tier = siteTiers.find(
          (candidate) => candidate.slug === slug && candidate.name === name,
        );
        if (tier) {
          onSite.set(id, tier.id);
        }
      }
    }
    return onSite;
  }

  private skipped(part: string, input: unknown, message: string): void {
    this.problems.push({
      message,
      help: 'Checkout setting',
      context: JSON.stringify({ [part]: input }),
    });
  }
}
