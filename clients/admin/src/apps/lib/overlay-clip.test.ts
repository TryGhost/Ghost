import { describe, expect, it } from 'vitest';
import { overlayClipPath } from './overlay-clip';

const all = (r: number) => ({ topLeft: r, topRight: r, bottomRight: r, bottomLeft: r });

const safeArea = { top: 44, right: 8, bottom: 65, left: 90 };

describe('overlayClipPath', () => {
  it('shows the safe area, with the card’s rounded corners', () => {
    expect(overlayClipPath(safeArea, all(12))).toBe(
      'inset(44px 8px 65px 90px round 12px 12px 12px 12px)',
    );
    expect(overlayClipPath(safeArea, all(0))).toBe('inset(44px 8px 65px 90px)');
  });

  it('rounds only the corners that are the card’s', () => {
    const corners = { topLeft: 0, topRight: 12, bottomRight: 0, bottomLeft: 0 };
    expect(overlayClipPath(safeArea, corners)).toBe(
      'inset(44px 8px 65px 90px round 0px 12px 0px 0px)',
    );
  });
});
