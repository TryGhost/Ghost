import { z } from 'zod';
import { KeySchema } from '@tryghost/metafield-types/identity';
import { STRIPE_ALLOWED_COUNTRIES, isStripeAllowedCountry } from './allowed-countries.ts';

/**
 * What a Stripe Checkout can ask the buyer for, each a part of the site's checkout settings,
 * by the name the Admin API gives it. Each part is asked on every paid tier or only the paid
 * tiers it names. Ghost Core, Admin and their tests each keep what they do with a part in a
 * record keyed by this list, so adding a part here is a type error until each has an entry.
 * Admin shows the parts in this order.
 */
export const COLLECTED_PARTS = ['shipping', 'phone', 'tax_number'] as const;
export type CollectedPart = (typeof COLLECTED_PARTS)[number];

const TierId = z.string().regex(/^[0-9a-f]{24}$/, { error: 'Enter a tier id.' });

/**
 * Absent covers every paid tier, including ones added later. Empty is refused rather than read
 * as every tier, because a publisher who cleared the list didn't mean every tier.
 */
const TierIds = z
  .array(TierId, { error: 'Choose at least one tier.' })
  .min(1, { error: 'Choose at least one tier.' })
  .transform((ids) => [...new Set(ids)]);

/** A country Stripe Checkout can ship to, as its ISO 3166-1 alpha-2 code. */
export const CountryCode = z.string().trim().toUpperCase().refine(isStripeAllowedCountry, {
  error: 'Stripe Checkout can only ship to the countries Stripe supports.',
});

/**
 * Absent means everywhere Stripe ships. Empty is refused rather than read as everywhere,
 * because a publisher who cleared the list didn't mean everywhere.
 */
const Countries = z
  .array(CountryCode, { error: 'Choose at least one country to ship to.' })
  .min(1, { error: 'Choose at least one country to ship to.' })
  .max(STRIPE_ALLOWED_COUNTRIES.length)
  .transform((codes) => [...new Set(codes)]);

const DESTINATION_REQUIRED = 'Choose the custom field this is saved into.';
const CustomFieldKey = z
  .string({ error: DESTINATION_REQUIRED })
  .min(1, { error: DESTINATION_REQUIRED })
  .pipe(KeySchema);
const Destination = z.strictObject(
  { custom_field_key: CustomFieldKey },
  { error: DESTINATION_REQUIRED },
);

const Off = z.strictObject({ collect: z.literal(false) });

/** Each part switched on, with how a checkout asks for it and where the answers are saved. */
const ON = {
  /** The address and the recipient's name, each saved into a custom field of its own. */
  shipping: z.strictObject({
    collect: z.literal(true),
    tier_ids: TierIds.optional(),
    allowed_countries: Countries.optional(),
    address: Destination,
    name: Destination,
  }),
  /** The phone number, saved into a short text custom field. */
  phone: z.strictObject({
    collect: z.literal(true),
    tier_ids: TierIds.optional(),
    custom_field_key: CustomFieldKey,
  }),
  /** A business buyer's tax ID, which Stripe keeps on the customer, so no field is named. */
  tax_number: z.strictObject({
    collect: z.literal(true),
    tier_ids: TierIds.optional(),
  }),
} satisfies Record<CollectedPart, z.ZodObject>;

/**
 * Each part as the Admin API saves it and returns it, so a client can save back what it read.
 * `collect: false` switches a part off, and switching it on again starts afresh.
 */
export const CHECKOUT_PART_SETTINGS = {
  shipping: z.discriminatedUnion('collect', [Off, ON.shipping]),
  phone: z.discriminatedUnion('collect', [Off, ON.phone]),
  tax_number: z.discriminatedUnion('collect', [Off, ON.tax_number]),
} satisfies Record<CollectedPart, z.ZodType>;

/** Each part as a client sends it to the Admin API, or reads it back. */
export type CheckoutPartSettings = {
  [Part in CollectedPart]: z.input<(typeof CHECKOUT_PART_SETTINGS)[Part]>;
};
export type CheckoutPartSetting<Part extends CollectedPart> = CheckoutPartSettings[Part];
