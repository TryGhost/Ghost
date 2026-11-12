import { describe, expect, it } from 'vitest';
import { OVERLAY_MARGIN, overlayStrip } from './overlay-strip';

const DESKTOP = { width: 1440, height: 900 };
const TOP_BAR = 44;

describe('overlayStrip', () => {
  it('centres a dialog’s strip on the window, from below the top bar to the bottom', () => {
    const strip = overlayStrip({ tint: 'dialog', width: 512 }, DESKTOP, TOP_BAR);

    expect(strip).toEqual({ top: TOP_BAR, right: 440, bottom: 0, left: 440 });
    expect(DESKTOP.width - strip.left - strip.right).toBe(512 + 2 * OVERLAY_MARGIN);
  });

  it('caps a dialog’s width, however wide the page says it is', () => {
    const strip = overlayStrip({ tint: 'dialog', width: 5000 }, DESKTOP, TOP_BAR);

    expect(DESKTOP.width - strip.left - strip.right).toBe(1024 + 2 * OVERLAY_MARGIN);
  });

  it('gives a dialog the whole width of a window narrower than it', () => {
    const strip = overlayStrip({ tint: 'dialog', width: 512 }, { width: 375, height: 812 }, 0);

    expect(strip).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('starts a dialog’s strip higher on a window short enough that Shade’s dialogs sit higher', () => {
    // 8vmin of a 400px window is 32px, less the margin for the dialog's shadow.
    const strip = overlayStrip({ tint: 'dialog', width: 512 }, { width: 1440, height: 400 }, 44);

    expect(strip.top).toBe(8);
  });

  it('docks a sheet’s strip at the window’s right edge, the full height of the window', () => {
    const strip = overlayStrip({ tint: 'sheet', width: 384 }, DESKTOP, TOP_BAR);

    expect(strip).toEqual({ top: 0, right: 0, bottom: 0, left: 1440 - 384 - OVERLAY_MARGIN });
  });

  it('caps a sheet at three quarters of the window', () => {
    const strip = overlayStrip({ tint: 'sheet', width: 5000 }, DESKTOP, TOP_BAR);

    expect(strip.left).toBe(1440 - 1080 - OVERLAY_MARGIN);
  });
});
