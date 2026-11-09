import errors from '@tryghost/errors';
import { z } from 'zod';
import { CHECKOUT_PART_SETTINGS, type CollectedPart } from '@tryghost/checkout';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { SnakeDesign } from './codec';
import {
  COLLECTED_NOUNS,
  COLLECTED_SECTIONS,
  SECTION_NAMES,
  type CollectedSection,
  StripeCheckoutBranding,
  StripeCheckoutConfig,
  type PhoneSettings,
  type ShippingSettings,
  type StripeCheckoutDesign,
  type TaxNumberSettings,
} from './models';

/**
 * Refuses a request, to save or to preview, that names a collected part while their flag is
 * off, as the collected parts are still in development.
 */
export function refuseCollectionWhileOff(input: unknown, collecting: boolean): void {
  if (collecting || typeof input !== 'object' || input === null) {
    return;
  }
  const section = COLLECTED_SECTIONS.find((candidate) => SECTION_NAMES[candidate] in input);
  if (section) {
    const noun = COLLECTED_NOUNS[section];
    throw new errors.ValidationError({
      message: `${noun[0].toUpperCase()}${noun.slice(1)} collection is not available yet.`,
      property: SECTION_NAMES[section],
    });
  }
}

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

/** Each collected part in an edit request, as its settings in the model, or null for off. */
const CollectedInputs = {
  shipping: CHECKOUT_PART_SETTINGS.shipping
    .transform((input): ShippingSettings | null =>
      input.collect
        ? {
            tierIds: input.tier_ids ?? null,
            allowedCountries: input.allowed_countries ?? null,
            addressCustomFieldKey: input.address.custom_field_key,
            nameCustomFieldKey: input.name.custom_field_key,
          }
        : null,
    )
    .optional(),
  phone: CHECKOUT_PART_SETTINGS.phone
    .transform((input): PhoneSettings | null =>
      input.collect
        ? { tierIds: input.tier_ids ?? null, customFieldKey: input.custom_field_key }
        : null,
    )
    .optional(),
  tax_number: CHECKOUT_PART_SETTINGS.tax_number
    .transform((input): TaxNumberSettings | null =>
      input.collect ? { tierIds: input.tier_ids ?? null } : null,
    )
    .optional(),
} satisfies Record<CollectedPart, z.ZodType>;

/** An edit request, keyed by each part's name in the model. Parts it leaves out are not changed. */
export const CheckoutConfigInput = z
  .strictObject({
    design: DesignInput.optional(),
    ...CollectedInputs,
  })
  .transform((input) => camelKeys(input));
export type CheckoutConfigInput = z.output<typeof CheckoutConfigInput>;

/**
 * A preview request: the paid tier to open a checkout for, the design to show it in, and the
 * collected parts to ask for, each as an edit request gives it, though none need be saved.
 * Parts it leaves out are asked as saved.
 */
export const CheckoutPreviewInput = z
  .strictObject({
    tier_id: z
      .string()
      .regex(/^[0-9a-f]{24}$/, { error: 'Choose a tier to preview checkout for.' }),
    cadence: z.enum(['month', 'year']).default('month'),
    design: DesignInput,
    ...CollectedInputs,
  })
  .transform((input) => camelKeys(input));
export type CheckoutPreviewInput = z.output<typeof CheckoutPreviewInput>;

/**
 * Each collected part as the Admin API returns it, in the shape a request saves, so a client can
 * save back what it read. Left out while its flag is off.
 */
const CollectedResources = {
  shipping: CHECKOUT_PART_SETTINGS.shipping.optional(),
  phone: CHECKOUT_PART_SETTINGS.phone.optional(),
  tax_number: CHECKOUT_PART_SETTINGS.tax_number.optional(),
} satisfies Record<CollectedPart, z.ZodType>;

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

/** The tax ID as the Admin API returns it, in the same shape a request gives it. */
function taxNumberResource(taxNumber: TaxNumberSettings | null) {
  if (!taxNumber) {
    return { collect: false as const };
  }
  return {
    collect: true as const,
    ...(taxNumber.tierIds ? { tier_ids: taxNumber.tierIds } : {}),
  };
}

/** The collected parts a response carries: the ones the config it is given includes. */
function collectedResources(settings: Partial<Pick<StripeCheckoutConfig, CollectedSection>>): {
  [Part in CollectedPart]: z.input<(typeof CollectedResources)[Part]>;
} {
  return {
    shipping: settings.shipping === undefined ? undefined : shippingResource(settings.shipping),
    phone: settings.phone === undefined ? undefined : phoneResource(settings.phone),
    tax_number:
      settings.taxNumber === undefined ? undefined : taxNumberResource(settings.taxNumber),
  };
}

/** The collected parts, which a response leaves out while their flag is off. */
const COLLECTED_OPTIONAL: Record<CollectedSection, true> = {
  shipping: true,
  phone: true,
  taxNumber: true,
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
