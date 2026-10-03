import { z } from 'zod';
import {
  MAX_CHECKOUT_CUSTOM_FIELDS,
  STRIPE_ALLOWED_COUNTRIES,
  isStripeAllowedCountry,
} from '@tryghost/checkout';
import { TierCheckoutConfig } from './models';

// Every country Stripe will take, sent at once, was measured as accepted — so the only
// ceiling is the list itself, and a request naming more than there are countries is naming
// something twice. A request that means all of them omits the list instead.
const MAX_ALLOWED_COUNTRIES = STRIPE_ALLOWED_COUNTRIES.length;

const QuestionInput = z.object({
  key: z.string().min(1, { error: 'Every checkout question needs a custom field key.' }),
  label: z.string().trim().min(1).nullish(),
  optional: z.boolean().optional(),
});
export type QuestionInput = z.infer<typeof QuestionInput>;

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

export const CheckoutConfigInput = z.strictObject({
  custom_fields: z
    .array(QuestionInput)
    .max(MAX_CHECKOUT_CUSTOM_FIELDS, {
      error: `A checkout can ask at most ${MAX_CHECKOUT_CUSTOM_FIELDS} questions.`,
    })
    .refine(
      (questions) => new Set(questions.map((question) => question.key)).size === questions.length,
      { error: 'This checkout already asks for that field.' },
    )
    .optional(),

  shipping: z
    .discriminatedUnion('collect', [
      z.strictObject({ collect: z.literal(false) }),
      z.strictObject({
        collect: z.literal(true),
        // Absent means everywhere the processor ships. Empty is refused rather than
        // read as everywhere: a publisher who cleared the list said something, and it
        // was not "deliver worldwide".
        allowed_countries: z
          .array(CountryCode, { error: 'Choose at least one country you deliver to.' })
          .min(1, { error: 'Choose at least one country you deliver to.' })
          .max(MAX_ALLOWED_COUNTRIES)
          .optional(),
        name: Destination,
        address: Destination,
      }),
    ])
    .optional(),

  tax_number: z.strictObject({ collect: z.boolean() }).optional(),

  phone: z
    .discriminatedUnion('collect', [
      z.strictObject({ collect: z.literal(false) }),
      z.strictObject({ collect: z.literal(true), custom_field_key: CustomFieldKey }),
    ])
    .optional(),
});
export type CheckoutConfigInput = z.infer<typeof CheckoutConfigInput>;

const QuestionResource = z.object({
  key: z.string(),
  label: z.string().nullable(),
  optional: z.boolean(),
});

const CollectionResource = z.object({
  collect: z.literal(true),
  custom_field_key: z.string(),
});

const ShippingResource = z.object({
  collect: z.literal(true),
  /** Absent means everywhere, the same way it does on the way in. */
  allowed_countries: z.array(z.string()).optional(),
  name: z.object({ custom_field_key: z.string() }),
  address: z.object({ custom_field_key: z.string() }),
});

const CheckoutConfigResource = z.object({
  tier_id: z.string(),
  custom_fields: z.array(QuestionResource),
  shipping: ShippingResource.optional(),
  tax_number: z.object({ collect: z.literal(true) }).optional(),
  phone: CollectionResource.optional(),
});

const CheckoutConfigResponse = z.object({
  tiers_checkout_config: z.array(CheckoutConfigResource),
});

/** One resource per tier, so a browse and a read differ only in how many come back. */
export const toCheckoutConfigResponse = z
  .array(TierCheckoutConfig)
  .transform((configs): z.input<typeof CheckoutConfigResponse> => ({
    tiers_checkout_config: configs.map((config) => ({
      tier_id: config.tierId,
      custom_fields: config.customFields,
      // A block appears only when the tier collects that thing, so a client reads
      // presence rather than a flag it would have to check.
      ...(config.shipping
        ? {
            shipping: {
              collect: true as const,
              ...(config.shipping.allowedCountries
                ? { allowed_countries: config.shipping.allowedCountries }
                : {}),
              name: { custom_field_key: config.shipping.nameCustomFieldKey },
              address: { custom_field_key: config.shipping.addressCustomFieldKey },
            },
          }
        : {}),
      ...(config.taxNumber ? { tax_number: { collect: true as const } } : {}),
      ...(config.phone
        ? {
            phone: {
              collect: true as const,
              custom_field_key: config.phone.customFieldKey,
            },
          }
        : {}),
    })),
  }))
  .pipe(CheckoutConfigResponse);

/**
 * A tier's checkout settings, as the tier payload carries them.
 *
 * A slice of the publisher's resource above rather than a different idea about it, and
 * named for what it is a slice of. Adding a key later is free and taking one away is
 * not, so this carries only what a client can act on today: what the tier collects, and
 * which of the publisher's fields each collected value is kept in.
 *
 * Left out for now, and addable without a rename when something needs them: the checkout
 * questions, and the tax number, which the processor keeps against the customer it
 * invoices and Ghost never stores, so no client could collect one if it tried.
 *
 * The destination fields are here on purpose. A client that knows where a value lands can
 * tell a member it already holds their address instead of asking for it again, which is
 * the whole difference between carrying a value through and demanding it twice. It hands
 * over no power a member's own client lacks — it can already read and write any of their
 * fields — but it does couple a client to where a publisher put them, so re-pointing a
 * binding is a change that reaches themes.
 */
const TierCheckoutSlice = z.object({
  /**
   * A block appears only when the tier collects that thing, and says so as well, the same
   * way the publisher's resource does. Presence and the flag agree, so a client may read
   * whichever it finds clearer.
   */
  shipping: z
    .object({
      collect: z.literal(true),
      /** Absent means everywhere the processor ships, the same as for a publisher. */
      allowed_countries: z.array(z.string()).optional(),
      name: z.object({ custom_field_key: z.string() }),
      address: z.object({ custom_field_key: z.string() }),
    })
    .optional(),
  phone: z.object({ collect: z.literal(true), custom_field_key: z.string() }).optional(),
});
export type TierCheckoutSlice = z.infer<typeof TierCheckoutSlice>;

/**
 * Keyed by tier, because the payload this joins onto is a list of tiers and a lookup is
 * the only thing it needs. Tiers a publisher has never set up are absent, and a tier
 * collecting only a tax number resolves to a slice with nothing in it.
 */
export function checkoutConfigByTier(
  configs: TierCheckoutConfig[],
): Map<string, TierCheckoutSlice> {
  return new Map(
    configs.map((config) => [
      config.tierId,
      TierCheckoutSlice.parse({
        ...(config.shipping
          ? {
              shipping: {
                collect: true as const,
                ...(config.shipping.allowedCountries
                  ? { allowed_countries: config.shipping.allowedCountries }
                  : {}),
                name: { custom_field_key: config.shipping.nameCustomFieldKey },
                address: { custom_field_key: config.shipping.addressCustomFieldKey },
              },
            }
          : {}),
        ...(config.phone
          ? { phone: { collect: true as const, custom_field_key: config.phone.customFieldKey } }
          : {}),
      }),
    ]),
  );
}
