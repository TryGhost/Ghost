import errors from '@tryghost/errors';
import { omit } from 'lodash';
import { z } from 'zod';
import { STRIPE_ALLOWED_COUNTRIES, isStripeAllowedCountry } from '@tryghost/checkout';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { SnakeDesign } from './codec';
import {
  StripeCheckoutBranding,
  StripeCheckoutConfig,
  type ShippingCollection,
  type ShippingSettings,
  type StripeCheckoutDesign,
} from './models';

/**
 * The design in a request.
 *
 * `customize: false` means no design, so Stripe uses the dashboard design.
 * `customize: true` gives the design, and must include every field.
 */
const DesignInput = z
  .discriminatedUnion('customize', [
    z.strictObject({ customize: z.literal(false) }),
    z.strictObject({ customize: z.literal(true), ...SnakeDesign.shape }),
  ])
  .transform((input): StripeCheckoutDesign | null =>
    input.customize ? camelKeys(omit(input, 'customize')) : null,
  );

const TierId = z.string().regex(/^[0-9a-f]{24}$/, { error: 'Enter a tier id.' });

/**
 * Absent covers every paid tier, including ones added later. Empty is refused rather than read
 * as every tier, because a publisher who cleared the list didn't mean every tier.
 */
const TierIdsInput = z
  .array(TierId, { error: 'Choose at least one tier.' })
  .min(1, { error: 'Choose at least one tier.' })
  .transform((ids) => [...new Set(ids)]);

const CountryCode = z.string().trim().toUpperCase().refine(isStripeAllowedCountry, {
  error: 'Stripe Checkout can only ship to the countries Stripe supports.',
});

/**
 * Absent means everywhere Stripe ships. Empty is refused rather than read as everywhere,
 * because a publisher who cleared the list didn't mean everywhere.
 */
const CountriesInput = z
  .array(CountryCode, { error: 'Choose at least one country to ship to.' })
  .min(1, { error: 'Choose at least one country to ship to.' })
  .max(STRIPE_ALLOWED_COUNTRIES.length)
  .transform((codes) => [...new Set(codes)]);

const DESTINATION_REQUIRED = 'Choose the custom field this is saved into.';
const Destination = z.strictObject(
  {
    custom_field_key: z
      .string({ error: DESTINATION_REQUIRED })
      .min(1, { error: DESTINATION_REQUIRED }),
  },
  { error: DESTINATION_REQUIRED },
);

/**
 * Shipping in a request.
 *
 * `collect: false` means checkout doesn't ask for an address. `collect: true` names the custom
 * fields the address and the recipient's name are saved into.
 */
const ShippingInput = z
  .discriminatedUnion('collect', [
    z.strictObject({ collect: z.literal(false) }),
    z.strictObject({
      collect: z.literal(true),
      tier_ids: TierIdsInput.optional(),
      allowed_countries: CountriesInput.optional(),
      address: Destination,
      name: Destination,
    }),
  ])
  .transform((input): ShippingSettings | null =>
    input.collect
      ? {
          tierIds: input.tier_ids ?? null,
          allowedCountries: input.allowed_countries ?? null,
          addressCustomFieldKey: input.address.custom_field_key,
          nameCustomFieldKey: input.name.custom_field_key,
        }
      : null,
  );

/** An edit request. Parts it leaves out are not changed. */
export const CheckoutConfigInput = z.strictObject({
  design: DesignInput.optional(),
  shipping: ShippingInput.optional(),
});
export type CheckoutConfigInput = z.output<typeof CheckoutConfigInput>;

/**
 * A preview request: the paid tier to open a checkout for, and the design to show it in,
 * which need not be saved.
 */
export const CheckoutPreviewInput = z.strictObject({
  tier_id: z.string().regex(/^[0-9a-f]{24}$/, { error: 'Choose a tier to preview checkout for.' }),
  cadence: z.enum(['month', 'year']).default('month'),
  design: DesignInput,
});
export type CheckoutPreviewInput = z.output<typeof CheckoutPreviewInput>;

/** Parses a request body, turning the first problem into a validation error on its field. */
export function parseRequest<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  resource: string,
): z.output<Schema> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  const issue = parsed.error.issues[0];
  throw new errors.ValidationError({
    message: issue.message,
    property: issue.path.join('.') || resource,
  });
}

const CheckoutConfigResource = z.object({
  design: z.discriminatedUnion('customize', [
    z.object({ customize: z.literal(false) }),
    SnakeDesign.extend({ customize: z.literal(true) }),
  ]),
  shipping: z
    .discriminatedUnion('collect', [
      z.object({ collect: z.literal(false) }),
      z.object({
        collect: z.literal(true),
        tier_ids: z.array(z.string()).optional(),
        allowed_countries: z.array(z.string()).optional(),
        address: z.object({ custom_field_key: z.string() }),
        name: z.object({ custom_field_key: z.string() }),
      }),
    ])
    .optional(),
});

/** Shipping as the Admin API returns it, in the same shape a request gives it. */
function shippingResource(shipping: ShippingCollection | null) {
  if (!shipping) {
    return { collect: false as const };
  }
  return {
    collect: true as const,
    ...(shipping.tierIds ? { tier_ids: shipping.tierIds } : {}),
    ...(shipping.allowedCountries ? { allowed_countries: shipping.allowedCountries } : {}),
    address: { custom_field_key: shipping.addressCustomFieldKey },
    name: { custom_field_key: shipping.nameCustomFieldKey },
  };
}

const CheckoutConfigResponse = z.object({
  checkout_config: z.tuple([CheckoutConfigResource]),
});

/**
 * The config as the Admin API returns it. Every part says whether it is set, so a client can
 * save back exactly what it read. Shipping is left out while its flag is off.
 */
export const toCheckoutConfigResponse = StripeCheckoutConfig.partial({ shipping: true })
  .transform((settings): z.input<typeof CheckoutConfigResponse> => ({
    checkout_config: [
      {
        design: settings.design
          ? { customize: true as const, ...snakeKeys(settings.design) }
          : { customize: false as const },
        ...(settings.shipping !== undefined
          ? { shipping: shippingResource(settings.shipping) }
          : {}),
      },
    ],
  }))
  .pipe(CheckoutConfigResponse);

const CheckoutPreviewResponse = z.object({
  checkout_preview: z.tuple([z.object({ url: z.url() })]),
});

/** A preview as the Admin API returns it: the Stripe Checkout page to open. */
export const toCheckoutPreviewResponse = z
  .object({ url: z.string() })
  .transform(({ url }): z.input<typeof CheckoutPreviewResponse> => ({
    checkout_preview: [{ url }],
  }))
  .pipe(CheckoutPreviewResponse);

const CheckoutBrandingResponse = z.object({
  checkout_branding: z.tuple([
    z.object({
      display_name: z.string(),
      design: SnakeDesign.nullable(),
    }),
  ]),
});

/** The Stripe dashboard's checkout branding as the Admin API returns it. */
export const toCheckoutBrandingResponse = StripeCheckoutBranding.transform(
  (branding): z.input<typeof CheckoutBrandingResponse> => ({
    checkout_branding: [
      {
        display_name: branding.displayName,
        design: branding.design ? snakeKeys(branding.design) : null,
      },
    ],
  }),
).pipe(CheckoutBrandingResponse);
