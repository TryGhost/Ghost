import { z } from 'zod';

import { ARGUMENT_MESSAGES, OVERLAY_TINTS } from './rules.ts';

/**
 * The page's request to show the overlay frame: the tint, and the width of the dialog or sheet
 * on top. The tint also places it, as Admin places its own: a dialog centred on the window, a
 * sheet against its right edge. Admin shows the overlay frame only there, as wide as the width,
 * which Admin caps, so the width is all an app reports and all it changes.
 */
export const OverlayOptionsSchema = z.strictObject(
  {
    tint: z.enum(OVERLAY_TINTS),
    width: z.number().int().positive(),
  },
  ARGUMENT_MESSAGES.overlayOptions,
);

/** How the page asks Admin to show the overlay. */
export type OverlayOptions = z.infer<typeof OverlayOptionsSchema>;
