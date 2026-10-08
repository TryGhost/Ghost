import { z } from 'zod';
import type { Knex } from 'knex';
import { DbDate } from '../../lib/db-types/date';

export const CONFIG_TABLE = 'stripe_checkout_config';

/** The slug of the config's single row. Saving inserts the row with this slug, or updates it. */
export const CONFIG_SLUG = 'default';

/** A `stripe_checkout_config` row. */
export const DbStripeCheckoutConfig = z.object({
  id: z.string(),
  slug: z.string(),
  design: z.string().nullable(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

type StripeCheckoutConfigRow = z.infer<typeof DbStripeCheckoutConfig>;

export const DbDesign = DbStripeCheckoutConfig.pick({ design: true });
export type DbDesign = z.infer<typeof DbDesign>;

declare module 'knex/types/tables' {
  interface Tables {
    stripe_checkout_config: Knex.CompositeTableType<
      StripeCheckoutConfigRow,
      Omit<z.input<typeof DbStripeCheckoutConfig>, keyof DbDesign> &
        Partial<z.input<typeof DbDesign>>,
      Partial<z.input<typeof DbStripeCheckoutConfig>>
    >;
  }
}
