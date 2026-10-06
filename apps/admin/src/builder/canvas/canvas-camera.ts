export type CanvasPoint = { x: number; y: number };
export type CanvasSize = { width: number; height: number };
export type CanvasRect = CanvasPoint & CanvasSize;
export type CanvasCamera = CanvasPoint & { scale: number };

export function screenToWorld(camera: CanvasCamera, point: CanvasPoint): CanvasPoint {
  return { x: (point.x - camera.x) / camera.scale, y: (point.y - camera.y) / camera.scale };
}

export function panCanvas(camera: CanvasCamera, delta: CanvasPoint): CanvasCamera {
  return { ...camera, x: camera.x + delta.x, y: camera.y + delta.y };
}

export function zoomCanvas(
  camera: CanvasCamera,
  anchor: CanvasPoint,
  factor: number,
): CanvasCamera {
  const world = screenToWorld(camera, anchor);
  // Fit-all can legitimately start below the ordinary gesture floor for a very long page.
  const scale = Math.max(Math.min(0.02, camera.scale), Math.min(2, camera.scale * factor));
  return { x: anchor.x - world.x * scale, y: anchor.y - world.y * scale, scale };
}

export function fitCanvas(
  rects: readonly CanvasRect[],
  size: CanvasSize,
  padding = 48,
): CanvasCamera {
  if (!rects.length || size.width <= padding * 2 || size.height <= padding * 2) {
    return { x: 0, y: 0, scale: 1 };
  }
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  const width = right - left;
  const height = bottom - top;
  const scale = Math.min(
    1,
    (size.width - padding * 2) / width,
    (size.height - padding * 2) / height,
  );
  return {
    x: (size.width - width * scale) / 2 - left * scale,
    y: (size.height - height * scale) / 2 - top * scale,
    scale,
  };
}

/** Fit known widths at the top of the board; document heights never affect this camera. */
export function fitCanvasWidth(
  rects: readonly CanvasRect[],
  size: CanvasSize,
  padding = 48,
): CanvasCamera {
  if (!rects.length || size.width <= padding * 2) {
    return { x: 0, y: 0, scale: 1 };
  }
  const left = Math.min(...rects.map((rect) => rect.x));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const top = Math.min(...rects.map((rect) => rect.y));
  const width = right - left;
  const scale = Math.min(1, (size.width - padding * 2) / width);
  return {
    x: (size.width - width * scale) / 2 - left * scale,
    y: padding - top * scale,
    scale,
  };
}
