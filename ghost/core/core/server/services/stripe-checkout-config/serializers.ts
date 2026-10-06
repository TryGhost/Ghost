import ObjectId from 'bson-objectid';
import { z } from 'zod';
import {
  STRIPE_ALLOWED_COUNTRIES,
  STRIPE_CHECKOUT_BORDER_STYLES,
  STRIPE_CHECKOUT_FONTS,
  isStripeAllowedCountry,
} from '@tryghost/checkout';
import { HexColor, ResolvedCheckout, StripeCheckoutConfig, type TierIds } from './models';

// Every country Stripe will take, sent at once, was measured as accepted — so the only
// ceiling is the list itself, and a request naming more than there are countries is naming
// something twice. A request that means all of them omits the list instead.
const MAX_ALLOWED_COUNTRIES = STRIPE_ALLOWED_COUNTRIES.length;

// Not checked against a list of countries: membership of that list is contested, and Ghost
// is not its arbiter.
const CountryCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, { error: 'Enter a 2-letter country code, like US.' })
  .toUpperCase()
  .refine(isStripeAllowedCountry, {
    error: 'Stripe will not ship to that country, so a checkout cannot offer it.',
  });

/**
 * Absent means every paid tier, including ones added later, the same way absent countries
 * mean everywhere. Empty is refused rather than read as every tier: a publisher who cleared
 * the list said something, and it was not "every tier".
 */
const TierIdsInput = z
  .array(
    z.string().refine((value) => ObjectId.isValid(value), { error: 'Enter a tier id.' }),
    { error: 'Choose at least one tier.' },
  )
  .min(1, { error: 'Choose at least one tier.' })
  .transform((ids) => [...new Set(ids)])
  .optional();

/**
 * Where a collected value lands is the request's to state. Ghost keeps no convention about
 * it, so a block that collects names its destination and one that does not carries nothing
 * to name.
 */
const DESTINATION_REQUIRED = 'Say which custom field this is collected into.';
const CustomFieldKey = z
  .string({ error: DESTINATION_REQUIRED })
  .min(1, { error: DESTINATION_REQUIRED });
const Destination = z.strictObject(
  { custom_field_key: CustomFieldKey },
  { error: DESTINATION_REQUIRED },
);

const Off = z.strictObject({ collect: z.literal(false) });

// Read in any case, kept in one.
const HexColorInput = z.string().trim().toLowerCase().pipe(HexColor);

export const CheckoutConfigInput = z.strictObject({
  shipping: z
    .discriminatedUnion('collect', [
      Off,
      z.strictObject({
        collect: z.literal(true),
        tier_ids: TierIdsInput,
        // Absent means everywhere the processor ships. Empty is refused rather than
        // read as everywhere: a publisher who cleared the list said something, and it
        // was not "deliver worldwide".
        allowed_countries: z
          .array(CountryCode, { error: 'Choose at least one country you deliver to.' })
          .min(1, { error: 'Choose at least one country you deliver to.' })
          .max(MAX_ALLOWED_COUNTRIES)
          .transform((codes) => [...new Set(codes)])
          .optional(),
        name: Destination,
        address: Destination,
      }),
    ])
    .optional(),

  phone: z
    .discriminatedUnion('collect', [
      Off,
      z.strictObject({
        collect: z.literal(true),
        tier_ids: TierIdsInput,
        custom_field_key: CustomFieldKey,
      }),
    ])
    .optional(),

  tax_number: z
    .discriminatedUnion('collect', [
      Off,
      z.strictObject({ collect: z.literal(true), tier_ids: TierIdsInput }),
    ])
    .optional(),

  // Every part or none, because a design replaces the one in the publisher's Stripe
  // dashboard outright. Customizing off goes back to that one.
  design: z
    .discriminatedUnion('customize', [
      z.strictObject({ customize: z.literal(false) }),
      z.strictObject({
        customize: z.literal(true),
        button_color: HexColorInput,
        background_color: HexColorInput,
        border_style: z.enum(STRIPE_CHECKOUT_BORDER_STYLES, {
          error: 'Choose rounded, rectangular or pill corners.',
        }),
        font_family: z.enum(STRIPE_CHECKOUT_FONTS, {
          error: 'Choose a font Stripe Checkout offers.',
        }),
      }),
    ])
    .optional(),
});
export type CheckoutConfigInput = z.infer<typeof CheckoutConfigInput>;

/** Absent means every paid tier, the same way it does on the way in. */
const TierIdsResource = z.array(z.string()).optional();

const CheckoutConfigResource = z.object({
  shipping: z
    .object({
      collect: z.literal(true),
      tier_ids: TierIdsResource,
      /** Absent means everywhere, the same way it does on the way in. */
      allowed_countries: z.array(z.string()).optional(),
      name: z.object({ custom_field_key: z.string() }),
      address: z.object({ custom_field_key: z.string() }),
    })
    .optional(),
  phone: z
    .object({
      collect: z.literal(true),
      tier_ids: TierIdsResource,
      custom_field_key: z.string(),
    })
    .optional(),
  tax_number: z.object({ collect: z.literal(true), tier_ids: TierIdsResource }).optional(),
  design: z
    .object({
      customize: z.literal(true),
      button_color: z.string(),
      background_color: z.string(),
      border_style: z.string(),
      font_family: z.string(),
    })
    .optional(),
});

const CheckoutConfigResponse = z.object({
  checkout_config: z.tuple([CheckoutConfigResource]),
});

const tierScope = (tierIds: TierIds) => (tierIds ? { tier_ids: tierIds } : {});

/**
 * The site's one configuration, in the envelope every Admin API resource uses. A block
 * appears only when that thing is collected, or the design customized, so a client reads
 * presence rather than a flag it would have to check.
 */
export const toCheckoutConfigResponse = StripeCheckoutConfig.transform(
  (config): z.input<typeof CheckoutConfigResponse> => ({
    checkout_config: [
      {
        ...(config.shipping
          ? {
              shipping: {
                collect: true as const,
                ...tierScope(config.shipping.tierIds),
                ...(config.shipping.allowedCountries
                  ? { allowed_countries: config.shipping.allowedCountries }
                  : {}),
                name: { custom_field_key: config.shipping.nameCustomFieldKey },
                address: { custom_field_key: config.shipping.addressCustomFieldKey },
              },
            }
          : {}),
        ...(config.phone
          ? {
              phone: {
                collect: true as const,
                ...tierScope(config.phone.tierIds),
                custom_field_key: config.phone.customFieldKey,
              },
            }
          : {}),
        ...(config.taxNumber
          ? { tax_number: { collect: true as const, ...tierScope(config.taxNumber.tierIds) } }
          : {}),
        ...(config.design
          ? {
              design: {
                customize: true as const,
                button_color: config.design.buttonColor,
                background_color: config.design.backgroundColor,
                border_style: config.design.borderStyle,
                font_family: config.design.fontFamily,
              },
            }
          : {}),
      },
    ],
  }),
).pipe(CheckoutConfigResponse);

/**
 * What a tier asks a member for, as the tier payload carries it.
 *
 * What the tier's checkout asks Stripe for, minus everything about where a value lands. A
 * member supplies a delivery address rather than a value for a named field, and which field
 * holds it is the publisher's business; naming it here would invite a client to write there
 * directly. The tax number goes too, because the processor keeps one against the customer it
 * invoices and Ghost never stores it.
 *
 * Not named for the collection, deliberately: a collection in this domain is a collected
 * thing together with the field it lands in, and that second half is exactly the part
 * this drops.
 */
const TierRequirements = z.object({
  /**
   * A block appears only when the tier asks for that thing, and says so as well, the same
   * way the publisher's resource does. Presence and the flag agree, so a client may read
   * whichever it finds clearer.
   *
   * Neither says whether a thing may be skipped, because nothing here may be: everything
   * a tier requires is required. Collection a member could decline is the change that
   * would need a field of its own rather than a new reading of these two.
   */
  shipping: z
    .object({
      collect: z.literal(true),
      /** Absent means everywhere the processor ships, the same as for a publisher. */
      allowed_countries: z.array(z.string()).optional(),
    })
    .optional(),
  phone: z.object({ collect: z.literal(true) }).optional(),
});
export type TierRequirements = z.infer<typeof TierRequirements>;

/**
 * Keyed by tier, because the payload this joins onto is a list of tiers and a lookup is
 * the only thing it needs. A tier that collects only a tax number resolves to nothing asked.
 */
export function requirementsByTier(
  resolved: Map<string, ResolvedCheckout>,
): Map<string, TierRequirements> {
  return new Map(
    [...resolved].map(([tierId, checkout]) => [
      tierId,
      TierRequirements.parse({
        ...(checkout.shipping
          ? {
              shipping: {
                collect: true as const,
                ...(checkout.shipping.allowedCountries
                  ? { allowed_countries: checkout.shipping.allowedCountries }
                  : {}),
              },
            }
          : {}),
        ...(checkout.phone ? { phone: { collect: true as const } } : {}),
      }),
    ]),
  );
}
