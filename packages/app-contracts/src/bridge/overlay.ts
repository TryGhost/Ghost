import { z } from 'zod';

import { ARGUMENT_MESSAGES, OVERLAY_TINTS } from './rules.ts';

/**
 * The page's request to show the overlay frame. It names a tint and nothing else: Admin
 * decides where the overlay frame is and how big, so there is no size or position for an app
 * to misreport.
 */
export const OverlayOptionsSchema = z.strictObject(
  { tint: z.enum(OVERLAY_TINTS) },
  ARGUMENT_MESSAGES.overlayOptions,
);

/** How the page asks Admin to show the overlay. */
export type OverlayOptions = z.infer<typeof OverlayOptionsSchema>;
