/**
 * The corner styles and fonts that Stripe Checkout's `branding_settings` accepts.
 *
 * These come from Stripe's API reference. Unlike the rest of this package, they haven't been
 * checked against the live Stripe API.
 */

export const STRIPE_CHECKOUT_BORDER_STYLES = ['rounded', 'rectangular', 'pill'] as const;
export type StripeCheckoutBorderStyle = (typeof STRIPE_CHECKOUT_BORDER_STYLES)[number];

/** Font names as Stripe spells them. `default` is the system font. */
export const STRIPE_CHECKOUT_FONTS = [
  'default',
  'be_vietnam_pro',
  'bitter',
  'chakra_petch',
  'hahmlet',
  'inconsolata',
  'inter',
  'lato',
  'lora',
  'm_plus_1_code',
  'montserrat',
  'noto_sans',
  'noto_sans_jp',
  'noto_serif',
  'nunito',
  'open_sans',
  'pridi',
  'pt_sans',
  'pt_serif',
  'raleway',
  'roboto',
  'roboto_slab',
  'source_sans_pro',
  'titillium_web',
  'ubuntu_mono',
  'zen_maru_gothic',
] as const;
export type StripeCheckoutFont = (typeof STRIPE_CHECKOUT_FONTS)[number];
