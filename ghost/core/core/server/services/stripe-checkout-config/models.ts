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

/** The site-wide Stripe Checkout config. */
export const StripeCheckoutConfig = z.object({
  /** Null means Stripe uses the design set in the Stripe dashboard. */
  design: StripeCheckoutDesign.nullable(),
});
export type StripeCheckoutConfig = z.infer<typeof StripeCheckoutConfig>;

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
