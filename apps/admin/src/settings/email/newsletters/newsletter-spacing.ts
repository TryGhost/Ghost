// Prototype: newsletter spacing presets, shown only in the Admin preview.
// Nothing here is saved or used by the real email renderer yet.
//
// Every option is a value we have chosen and checked, so any combination of
// content width and line spacing looks right. Tune values here.

export type PreviewDevice = 'desktop' | 'mobile';

export interface ContentWidthValues {
  /** Side gutter on each side of the text, inside the 600px email column. */
  desktop: number;
  /** Total side gutter on each side on phones (today: 10px spacing + 10px padding). */
  mobile: number;
}

export interface LineSpacingValues {
  /** Unitless line height for body text (paragraphs, lists, quotes). */
  lineHeight: number;
  /** Gap below paragraphs, in em. Follows line height so the rhythm holds. */
  paragraphGap: number;
}

export type ContentWidth = 'narrow' | 'default' | 'wide';
export type LineSpacing = 'tight' | 'default' | 'loose';

export const CONTENT_WIDTHS: Record<ContentWidth, ContentWidthValues> = {
  narrow: { desktop: 56, mobile: 26 },
  default: { desktop: 20, mobile: 20 }, // today
  wide: { desktop: 8, mobile: 12 },
};

export const LINE_SPACINGS: Record<LineSpacing, LineSpacingValues> = {
  tight: { lineHeight: 1.5, paragraphGap: 1.41 },
  default: { lineHeight: 1.6, paragraphGap: 1.5 }, // today
  loose: { lineHeight: 1.7, paragraphGap: 1.6 },
};

export interface NewsletterSpacing {
  contentWidth: ContentWidth;
  lineSpacing: LineSpacing;
}

export const DEFAULT_SPACING: NewsletterSpacing = {
  contentWidth: 'default',
  lineSpacing: 'default',
};

export interface ResolvedNewsletterSpacing {
  /** Side gutter in px for the given device. */
  gutter: number;
  /** Unitless body line height. */
  lineHeight: number;
  /** Gap below paragraphs, in em. */
  paragraphGap: number;
}

/** Looks up the px/em values for the chosen options on a device. */
export function resolveNewsletterSpacing(
  spacing: NewsletterSpacing,
  device: PreviewDevice,
): ResolvedNewsletterSpacing {
  const lineSpacing = LINE_SPACINGS[spacing.lineSpacing];

  return {
    gutter: CONTENT_WIDTHS[spacing.contentWidth][device],
    lineHeight: lineSpacing.lineHeight,
    paragraphGap: lineSpacing.paragraphGap,
  };
}
