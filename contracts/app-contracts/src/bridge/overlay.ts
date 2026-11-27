import { z } from 'zod';

import { ARGUMENT_MESSAGES, OVERLAY_TINTS } from './rules.ts';

/**
 * The page's request to show the overlay frame. Only a tint: Admin measures where the overlay
 * shows itself, so an app has no size or position to misreport.
 */
export const OverlayOptionsSchema = z.strictObject(
  { tint: z.enum(OVERLAY_TINTS) },
  ARGUMENT_MESSAGES.overlayOptions,
);

export type OverlayOptions = z.infer<typeof OverlayOptionsSchema>;
