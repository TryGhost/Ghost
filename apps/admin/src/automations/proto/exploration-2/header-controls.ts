// The header's controls are 32px — Shade's default control height, between the
// 36px icon-size set (too large for a bar this thin, from review) and the 28px
// small set (a step too far). Text buttons take the default size; icon buttons
// take size="icon" narrowed to 32px with HEADER_ICON_BUTTON, keeping the
// standard 16px glyph. One height across every control in either corner.
//
// Floating over the canvas, each control stands on its own: the ghost ones get
// a surface so they read as buttons against the dots, the filled primary is
// already one. No shadow — that would be a customisation of Shade's button,
// and the surface is enough. The colour transition is kept for hover.
export const HEADER_ICON_BUTTON = 'size-8';
export const HEADER_ACTION = 'transition-colors';
export const floatingControl = (floating: boolean, filled = false): string =>
  floating && !filled ? 'bg-surface-elevated' : '';
