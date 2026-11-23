// Prototype: a separate "content background" that turns the email's 600px
// column into a card on top of the page colour. Shown only in the Admin
// preview; nothing here is saved or used by the real email renderer yet.

/** 'transparent' (no card, today's flat look) or a hex colour such as '#ffffff'. */
export type ContentBackground = string;

export type ContentCorners = 'square' | 'rounded';

export interface NewsletterCardDesign {
  contentBackground: ContentBackground;
  contentCorners: ContentCorners;
}

export const DEFAULT_CARD_DESIGN: NewsletterCardDesign = {
  contentBackground: 'transparent',
  contentCorners: 'rounded',
};

/**
 * Page colour gap on all four sides of the card on desktop: (700 - 600) / 2 in the 700px preview
 * window, so the card stays 600px wide unless a scrollbar narrows the window. Phones show no gap:
 * the card fills the screen.
 */
export const CARD_PAGE_BAND_PX = 50;

/** Corner radius of the card when corners are 'rounded' (desktop only; phones are always square). */
export const CARD_RADIUS_PX = 12;

/** True when a content colour is picked, i.e. the card look is on. */
export function hasCard(design: NewsletterCardDesign): boolean {
  return design.contentBackground !== 'transparent';
}
