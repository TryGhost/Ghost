import { cn } from '@tryghost/shade/utils';

// The header's controls are 32px — Shade's default control height, between the
// 36px icon-size set (too large for a bar this thin, from review) and the 28px
// small set (a step too far). Text buttons take the default size; icon buttons
// take size="icon" narrowed to 32px with HEADER_ICON_BUTTON, keeping the
// standard 16px glyph. One height across every control in either corner.
//
// Floating (the canvas maximised), each control stands on its own: a surface
// and a shadow per button rather than one card behind the row, the head of
// UX's editor treatment. The filled primary keeps its fill and gains the
// shadow. Docked, they're plain again. The fade runs on the same transition
// as the colours.
export const HEADER_ICON_BUTTON = 'size-8';
export const HEADER_ACTION = 'transition-[color,background-color,box-shadow]';
export const floatingControl = (floating: boolean, filled = false): string =>
  floating ? cn('shadow-sm', !filled && 'bg-surface-elevated') : '';
