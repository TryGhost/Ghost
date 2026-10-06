import React, { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';

const DOCS_URL = 'https://docs.ghost.org/';

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** Corner radii: top-left, top-right, bottom-right, bottom-left. */
  radii: [number, number, number, number];
}

interface Construction {
  width: number;
  height: number;
  boxes: Box[];
}

// Centres a 1px line on a pixel, so it lands on the same pixel as the edge it traces.
const onPixel = (value: number) => Math.round(value) + 0.5;

/**
 * Every element marked `data-construct`, as boxes in the overlay's coordinates:
 * inside the card's border, with each edge snapped on its own so a box and the
 * guide lines off it always share a pixel.
 */
function measure(card: HTMLElement): Construction {
  const cardRect = card.getBoundingClientRect();
  const originX = cardRect.left + card.clientLeft;
  const originY = cardRect.top + card.clientTop;
  const width = card.clientWidth;
  const height = card.clientHeight;
  // The card clips its contents to its own rounded corners, inside its border.
  const cardRadius = Math.max(
    (parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0) - card.clientLeft,
    0,
  );
  const boxes = Array.from(card.querySelectorAll<HTMLElement>('[data-construct]')).map(
    (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const left = rect.left - originX;
      const top = rect.top - originY;
      const right = rect.right - originX;
      const bottom = rect.bottom - originY;
      const flush = (a: number, b: number) => Math.abs(a - b) < 1;
      // A part sitting in one of the card's corners is cut to the card's curve
      // there, like the band, so its outline takes that curve too.
      const corner = (own: string, inCardCorner: boolean) =>
        Math.min(
          Math.max(parseFloat(own) || 0, inCardCorner ? cardRadius : 0),
          rect.width / 2,
          rect.height / 2,
        );
      return {
        left: onPixel(left),
        top: onPixel(top),
        right: onPixel(right) - 1,
        bottom: onPixel(bottom) - 1,
        radii: [
          corner(style.borderTopLeftRadius, flush(left, 0) && flush(top, 0)),
          corner(style.borderTopRightRadius, flush(right, width) && flush(top, 0)),
          corner(style.borderBottomRightRadius, flush(right, width) && flush(bottom, height)),
          corner(style.borderBottomLeftRadius, flush(left, 0) && flush(bottom, height)),
        ] as Box['radii'],
      };
    },
  );
  return { width, height, boxes };
}

/** An outline with its own radius at each corner, inset half a pixel for the stroke. */
function outlinePath({ left, top, right, bottom, radii }: Box): string {
  const [tl, tr, br, bl] = radii.map((radius) => Math.max(radius - 0.5, 0));
  return [
    `M ${left + tl} ${top}`,
    `H ${right - tr}`,
    `A ${tr} ${tr} 0 0 1 ${right} ${top + tr}`,
    `V ${bottom - br}`,
    `A ${br} ${br} 0 0 1 ${right - br} ${bottom}`,
    `H ${left + bl}`,
    `A ${bl} ${bl} 0 0 1 ${left} ${bottom - bl}`,
    `V ${top + tl}`,
    `A ${tl} ${tl} 0 0 1 ${left + tl} ${top}`,
    'Z',
  ].join(' ');
}

/** How far the point is from the box; 0 inside it. */
function distanceTo(box: Box, x: number, y: number) {
  const dx = Math.max(box.left - x, 0, x - box.right);
  const dy = Math.max(box.top - y, 0, y - box.bottom);
  return Math.hypot(dx, dy);
}

/** The part nearest the point, which gets the guide lines. */
function nearestBox(boxes: Box[], x: number, y: number): number {
  let nearest = -1;
  let best = Infinity;
  boxes.forEach((box, index) => {
    const distance = distanceTo(box, x, y);
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  return nearest;
}

interface ConstructionLinesProps extends Construction {
  active: number;
}

/**
 * The card's own layout drawn as a blueprint: a dashed outline round each part,
 * following its corners. Only the part nearest the cursor runs guide lines off
 * its edges across the card, so the drawing stays readable.
 */
const ConstructionLines: React.FC<ConstructionLinesProps> = ({ width, height, boxes, active }) => {
  const guided = boxes[active];

  return (
    <svg className="text-muted-foreground" fill="none" height={height} width={width}>
      {guided && (
        <g opacity={0.25} stroke="currentColor" strokeWidth={1}>
          {[guided.left, guided.right].map((x) => (
            <line key={`x${x}`} x1={x} x2={x} y1={0} y2={height} />
          ))}
          {[guided.top, guided.bottom].map((y) => (
            <line key={`y${y}`} x1={0} x2={width} y1={y} y2={y} />
          ))}
        </g>
      )}
      <g opacity={0.5} stroke="currentColor" strokeDasharray="4 3" strokeWidth={1}>
        {boxes.map((box) => (
          <path key={`${box.left}-${box.top}`} d={outlinePath(box)} />
        ))}
      </g>
    </svg>
  );
};

/**
 * Sits at the end of the apps grid, shaped like an app, and leads to the docs.
 * Hovering shows how an app card is put together, in a circle round the cursor.
 */
export const BuildAppCard: React.FC = () => {
  const cardRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [construction, setConstruction] = useState<Construction | null>(null);
  const [active, setActive] = useState(-1);

  // Kept in step with the card's size, so the lines never drift from what they trace.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) {
      return;
    }
    const update = () => setConstruction(measure(card));
    const observer = new ResizeObserver(update);
    observer.observe(card);
    void document.fonts.ready.then(update);
    return () => observer.disconnect();
  }, []);

  const followPointer = (event: React.PointerEvent<HTMLElement>) => {
    const card = cardRef.current;
    const overlay = overlayRef.current;
    if (event.pointerType !== 'mouse' || !card || !overlay) {
      return;
    }
    const cardRect = card.getBoundingClientRect();
    const x = event.clientX - cardRect.left - card.clientLeft;
    const y = event.clientY - cardRect.top - card.clientTop;
    overlay.style.setProperty('--x', `${x}px`);
    overlay.style.setProperty('--y', `${y}px`);
    if (construction) {
      // Re-renders only when the nearest part changes, not on every move.
      setActive(nearestBox(construction.boxes, x, y));
    }
  };

  return (
    <article
      ref={cardRef}
      aria-label="Build your own app"
      className="group/build relative flex w-full flex-col overflow-hidden rounded-xl border border-border-default bg-card"
      data-testid="build-app-card"
      onPointerEnter={followPointer}
      onPointerMove={followPointer}
    >
      <div className="h-20 bg-muted" data-construct />
      <Stack className="-mt-8 flex-1 px-5 pb-5" gap="none">
        <span
          className="flex size-16 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/40 bg-card text-muted-foreground"
          data-construct
        >
          <LucideIcon.Code className="size-7" strokeWidth={1.5} />
        </span>
        <h2 className="mt-3 w-fit text-lg font-semibold" data-construct>
          Build your own app
        </h2>
        <Text className="w-fit" size="sm" tone="secondary" data-construct>
          By you
        </Text>
        <Text className="mt-3" size="sm" data-construct>
          Learn how apps work in Ghost, and how to build and install your own.
        </Text>
        <div className="mt-auto flex w-full pt-5">
          <Button className="flex-1" variant="outline" asChild data-construct>
            <a href={DOCS_URL} rel="noreferrer" target="_blank">
              Read the docs
              <LucideIcon.ArrowUpRight />
            </a>
          </Button>
        </div>
      </Stack>
      {/* Fades in on hover, and only shows in a soft circle round the cursor. */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 ease-out group-hover/build:opacity-100 motion-reduce:transition-none"
        style={{
          maskImage:
            'radial-gradient(circle 150px at var(--x, 50%) var(--y, 50%), black 30%, transparent 100%)',
        }}
      >
        {construction && <ConstructionLines {...construction} active={active} />}
      </div>
    </article>
  );
};
