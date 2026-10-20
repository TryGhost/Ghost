import { z } from 'zod';
import { STRIPE_CHECKOUT_BORDER_STYLES, STRIPE_CHECKOUT_FONTS } from '@tryghost/checkout';
import { KeySchema } from '@tryghost/metafield-types/identity';

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

/** What every collected part is set with: the paid tiers whose checkouts ask for it. */
const CollectedPart = z.object({
  /** Null covers every paid tier, including tiers added later. */
  tierIds: z.array(z.string()).nullable(),
});

/**
 * Collecting a shipping address at checkout, as the publisher set it.
 *
 * Stripe returns the recipient's name beside the address rather than as part of it, and an
 * address custom field has no name part, so the name lands in a field of its own.
 */
export const ShippingSettings = CollectedPart.extend({
  /** ISO 3166-1 alpha-2 codes, or null for everywhere Stripe ships. */
  allowedCountries: z.array(z.string()).nullable(),
  addressCustomFieldKey: KeySchema,
  nameCustomFieldKey: KeySchema,
});
export type ShippingSettings = z.infer<typeof ShippingSettings>;

/** Collecting a phone number at checkout, as the publisher set it. */
export const PhoneSettings = CollectedPart.extend({
  customFieldKey: KeySchema,
});
export type PhoneSettings = z.infer<typeof PhoneSettings>;

/** Each collected part of the config as saved. */
const COLLECTED_PARTS = {
  /** Null means checkout doesn't ask for a shipping address. */
  shipping: ShippingSettings.nullable(),
  /** Null means checkout doesn't ask for a phone number. */
  phone: PhoneSettings.nullable(),
} satisfies Record<CollectedSection, z.ZodType>;

/** The site-wide Stripe Checkout config. */
export const StripeCheckoutConfig = z.object({
  /** Null means Stripe uses the design set in the Stripe dashboard. */
  design: StripeCheckoutDesign.nullable(),
  ...COLLECTED_PARTS,
});
export type StripeCheckoutConfig = z.infer<typeof StripeCheckoutConfig>;

/**
 * The parts of the config that ask the buyer for something, each on every paid tier or only
 * the ones it names.
 */
export const COLLECTED_SECTIONS = ['shipping', 'phone'] as const;
export type CollectedSection = (typeof COLLECTED_SECTIONS)[number];

/** What each collected part asks the buyer for, as messages about it name it. */
export const COLLECTED_NOUNS = {
  shipping: 'shipping address',
  phone: 'phone number',
} as const satisfies Record<CollectedSection, string>;

/**
 * The private flag the collected parts are behind. The config itself is behind the design
 * flag, which releases first. Staff only see and save the collected parts while it's on, and
 * checkouts and the completed-checkout webhook only act on them while it's on.
 */
export const COLLECTION_FLAG = 'stripeCheckoutCollection';

/** What a checkout needs to know about every collected part to ask for it. */
export interface AskedPart extends z.infer<typeof CollectedPart> {
  /**
   * Whether checkouts can ask for it right now. A saved part can't while a field it can't do
   * without is archived or no longer holds what it collects, as the answer would have nowhere
   * to go, so checkouts stop asking until the field is restored.
   */
  collectable: boolean;
}

/**
 * What a checkout needs to know about each collected part to ask for it: which tiers ask and
 * how, without where the answers land.
 */
export interface AskedParts {
  shipping: AskedPart & Pick<ShippingSettings, 'allowedCountries'>;
  phone: AskedPart;
}

/**
 * The collected parts as a checkout asks for them, each null while it asks for nothing. A
 * preview gives unsaved parts in place of the saved ones.
 */
export type CheckoutCollection = { [Section in CollectedSection]: AskedParts[Section] | null };

/** The config as checkouts use it: the design, and what each collected part asks for. */
export type CheckoutSessionConfig = Pick<StripeCheckoutConfig, 'design'> & CheckoutCollection;

/** How a checkout asks for each collected part once it asks for it at all. */
export interface Asking {
  shipping: Pick<ShippingSettings, 'allowedCountries'>;
  /** Asked the same way on every checkout. */
  phone: Record<string, never>;
}

/** How a checkout asks for each collected part, or null for each it doesn't ask for. */
export type CheckoutAsks = { readonly [Section in CollectedSection]: Asking[Section] | null };

/** How a Stripe Checkout page looks and what it asks the buyer for. */
export interface CheckoutDefinition {
  /** Null sends none, so Stripe shows the design set in the Stripe dashboard. */
  readonly design: StripeCheckoutDesign | null;
  readonly asks: CheckoutAsks;
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
