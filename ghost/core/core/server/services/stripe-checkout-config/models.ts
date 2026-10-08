import { z } from 'zod';
import { STRIPE_CHECKOUT_BORDER_STYLES, STRIPE_CHECKOUT_FONTS } from '@tryghost/checkout';

/**
 * A color as a 6-digit hex code. It is lowercased, so the same color is always stored the same
 * way.
 */
export const HexColor = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, { error: 'Enter a color as a 6-digit hex code, like #15171a.' });

/**
 * The checkout design, made of the fields of Stripe's `branding_settings` in camelCase.
 *
 * Every field is required, because a design replaces the one set in the Stripe dashboard
 * rather than being merged with it.
 */
export const StripeCheckoutDesign = z.object({
  buttonColor: HexColor,
  backgroundColor: HexColor,
  borderStyle: z.enum(STRIPE_CHECKOUT_BORDER_STYLES, {
    error: 'Choose rounded, rectangular or pill corners.',
  }),
  fontFamily: z.enum(STRIPE_CHECKOUT_FONTS, { error: 'Choose a font Stripe Checkout offers.' }),
});
export type StripeCheckoutDesign = z.infer<typeof StripeCheckoutDesign>;

/**
 * Collecting a shipping address at checkout, as the publisher set it.
 *
 * Stripe returns the recipient's name beside the address rather than as part of it, and an
 * address custom field has no name part, so the name lands in a field of its own.
 */
export const ShippingSettings = z.object({
  /** Null covers every paid tier, including tiers added later. */
  tierIds: z.array(z.string()).nullable(),
  /** ISO 3166-1 alpha-2 codes, or null for everywhere Stripe ships. */
  allowedCountries: z.array(z.string()).nullable(),
  addressCustomFieldKey: z.string(),
  nameCustomFieldKey: z.string(),
});
export type ShippingSettings = z.infer<typeof ShippingSettings>;

/** The shipping settings as saved, and whether checkouts can ask for an address right now. */
export const ShippingCollection = ShippingSettings.extend({
  /**
   * False while the address field is archived, so checkouts stop asking until it's restored.
   * An archived name field doesn't stop them; the name just isn't kept.
   */
  collectable: z.boolean(),
});
export type ShippingCollection = z.infer<typeof ShippingCollection>;

/** The site-wide Stripe Checkout config. */
export const StripeCheckoutConfig = z.object({
  /** Null means Stripe uses the design set in the Stripe dashboard. */
  design: StripeCheckoutDesign.nullable(),
  /** Null means checkout doesn't ask for a shipping address. */
  shipping: ShippingCollection.nullable(),
});
export type StripeCheckoutConfig = z.infer<typeof StripeCheckoutConfig>;

/**
 * The private flag shipping is behind. The config itself is behind the design flag, which
 * releases first. Staff only see and save shipping while it's on, and checkouts and the
 * completed-checkout webhook only act on shipping while it's on.
 */
export const SHIPPING_FLAG = 'stripeCheckoutCollection';

/** Whether a checkout for this paid tier asks for a shipping address. */
export function collectsShippingFor(
  shipping: ShippingCollection | null,
  tierId: string,
): shipping is ShippingCollection {
  return (
    shipping !== null &&
    shipping.collectable &&
    (shipping.tierIds === null || shipping.tierIds.includes(tierId))
  );
}

/**
 * How Stripe Checkout looks without a design from Ghost, as set in the Stripe dashboard. The
 * business name shows with a design from Ghost too, as Ghost never sends one.
 */
export const StripeCheckoutBranding = z.object({
  displayName: z.string(),
  /** Null when Stripe reports a design Ghost can't show, such as a font it doesn't know. */
  design: StripeCheckoutDesign.nullable(),
});
export type StripeCheckoutBranding = z.infer<typeof StripeCheckoutBranding>;
