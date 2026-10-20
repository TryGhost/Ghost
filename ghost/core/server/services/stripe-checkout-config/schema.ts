import { z } from 'zod';
import type { Knex } from 'knex';
import { DbDate } from '../../lib/db-types/date';
import { COLLECTED_SECTIONS, SECTION_NAMES, type CollectedSection } from './models';

export const CONFIG_TABLE = 'stripe_checkout_config';

/** The slug of the config's single row. Saving inserts the row with this slug, or updates it. */
export const CONFIG_SLUG = 'default';

/** A `stripe_checkout_config` row. */
export const DbStripeCheckoutConfig = z.object({
  id: z.string(),
  slug: z.string(),
  design: z.string().nullable(),
  shipping: z.string().nullable(),
  phone: z.string().nullable(),
  tax_number: z.string().nullable(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

type StripeCheckoutConfigRow = z.infer<typeof DbStripeCheckoutConfig>;

/** The columns holding the parts of the config, each JSON or null while that part is off. */
export const DbConfigParts = DbStripeCheckoutConfig.pick({
  design: true,
  shipping: true,
  phone: true,
  tax_number: true,
});
export type DbConfigParts = z.infer<typeof DbConfigParts>;

export const CONFIG_TIERS_TABLE = 'stripe_checkout_config_tiers';

/** Each collected part by the name it is stored under. */
const SECTIONS_BY_NAME = {
  shipping: 'shipping',
  phone: 'phone',
  tax_number: 'taxNumber',
} as const satisfies {
  [Section in CollectedSection as (typeof SECTION_NAMES)[Section]]: Section;
};

/** A collected part as the tiers table names it, read as its name in code. */
export const DbSection = z.codec(z.enum(SECTION_NAMES), z.enum(COLLECTED_SECTIONS), {
  decode: (name) => SECTIONS_BY_NAME[name],
  encode: (section) => SECTION_NAMES[section],
});

/** A `stripe_checkout_config_tiers` row: one of the tiers a collected part is limited to. */
export const DbConfigTier = z.object({
  section: DbSection,
  product_id: z.string(),
});
type ConfigTierRow = z.input<typeof DbConfigTier>;

declare module 'knex/types/tables' {
  interface Tables {
    stripe_checkout_config: Knex.CompositeTableType<
      StripeCheckoutConfigRow,
      Omit<z.input<typeof DbStripeCheckoutConfig>, keyof DbConfigParts> &
        Partial<z.input<typeof DbConfigParts>>,
      Partial<z.input<typeof DbStripeCheckoutConfig>>
    >;
    stripe_checkout_config_tiers: Knex.CompositeTableType<ConfigTierRow>;
  }
}
