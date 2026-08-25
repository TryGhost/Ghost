import { z } from 'zod';
import { MAX_CHECKOUT_CUSTOM_FIELDS } from '../stripe/services/checkout/field-ports';
import { CheckoutConfigResult } from './models';

/**
 * Each collectable thing is its own named block rather than a row in a list, because the
 * options differ per kind and a list would carry keys meaning nothing on most entries.
 */

/** Each code costs three characters once comma-joined, against a 2000-character column. */
const MAX_ALLOWED_COUNTRIES = 600;

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
  .toUpperCase();

/** A block is replaced only if the request names it. */
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
    .strictObject({
      collect: z.boolean(),
      allowed_countries: z.array(CountryCode).max(MAX_ALLOWED_COUNTRIES).optional(),
      name: z.strictObject({ custom_field_key: z.string().min(1) }).optional(),
      address: z.strictObject({ custom_field_key: z.string().min(1) }).optional(),
    })
    .superRefine((block, ctx) => {
      // A processor will not render an address form without a country list, and Ghost
      // cannot guess where a publisher delivers.
      if (block.collect && !block.allowed_countries?.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['allowed_countries'],
          message: 'Choose at least one country you deliver to.',
        });
      }
    })
    .optional(),

  /** A toggle, not a destination: Stripe keeps a tax number and Ghost never stores one. */
  tax_number: z.strictObject({ collect: z.boolean() }).optional(),

  phone: z
    .strictObject({
      collect: z.boolean(),
      custom_field_key: z.string().min(1).optional(),
    })
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
  custom_field_key: z.string().nullable(),
});

const ShippingResource = z.object({
  collect: z.literal(true),
  allowed_countries: z.array(z.string()),
  // Always present so a form can bind to them; a null key is a thing not kept anywhere.
  name: z.object({ custom_field_key: z.string().nullable() }),
  address: z.object({ custom_field_key: z.string().nullable() }),
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
export const toCheckoutConfigResponse = CheckoutConfigResult.transform(
  (result): z.input<typeof CheckoutConfigResponse> => ({
    tiers_checkout_config: result.tiers.map((config) => ({
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
  }),
).pipe(CheckoutConfigResponse);
