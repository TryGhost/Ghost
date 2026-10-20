import { z } from 'zod';
import { STRIPE_ALLOWED_COUNTRIES, isStripeAllowedCountry } from '@tryghost/checkout';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { KeySchema } from '@tryghost/metafield-types/identity';
import { SnakeDesign } from './codec';
import {
  type CollectedSection,
  StripeCheckoutBranding,
  StripeCheckoutConfig,
  type CheckoutCollection,
  type PhoneSettings,
  type ShippingSettings,
  type StripeCheckoutDesign,
} from './models';

/**
 * The design in a request.
 *
 * `customize: false` means no design, so Stripe uses the dashboard design.
 * `customize: true` gives the design, and must include every field.
 */
const CustomizedDesign = z.strictObject({ customize: z.literal(true), ...SnakeDesign.shape });
const DesignInput = z
  .discriminatedUnion('customize', [
    z.strictObject({ customize: z.literal(false) }),
    CustomizedDesign,
  ])
  .transform((input): StripeCheckoutDesign | null => (input.customize ? designOf(input) : null));

/** The design a customized request gives, without the switch that says it's customized. */
function designOf({
  customize: _customize,
  ...design
}: z.output<typeof CustomizedDesign>): StripeCheckoutDesign {
  return camelKeys(design);
}

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
const CustomFieldKey = z
  .string({ error: DESTINATION_REQUIRED })
  .min(1, { error: DESTINATION_REQUIRED })
  .pipe(KeySchema);
const Destination = z.strictObject(
  { custom_field_key: CustomFieldKey },
  { error: DESTINATION_REQUIRED },
);

/** Collecting a shipping address, as a request turns it on. */
const ShippingOn = z.strictObject({
  collect: z.literal(true),
  tier_ids: TierIdsInput.optional(),
  allowed_countries: CountriesInput.optional(),
  address: Destination,
  name: Destination,
});

/**
 * Shipping in a request.
 *
 * `collect: false` means checkout doesn't ask for an address. `collect: true` names the custom
 * fields the address and the recipient's name are saved into.
 */
const ShippingInput = z
  .discriminatedUnion('collect', [z.strictObject({ collect: z.literal(false) }), ShippingOn])
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

/** Collecting a phone number, as a request turns it on. */
const PhoneOn = z.strictObject({
  collect: z.literal(true),
  tier_ids: TierIdsInput.optional(),
  custom_field_key: CustomFieldKey,
});

/**
 * The phone number in a request.
 *
 * `collect: false` means checkout doesn't ask for a phone number. `collect: true` names the
 * custom field it is saved into.
 */
const PhoneInput = z
  .discriminatedUnion('collect', [z.strictObject({ collect: z.literal(false) }), PhoneOn])
  .transform((input): PhoneSettings | null =>
    input.collect
      ? { tierIds: input.tier_ids ?? null, customFieldKey: input.custom_field_key }
      : null,
  );

/** Each collected part in an edit request. */
const CollectedInputs = {
  shipping: ShippingInput.optional(),
  phone: PhoneInput.optional(),
} satisfies Record<CollectedSection, z.ZodType>;

/** An edit request. Parts it leaves out are not changed. */
export const CheckoutConfigInput = z.strictObject({
  design: DesignInput.optional(),
  ...CollectedInputs,
});
export type CheckoutConfigInput = z.output<typeof CheckoutConfigInput>;

/**
 * Each collected part a preview can carry unsaved, asked as if it had somewhere to keep the
 * answer. Left out, the checkout asks as the saved settings say.
 */
const CollectedPreviews = {
  shipping: z
    .discriminatedUnion('collect', [
      z.strictObject({ collect: z.literal(false) }),
      ShippingOn.omit({ address: true, name: true }),
    ])
    .transform((input): CheckoutCollection['shipping'] =>
      input.collect
        ? {
            tierIds: input.tier_ids ?? null,
            allowedCountries: input.allowed_countries ?? null,
            collectable: true,
          }
        : null,
    )
    .optional(),
  phone: z
    .discriminatedUnion('collect', [
      z.strictObject({ collect: z.literal(false) }),
      PhoneOn.omit({ custom_field_key: true }),
    ])
    .transform((input): CheckoutCollection['phone'] =>
      input.collect ? { tierIds: input.tier_ids ?? null, collectable: true } : null,
    )
    .optional(),
} satisfies Record<CollectedSection, z.ZodType>;

/**
 * A preview request: the paid tier to open a checkout for, and the design to show it in,
 * which need not be saved.
 */
export const CheckoutPreviewInput = z.strictObject({
  tier_id: z.string().regex(/^[0-9a-f]{24}$/, { error: 'Choose a tier to preview checkout for.' }),
  cadence: z.enum(['month', 'year']).default('month'),
  design: DesignInput,
  ...CollectedPreviews,
});
export type CheckoutPreviewInput = z.output<typeof CheckoutPreviewInput>;

/** Each collected part as the Admin API returns it, left out while its flag is off. */
const CollectedResources = {
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
  phone: z
    .discriminatedUnion('collect', [
      z.object({ collect: z.literal(false) }),
      z.object({
        collect: z.literal(true),
        tier_ids: z.array(z.string()).optional(),
        custom_field_key: z.string(),
      }),
    ])
    .optional(),
} satisfies Record<CollectedSection, z.ZodType>;

const CheckoutConfigResource = z.object({
  design: z.discriminatedUnion('customize', [
    z.object({ customize: z.literal(false) }),
    SnakeDesign.extend({ customize: z.literal(true) }),
  ]),
  ...CollectedResources,
});

/** Shipping as the Admin API returns it, in the same shape a request gives it. */
function shippingResource(shipping: ShippingSettings | null) {
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

/** The phone number as the Admin API returns it, in the same shape a request gives it. */
function phoneResource(phone: PhoneSettings | null) {
  if (!phone) {
    return { collect: false as const };
  }
  return {
    collect: true as const,
    ...(phone.tierIds ? { tier_ids: phone.tierIds } : {}),
    custom_field_key: phone.customFieldKey,
  };
}

/** The collected parts a response carries: the ones the config it is given includes. */
function collectedResources(settings: Partial<Pick<StripeCheckoutConfig, CollectedSection>>): {
  [Section in CollectedSection]: z.input<(typeof CollectedResources)[Section]>;
} {
  return {
    shipping: settings.shipping === undefined ? undefined : shippingResource(settings.shipping),
    phone: settings.phone === undefined ? undefined : phoneResource(settings.phone),
  };
}

/** The collected parts, which a response leaves out while their flag is off. */
const COLLECTED_OPTIONAL: Record<CollectedSection, true> = {
  shipping: true,
  phone: true,
};

const CheckoutConfigResponse = z.object({
  checkout_config: z.tuple([CheckoutConfigResource]),
});

/**
 * The config as the Admin API returns it. Every part says whether it is set, so a client can
 * save back exactly what it read. The collected parts are left out while their flag is off.
 */
export const toCheckoutConfigResponse = StripeCheckoutConfig.partial(COLLECTED_OPTIONAL)
  .transform((settings): z.input<typeof CheckoutConfigResponse> => ({
    checkout_config: [
      {
        design: settings.design
          ? { customize: true as const, ...snakeKeys(settings.design) }
          : { customize: false as const },
        ...collectedResources(settings),
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
