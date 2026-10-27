import type {
  CheckoutPartSetting,
  CheckoutPartSettings,
  CollectedPart,
  StripeCheckoutBorderStyle,
  StripeCheckoutFont,
} from '@tryghost/checkout';
import { createMutation, createQuery } from '../utils/api/hooks';

/** A Stripe Checkout design, in the field names Stripe's `branding_settings` uses. */
export type StripeCheckoutDesign = {
  button_color: string;
  background_color: string;
  border_style: StripeCheckoutBorderStyle;
  font_family: StripeCheckoutFont;
};

/** `customize: false` means Stripe uses the design set in the Stripe dashboard. */
export type StripeCheckoutDesignSetting =
  | { customize: false }
  | ({ customize: true } & StripeCheckoutDesign);

/**
 * A part checkout can ask the buyer for, as the Admin API saves and returns it. `collect: false`
 * switches it off. Left out, `tier_ids` covers every paid tier, including tiers added later.
 */
export type StripeCheckoutPartSetting<Part extends CollectedPart> = CheckoutPartSetting<Part>;
export type StripeCheckoutShippingSetting = StripeCheckoutPartSetting<'shipping'>;
export type StripeCheckoutPhoneSetting = StripeCheckoutPartSetting<'phone'>;
export type StripeCheckoutTaxNumberSetting = StripeCheckoutPartSetting<'tax_number'>;

/**
 * The checkout config. A collected part is missing while it can't be collected: its private flag
 * is off, or Ghost is older than the part.
 */
export type StripeCheckoutConfig = {
  design: StripeCheckoutDesignSetting;
} & Partial<CheckoutPartSettings>;

export interface StripeCheckoutConfigResponseType {
  checkout_config: StripeCheckoutConfig[];
}

const dataType = 'StripeCheckoutConfigResponseType';

export const useReadStripeCheckoutConfig = createQuery<StripeCheckoutConfigResponseType>({
  dataType,
  path: '/stripe/checkout/config/',
});

/** Saves the parts of the config it is given. Parts left out are not changed. */
export const useEditStripeCheckoutConfig = createMutation<
  StripeCheckoutConfigResponseType,
  Partial<StripeCheckoutConfig>
>({
  method: 'PUT',
  path: () => '/stripe/checkout/config/',
  body: (config) => ({ checkout_config: [config] }),
  updateQueries: {
    dataType,
    update: (newData) => newData,
  },
});

/**
 * How Stripe Checkout looks without a design from Ghost, as set in the Stripe dashboard. The
 * business name shows with a design from Ghost too.
 */
export type StripeCheckoutBranding = {
  display_name: string;
  /** Null when Stripe reports a design Ghost can't show, such as a font it doesn't know. */
  design: StripeCheckoutDesign | null;
};

export interface StripeCheckoutBrandingResponseType {
  checkout_branding: StripeCheckoutBranding[];
}

export const useReadStripeCheckoutBranding = createQuery<StripeCheckoutBrandingResponseType>({
  dataType: 'StripeCheckoutBrandingResponseType',
  path: '/stripe/checkout/branding/',
});

/**
 * A preview of the settings being edited on a real Stripe Checkout page for one paid tier, given
 * as saving gives them, though they need not be saved. Collected parts left out are asked as
 * saved.
 */
export type StripeCheckoutPreviewRequest = {
  tier_id: string;
  cadence: 'month' | 'year';
} & StripeCheckoutConfig;

export interface StripeCheckoutPreviewResponseType {
  checkout_preview: Array<{ url: string }>;
}

/** Creates the checkout page to open; the settings in it need not be saved. */
export const useCreateStripeCheckoutPreview = createMutation<
  StripeCheckoutPreviewResponseType,
  StripeCheckoutPreviewRequest
>({
  method: 'POST',
  path: () => '/stripe/checkout/preview/',
  body: (preview) => ({ checkout_preview: [preview] }),
});
