import { z } from 'zod';
import { MAX_CHECKOUT_CUSTOM_FIELDS } from '../stripe/services/checkout/field-ports';
import {
  STRIPE_ALLOWED_COUNTRIES,
  isStripeAllowedCountry,
} from '../stripe/services/checkout/allowed-countries';
import { TierCheckoutConfig } from './models';

// Every country Stripe will take, sent at once, was measured as accepted — so the only
// ceiling is the list itself, and a request naming more than there are countries is naming
// something twice.
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
        allowed_countries: z
          .array(CountryCode, { error: 'Choose at least one country you deliver to.' })
          .min(1, { error: 'Choose at least one country you deliver to.' })
          .max(MAX_ALLOWED_COUNTRIES),
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
  allowed_countries: z.array(z.string()),
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
              allowed_countries: config.shipping.allowedCountries,
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
