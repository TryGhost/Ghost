import { z } from 'zod';
import type { Knex } from 'knex';
import { DbDate } from '../../lib/db-types/date';

/** Each section is JSON, or null when it is switched off. */
export const DbStripeCheckoutConfig = z.object({
  id: z.string(),
  slug: z.string(),
  shipping: z.string().nullable(),
  phone: z.string().nullable(),
  tax_number: z.string().nullable(),
  design: z.string().nullable(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

type StripeCheckoutConfigRow = z.infer<typeof DbStripeCheckoutConfig>;

export const DbSections = DbStripeCheckoutConfig.pick({
  shipping: true,
  phone: true,
  tax_number: true,
});
export type DbSections = z.infer<typeof DbSections>;

/** The sections a publisher can limit to some tiers, as the join table names them. */
export const CHECKOUT_SECTIONS = ['shipping', 'phone', 'tax_number'] as const;
export type CheckoutSection = (typeof CHECKOUT_SECTIONS)[number];

/** A tier one section is limited to. */
export const DbCheckoutConfigTier = z.object({
  section: z.enum(CHECKOUT_SECTIONS),
  product_id: z.string(),
});
export type DbCheckoutConfigTier = z.infer<typeof DbCheckoutConfigTier>;

export const DbDesign = DbStripeCheckoutConfig.pick({ design: true });
export type DbDesign = z.infer<typeof DbDesign>;

declare module 'knex/types/tables' {
  interface Tables {
    stripe_checkout_config: Knex.CompositeTableType<
      StripeCheckoutConfigRow,
      Omit<z.input<typeof DbStripeCheckoutConfig>, keyof DbSections | keyof DbDesign> &
        Partial<z.input<typeof DbSections> & z.input<typeof DbDesign>>,
      Partial<z.input<typeof DbStripeCheckoutConfig>>
    >;
    stripe_checkout_config_tiers: DbCheckoutConfigTier;
  }
}
