// Prototype: newsletter spacing presets, shown only in the Admin preview.
// Nothing here is saved or used by the real email renderer yet.
//
// Every stop is a value we have chosen and checked, so any combination of
// margin stop and line spacing stop looks right. Tune values here.

export type PreviewDevice = 'desktop' | 'mobile';

export interface MarginStop {
  /** Side gutter on each side of the text, inside the 600px email column. */
  desktop: number;
  /** Total side gutter on each side on phones (today: 10px spacing + 10px padding). */
  mobile: number;
}

export interface LineSpacingStop {
  /** Unitless line height for body text (paragraphs, lists, quotes). */
  lineHeight: number;
  /** Gap below paragraphs, in em. Follows line height so the rhythm holds. */
  paragraphGap: number;
}

export const MARGIN_STOPS: MarginStop[] = [
  { desktop: 20, mobile: 20 }, // today
  { desktop: 32, mobile: 22 },
  { desktop: 44, mobile: 24 },
  { desktop: 56, mobile: 26 },
  { desktop: 72, mobile: 28 },
];

export const LINE_SPACING_STOPS: LineSpacingStop[] = [
  { lineHeight: 1.5, paragraphGap: 1.41 },
  { lineHeight: 1.6, paragraphGap: 1.5 }, // today
  { lineHeight: 1.7, paragraphGap: 1.6 },
];

export const DEFAULT_MARGIN_STOP = 0;
export const DEFAULT_LINE_SPACING_STOP = 1;

export interface NewsletterSpacing {
  /** Index into MARGIN_STOPS. */
  marginStop: number;
  /** Index into LINE_SPACING_STOPS. */
  lineSpacingStop: number;
}

export const DEFAULT_SPACING: NewsletterSpacing = {
  marginStop: DEFAULT_MARGIN_STOP,
  lineSpacingStop: DEFAULT_LINE_SPACING_STOP,
};

export interface ResolvedNewsletterSpacing {
  /** Side gutter in px for the given device. */
  gutter: number;
  /** Unitless body line height. */
  lineHeight: number;
  /** Gap below paragraphs, in em. */
  paragraphGap: number;
}

function clampStop(stop: number, count: number, fallback: number): number {
  return Number.isInteger(stop) && stop >= 0 && stop < count ? stop : fallback;
}

/** Looks up the px/em values for a pair of stops on a device. Out-of-range stops fall back to the defaults. */
export function resolveNewsletterSpacing(
  spacing: NewsletterSpacing,
  device: PreviewDevice,
): ResolvedNewsletterSpacing {
  const margin =
    MARGIN_STOPS[clampStop(spacing.marginStop, MARGIN_STOPS.length, DEFAULT_MARGIN_STOP)];
  const lineSpacing =
    LINE_SPACING_STOPS[
      clampStop(spacing.lineSpacingStop, LINE_SPACING_STOPS.length, DEFAULT_LINE_SPACING_STOP)
    ];

  return {
    gutter: margin[device],
    lineHeight: lineSpacing.lineHeight,
    paragraphGap: lineSpacing.paragraphGap,
  };
}
