import { describe, expect, it } from 'vitest';

import { fitCanvas, panCanvas, screenToWorld, zoomCanvas } from './canvas-camera';

describe('canvas camera', () => {
  it('fits every frame, including unequal page heights and negative world positions', () => {
    const frames = [
      { x: -120, y: 80, width: 1440, height: 900 },
      { x: 1400, y: -40, width: 390, height: 12000 },
    ];
    const camera = fitCanvas(frames, { width: 1200, height: 800 }, 48);
    for (const frame of frames) {
      expect(camera.x + frame.x * camera.scale).toBeGreaterThanOrEqual(48);
      expect(camera.y + frame.y * camera.scale).toBeGreaterThanOrEqual(48);
      expect(camera.x + (frame.x + frame.width) * camera.scale).toBeLessThanOrEqual(1152);
      expect(camera.y + (frame.y + frame.height) * camera.scale).toBeLessThanOrEqual(752);
    }
  });

  it('keeps the world point under the cursor stationary when zooming', () => {
    const camera = { x: -350, y: 150, scale: 0.25 };
    const cursor = { x: 123, y: 456 };
    const world = screenToWorld(camera, cursor);
    const zoomed = zoomCanvas(camera, cursor, 2);
    expect(screenToWorld(zoomed, cursor)).toEqual(world);
    expect(zoomed.scale).toBe(0.5);
  });

  it('pans in screen pixels regardless of zoom without changing the world geometry', () => {
    const camera = { x: 10, y: 20, scale: 0.1 };
    expect(panCanvas(camera, { x: 100, y: -50 })).toEqual({ x: 110, y: -30, scale: 0.1 });
    expect(camera).toEqual({ x: 10, y: 20, scale: 0.1 });
  });

  it('keeps unusually long pages entirely visible and allows zooming back into them', () => {
    const camera = fitCanvas([{ x: 0, y: 0, width: 390, height: 100000 }], {
      width: 1000,
      height: 700,
    });
    expect(camera.scale * 100000).toBeLessThanOrEqual(604);
    expect(zoomCanvas(camera, { x: 500, y: 350 }, 2).scale).toBeCloseTo(camera.scale * 2);
  });

  it('has finite camera values for an empty board or a temporarily hidden host', () => {
    expect(fitCanvas([], { width: 0, height: 0 })).toEqual({ x: 0, y: 0, scale: 1 });
    expect(fitCanvas([{ x: 0, y: 0, width: 390, height: 844 }], { width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
      scale: 1,
    });
  });
});
