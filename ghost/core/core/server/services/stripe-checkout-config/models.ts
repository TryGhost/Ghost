import { z } from 'zod';
import { STRIPE_CHECKOUT_BORDER_STYLES, STRIPE_CHECKOUT_FONTS } from '@tryghost/checkout';

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
export const CheckoutCollection = z.object({
  shipping: ShippingCollection.nullable(),
  phone: PhoneCollection.nullable(),
  taxNumber: TaxNumberCollection.nullable(),
});
export type CheckoutCollection = z.infer<typeof CheckoutCollection>;

/** A color as Stripe takes it: a 6-digit hex code, lowercase so one color is one value. */
export const HexColor = z
  .string()
  .regex(/^#[0-9a-f]{6}$/, { error: 'Enter a color as a 6-digit hex code, like #15171a.' });

/**
 * The parts of the Checkout page a publisher can style, in Stripe's own vocabulary. All of
 * them or none: a design replaces the one in the publisher's Stripe dashboard outright,
 * rather than mixing with it.
 */
export const StripeCheckoutDesign = z.object({
  buttonColor: HexColor,
  backgroundColor: HexColor,
  borderStyle: z.enum(STRIPE_CHECKOUT_BORDER_STYLES),
  fontFamily: z.enum(STRIPE_CHECKOUT_FONTS),
});
export type StripeCheckoutDesign = z.infer<typeof StripeCheckoutDesign>;

/** How Stripe Checkout looks and what it collects, as the publisher set it for the site. */
export const StripeCheckoutConfig = CheckoutCollection.extend({
  /** Null keeps the design from the publisher's own Stripe dashboard. */
  design: StripeCheckoutDesign.nullable(),
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
