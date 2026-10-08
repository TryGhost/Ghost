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

export type StripeCheckoutConfig = {
  design: StripeCheckoutDesignSetting;
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
