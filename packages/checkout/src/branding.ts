/**
 * What Stripe Checkout's `branding_settings` accepts for the parts of the page a publisher
 * can style. Taken from Stripe's API reference rather than probed, and sent by the checkout
 * customisation proof of concept against a sandbox at Ghost's pinned version.
 */

export const STRIPE_CHECKOUT_BORDER_STYLES = ['rounded', 'rectangular', 'pill'] as const;
export type StripeCheckoutBorderStyle = (typeof STRIPE_CHECKOUT_BORDER_STYLES)[number];

/** Stripe's own spelling of each family. `default` is the system font. */
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
