// Prototype: a "System mono" font choice for headings and body text. Preview only for now: the
// server still accepts just 'serif' and 'sans_serif', and the real email has no mono styles yet.

export const MONO_FONT_CATEGORY = 'mono';

/** The platform's own monospace font: SF Mono on Apple, Consolas on Windows, Menlo/monospace elsewhere. */
export const SYSTEM_MONO_CLASS =
  '[font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace]';

/** Mono glyphs run wide, so body text is a step smaller than serif (18px) and sans (17px). */
export const MONO_BODY_FONT_SIZE = { desktop: 16, mobile: 15 };

/** Mono body text reads loose at its default spacing, so it's pulled in slightly. */
export const MONO_BODY_TRACKING_CLASS = 'tracking-[-0.02em]';

/** Which fonts are set to System mono. Kept outside the form, as the server can't save mono yet. */
export interface MonoFonts {
  title: boolean;
  body: boolean;
}

export const NO_MONO_FONTS: MonoFonts = { title: false, body: false };

type FontFields = { title_font_category?: string; body_font_category?: string };

/** The newsletter as the preview and font selects show it, with any mono choices applied. */
export function withMonoFonts<T extends FontFields>(newsletter: T, monoFonts: MonoFonts): T {
  return {
    ...newsletter,
    ...(monoFonts.title && { title_font_category: MONO_FONT_CATEGORY }),
    ...(monoFonts.body && { body_font_category: MONO_FONT_CATEGORY }),
  };
}

/**
 * Takes mono choices out of a form update so they never reach the server. Picking mono
 * leaves the saved font as it was; picking any other font clears the mono choice.
 */
export function splitMonoFonts<T extends FontFields>(
  fields: T,
  monoFonts: MonoFonts,
): { fields: T; monoFonts: MonoFonts } {
  const next = { ...fields };
  const nextMono = { ...monoFonts };

  if (next.title_font_category !== undefined) {
    nextMono.title = next.title_font_category === MONO_FONT_CATEGORY;
    if (nextMono.title) {
      delete next.title_font_category;
    }
  }
  if (next.body_font_category !== undefined) {
    nextMono.body = next.body_font_category === MONO_FONT_CATEGORY;
    if (nextMono.body) {
      delete next.body_font_category;
    }
  }

  return { fields: next, monoFonts: nextMono };
}
