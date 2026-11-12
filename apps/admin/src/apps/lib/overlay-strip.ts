import type { OverlayOptions } from '@tryghost/app-contracts/bridge';

/** Room beside a dialog or sheet for its shadow, and for a popover that hangs past its side. */
export const OVERLAY_MARGIN = 24;

/** The widest dialog an app can show, wider than any of Admin's own. */
export const OVERLAY_DIALOG_MAX_WIDTH = 1024;

/** The widest a sheet can be, as a share of the window: Shade's own sheets are as wide. */
export const OVERLAY_SHEET_MAX_SHARE = 0.75;

export interface OverlayStrip {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Where the overlay frame shows, as its distance from each edge of the window: the part of the
 * window the dialog or sheet on top can fill, placed by Admin as it places its own. A dialog's
 * strip is centred on the window and runs down from below Admin's top bar; a sheet's is against
 * the window's right edge and runs its full height, over the top bar, as Admin's own sheets do.
 * Each is as wide as the page reports the dialog or sheet to be, with a margin, up to a cap.
 *
 * `top` is where Admin's top bar ends, which is where the app's page starts. A dialog goes
 * higher only where the window is so short that Shade places dialogs higher than that.
 */
export function overlayStrip(
  { tint, width }: OverlayOptions,
  view: { width: number; height: number },
  top: number,
): OverlayStrip {
  if (tint === 'sheet') {
    const strip = Math.min(
      width + OVERLAY_MARGIN,
      Math.round(view.width * OVERLAY_SHEET_MAX_SHARE) + OVERLAY_MARGIN,
    );
    return { top: 0, right: 0, bottom: 0, left: Math.max(0, view.width - strip) };
  }
  const strip = Math.min(width, OVERLAY_DIALOG_MAX_WIDTH) + 2 * OVERLAY_MARGIN;
  const side = Math.max(0, Math.floor((view.width - strip) / 2));
  // Shade's dialogs sit 8vmin from the top of the window.
  const dialogTop = Math.round(0.08 * Math.min(view.width, view.height)) - OVERLAY_MARGIN;
  return { top: Math.max(0, Math.min(top, dialogTop)), right: side, bottom: 0, left: side };
}
