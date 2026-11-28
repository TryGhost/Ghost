import { describe, expect, it } from 'vitest';
import { cardCorners, overlayClipPath } from './overlay-geometry';

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

describe('cardCorners', () => {
  const view = { width: 1280, height: 800 };

  it('rounds the corners where the safe area meets the card’s, to within a pixel', () => {
    const card = { top: 44, right: 1272, bottom: 736, left: 0, radius: 12 };
    expect(cardCorners({ top: 44, right: 8, bottom: 65, left: 90 }, view, card)).toEqual({
      topLeft: 0,
      topRight: 12,
      bottomRight: 12,
      bottomLeft: 0,
    });
  });

  it('rounds none without a card', () => {
    expect(cardCorners(safeArea, view, undefined)).toEqual(all(0));
  });
});
