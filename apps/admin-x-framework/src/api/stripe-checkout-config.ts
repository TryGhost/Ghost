import type { StripeCheckoutBorderStyle, StripeCheckoutFont } from '@tryghost/checkout';
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
 * `collect: false` means checkout doesn't ask for a shipping address. `collect: true` names
 * the custom fields the address and the recipient's name are saved into.
 */
export type StripeCheckoutShippingSetting =
  | { collect: false }
  | {
      collect: true;
      /** Left out, it covers every paid tier, including tiers added later. */
      tier_ids?: string[];
      /** Left out, Stripe ships everywhere it can. */
      allowed_countries?: string[];
      address: { custom_field_key: string };
      name: { custom_field_key: string };
    };

export type StripeCheckoutConfig = {
  design: StripeCheckoutDesignSetting;
  /**
   * Missing while shipping can't be collected: its private flag is off, or Ghost is older
   * than the setting.
   */
  shipping?: StripeCheckoutShippingSetting;
};

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
    emberUpdateType: 'skip',
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

/** A preview of the design on a real Stripe Checkout page for one paid tier. */
/** Shipping as a preview asks for it. Where the answers are saved doesn't matter there. */
export type StripeCheckoutPreviewShipping =
  | { collect: false }
  | { collect: true; tier_ids?: string[]; allowed_countries?: string[] };

export type StripeCheckoutPreviewRequest = {
  tier_id: string;
  cadence: 'month' | 'year';
  design: StripeCheckoutDesignSetting;
  /** Left out, the preview asks for an address as the saved settings say. */
  shipping?: StripeCheckoutPreviewShipping;
};

export interface StripeCheckoutPreviewResponseType {
  checkout_preview: Array<{ url: string }>;
}

/** Creates the checkout page to open; the design in it need not be saved. */
export const useCreateStripeCheckoutPreview = createMutation<
  StripeCheckoutPreviewResponseType,
  StripeCheckoutPreviewRequest
>({
  method: 'POST',
  path: () => '/stripe/checkout/preview/',
  body: (preview) => ({ checkout_preview: [preview] }),
});
