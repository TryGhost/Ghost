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
