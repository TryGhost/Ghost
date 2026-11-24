import { useMemo } from 'react';
import { stableHash } from '@/auth-prototype/fake';

const SIZE = 25;

function isFinder(x: number, y: number) {
  const inBox = (left: number, top: number) => x >= left && x < left + 7 && y >= top && y < top + 7;
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
}

function finderCell(x: number, y: number) {
  const local = (value: number) => (value >= SIZE - 7 ? value - (SIZE - 7) : value);
  const lx = local(x);
  const ly = local(y);
  const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6;
  const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
  return ring || core;
}

/**
 * A static, QR-looking pattern. It does not encode anything: the prototype
 * has no real secret to share. Drawn in currentColor so it follows the theme.
 */
export function QrPlaceholder({ className }: { className?: string }) {
  const cells = useMemo(() => {
    const result: { x: number; y: number }[] = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const on = isFinder(x, y) ? finderCell(x, y) : stableHash(`${x}:${y}:ghost`) % 2 === 0;
        if (on) {
          result.push({ x, y });
        }
      }
    }
    return result;
  }, []);

  return (
    <svg
      aria-label="QR code for your authenticator app (placeholder)"
      className={className}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
    >
      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} fill="currentColor" height="1" width="1" x={x} y={y} />
      ))}
    </svg>
  );
}
