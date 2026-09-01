import { z } from 'zod';
import type { Knex } from 'knex';
import { DbBoolean } from '../../lib/db-types/boolean';
import { DbDate } from '../../lib/db-types/date';

export const DbCheckoutQuestion = z.object({
  id: z.string(),
  binding_id: z.string(),
  sort_order: z.number(),
  label: z.string().nullable(),
  optional: DbBoolean,
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

/**
 * Options only. Whether a tier collects something it keeps is the binding; a tax number is
 * the exception, since Stripe keeps it and Ghost never does, so there is nothing to bind.
 */
export const DbCheckoutConfig = z.object({
  id: z.string(),
  product_id: z.string(),
  shipping_allowed_countries: z.string().nullable(),
  tax_number_collect: DbBoolean,
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

type CheckoutConfigRow = z.infer<typeof DbCheckoutConfig>;

export const DbCheckoutOptions = DbCheckoutConfig.omit({
  id: true,
  product_id: true,
  created_at: true,
  updated_at: true,
});
export type DbCheckoutOptions = z.infer<typeof DbCheckoutOptions>;

declare module 'knex/types/tables' {
  interface Tables {
    products_checkout_fields: Knex.CompositeTableType<
      z.infer<typeof DbCheckoutQuestion>,
      Omit<z.input<typeof DbCheckoutQuestion>, 'updated_at'>,
      Partial<z.infer<typeof DbCheckoutQuestion>>
    >;
    products_checkout_config: Knex.CompositeTableType<
      CheckoutConfigRow,
      Omit<z.input<typeof DbCheckoutConfig>, keyof DbCheckoutOptions> &
        Partial<z.input<typeof DbCheckoutOptions>>,
      Partial<z.input<typeof DbCheckoutConfig>>
    >;
  }
}
