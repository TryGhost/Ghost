import { STRIPE_CHECKOUT_FONTS, type StripeCheckoutFont } from '@tryghost/checkout';

/** How Admin names each font Stripe Checkout offers. */
const FONT_NAMES: Record<StripeCheckoutFont, string> = {
  default: 'System default',
  be_vietnam_pro: 'Be Vietnam Pro',
  bitter: 'Bitter',
  chakra_petch: 'Chakra Petch',
  hahmlet: 'Hahmlet',
  inconsolata: 'Inconsolata',
  inter: 'Inter',
  lato: 'Lato',
  lora: 'Lora',
  m_plus_1_code: 'M PLUS 1 Code',
  montserrat: 'Montserrat',
  noto_sans: 'Noto Sans',
  noto_sans_jp: 'Noto Sans JP',
  noto_serif: 'Noto Serif',
  nunito: 'Nunito',
  open_sans: 'Open Sans',
  pridi: 'Pridi',
  pt_sans: 'PT Sans',
  pt_serif: 'PT Serif',
  raleway: 'Raleway',
  roboto: 'Roboto',
  roboto_slab: 'Roboto Slab',
  source_sans_pro: 'Source Sans Pro',
  titillium_web: 'Titillium Web',
  ubuntu_mono: 'Ubuntu Mono',
  zen_maru_gothic: 'Zen Maru Gothic',
};

const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** The CSS font stack that draws a Stripe font, falling back to the system font. */
export const fontFamilyOf = (font: StripeCheckoutFont): string =>
  font === 'default' ? SYSTEM_FONT_STACK : `"${FONT_NAMES[font]}", ${SYSTEM_FONT_STACK}`;

/** The fonts in the order Admin offers them. */
export const STRIPE_FONT_OPTIONS = STRIPE_CHECKOUT_FONTS.map((font) => ({
  value: font,
  name: FONT_NAMES[font],
}));

/** One stylesheet for every Stripe font, from Bunny Fonts like Ghost's own custom fonts. */
export const STRIPE_FONTS_CSS = `https://fonts.bunny.net/css?family=${STRIPE_CHECKOUT_FONTS.filter(
  (font) => font !== 'default',
)
  .map((font) => `${FONT_NAMES[font].toLowerCase().replace(/ /g, '-')}:400,700`)
  .join('|')}`;
