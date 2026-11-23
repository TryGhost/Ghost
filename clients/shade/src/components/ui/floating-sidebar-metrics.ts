/**
 * Capsule morph: a gentle overshoot so it grows a touch past size and settles
 * back (about 2.8% past its target, ~7px as the circle opens to the panel's
 * width). Its width, radius and shadow take it; its height eases in without
 * overshoot, as the body unfurls.
 */
export const FLOATING_SIDEBAR_BUMP = 'cubic-bezier(0.34, 1.29, 0.5, 1)';
/** Body unfurl, capsule height and content slide: a decelerating ease without overshoot. */
export const FLOATING_SIDEBAR_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
/** How long the capsule morphs and the content slides, in milliseconds. */
export const FLOATING_SIDEBAR_DURATION = 520;
/** The plain morph (`morphStyle="ease"`): an ease-out without overshoot, for the capsule and the content slide alike. */
export const FLOATING_SIDEBAR_EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
/** How long the plain morph takes, in milliseconds. */
export const FLOATING_SIDEBAR_EASE_DURATION = 450;

/** How the capsule morphs between states; see `morphStyle`. */
type FloatingSidebarMorphStyle = 'bump' | 'ease';

interface FloatingSidebarTiming {
  /** How long the morph takes, in milliseconds. */
  duration: number;
  /**
   * What moves with the capsule: its height, the icon, and content sliding in
   * step with a pin change. A decelerating ease without overshoot.
   */
  easing: string;
  /** The capsule's own shape (width, radius, shadow): the bump overshoots. */
  shapeEasing: string;
}

/**
 * The timing of a morph in `morphStyle`, for content that animates in step
 * with the capsule as it pins and unpins.
 */
export function getFloatingSidebarTiming(
  morphStyle: FloatingSidebarMorphStyle = 'bump',
): FloatingSidebarTiming {
  return morphStyle === 'ease'
    ? {
        duration: FLOATING_SIDEBAR_EASE_DURATION,
        easing: FLOATING_SIDEBAR_EASE,
        shapeEasing: FLOATING_SIDEBAR_EASE,
      }
    : {
        duration: FLOATING_SIDEBAR_DURATION,
        easing: FLOATING_SIDEBAR_SPRING,
        shapeEasing: FLOATING_SIDEBAR_BUMP,
      };
}

/**
 * The capsule's distance from the viewport's top and left edges, and the gap
 * between the pinned panel and the content, in pixels.
 */
export const FLOATING_SIDEBAR_INSET = 16;
/** The closed circle's outer diameter, its 1px border included, in pixels. */
export const FLOATING_SIDEBAR_CLOSED_SIZE = 50;
/**
 * The room the closed circle takes from the content's top-left corner (inset +
 * diameter + inset), for content to keep clear of it while unpinned.
 */
export const FLOATING_SIDEBAR_CLOSED_FOOTPRINT =
  FLOATING_SIDEBAR_INSET + FLOATING_SIDEBAR_CLOSED_SIZE + FLOATING_SIDEBAR_INSET;
/** The open and pinned panel's default width (`openWidth`), in pixels. */
export const FLOATING_SIDEBAR_OPEN_WIDTH = 290;

/**
 * The width of the gap that offsets the content beside the sidebar: the pinned
 * panel and the inset either side of it, or 0 unless pinned.
 */
export function getFloatingSidebarGapWidth(
  pinned: boolean,
  openWidth: number = FLOATING_SIDEBAR_OPEN_WIDTH,
): number {
  return pinned ? FLOATING_SIDEBAR_INSET + openWidth + FLOATING_SIDEBAR_INSET : 0;
}

export type { FloatingSidebarMorphStyle, FloatingSidebarTiming };
