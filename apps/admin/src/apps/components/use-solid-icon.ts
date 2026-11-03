import React from 'react';

// An icon whose pixels are at least this opaque, such as a favicon on its own background,
// would flatten to a plain square, so it's drawn in full colour instead.
const SOLID_COVERAGE = 0.95;
// The icon is measured at this size, in pixels a side.
const SAMPLE_SIZE = 64;
// A pixel at least this opaque, out of 255, counts towards the coverage.
const OPAQUE_ALPHA = 128;

// Settled measurements, read while rendering, and the measurement of each icon, shared by
// every component drawing it so each icon is decoded and read once.
const measured = new Map<string, boolean>();
const measuring = new Map<string, Promise<boolean>>();

/** Whether at least SOLID_COVERAGE of a SAMPLE_SIZE drawing of the icon is opaque. */
async function measureSolid(src: string): Promise<boolean> {
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      return false;
    }
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    let opaque = 0;
    for (let alpha = 3; alpha < data.length; alpha += 4) {
      if (data[alpha] >= OPAQUE_ALPHA) {
        opaque += 1;
      }
    }
    return opaque / (SAMPLE_SIZE * SAMPLE_SIZE) >= SOLID_COVERAGE;
  } catch {
    // A copy that doesn't decode is flattened, and its image's own error falls back.
    return false;
  }
}

function measure(src: string): Promise<boolean> {
  let pending = measuring.get(src);
  if (!pending) {
    pending = measureSolid(src).then((solid) => {
      measured.set(src, solid);
      return solid;
    });
    measuring.set(src, pending);
  }
  return pending;
}

/**
 * Whether a stored icon is solid. Undefined until it's known, so the caller can keep the
 * icon hidden rather than flash the wrong treatment.
 */
export function useSolidIcon(src: string | null): boolean | undefined {
  const solid = src ? measured.get(src) : undefined;
  const [, rerender] = React.useReducer((count: number) => count + 1, 0);
  React.useEffect(() => {
    // Waits even if another component settled it since this render, which this render missed.
    if (!src || solid !== undefined) {
      return;
    }
    let current = true;
    void measure(src).then(() => {
      if (current) {
        rerender();
      }
    });
    return () => {
      current = false;
    };
  }, [src, solid]);
  return solid;
}
