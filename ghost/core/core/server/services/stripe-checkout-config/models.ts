import { z } from 'zod';

/**
 * The paid tiers a section applies to, or null for every paid tier.
 *
 * Null rather than a list of today's tiers, so a tier added later is covered without anyone
 * revisiting the setting. A list is the publisher choosing particular tiers, and a tier
 * added later is not one of them.
 */
export const TierIds = z.array(z.string()).nullable();
export type TierIds = z.infer<typeof TierIds>;

/**
 * One toggle and two destinations: a processor returns the recipient and the address
 * under one parameter, but a publisher keeps a name and an address in different fields.
 */
export const ShippingCollection = z.object({
  tierIds: TierIds,
  /**
   * ISO 3166-1 alpha-2, or null for everywhere the processor ships.
   *
   * Null rather than a stored enumeration of every country, because that list moves: the
   * day the processor adds one, a saved "everywhere" would silently be a restriction that
   * excludes it, and nothing would say so.
   */
  allowedCountries: z.array(z.string()).nullable(),
  nameCustomFieldKey: z.string(),
  addressCustomFieldKey: z.string(),
});
export type ShippingCollection = z.infer<typeof ShippingCollection>;

export const PhoneCollection = z.object({
  tierIds: TierIds,
  customFieldKey: z.string(),
});
export type PhoneCollection = z.infer<typeof PhoneCollection>;

/** Stripe keeps a tax number against the customer it invoices, so Ghost never stores one. */
export const TaxNumberCollection = z.object({
  tierIds: TierIds,
});
export type TaxNumberCollection = z.infer<typeof TaxNumberCollection>;

/** What Stripe Checkout collects beyond the payment, as the publisher set it for the site. */
export const StripeCheckoutConfig = z.object({
  shipping: ShippingCollection.nullable(),
  phone: PhoneCollection.nullable(),
  taxNumber: TaxNumberCollection.nullable(),
});
export type StripeCheckoutConfig = z.infer<typeof StripeCheckoutConfig>;

/** What one tier's checkout asks Stripe to collect. */
export const ResolvedCheckout = z.object({
  shipping: z.object({ allowedCountries: z.array(z.string()).nullable() }).nullable(),
  phone: z.boolean(),
  taxNumber: z.boolean(),
});
export type ResolvedCheckout = z.infer<typeof ResolvedCheckout>;

export const nothingCollected = (): ResolvedCheckout => ({
  shipping: null,
  phone: false,
  taxNumber: false,
});

/** The parts of a tier that decide what its checkout collects. */
export interface CheckoutTier {
  id: string;
  type: string;
}
