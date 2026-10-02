import { useEffect, useRef, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';

import { fitCanvas, panCanvas, screenToWorld, zoomCanvas } from './canvas-camera';

import type { ReactNode } from 'react';
import type { CanvasCamera, CanvasPoint, CanvasRect } from './canvas-camera';

export type CanvasFrame = CanvasRect & { id: string; label: string; group: string };
export type CanvasFrameInput =
  | { kind: 'escape' }
  | { kind: 'zoom'; x: number; y: number; deltaY: number; deltaMode: number };

/** Presentation only: the caller owns documents, viewport dimensions, and surface lifetime. */
export function CanvasBoard({
  frames,
  renderFrame,
}: {
  frames: readonly CanvasFrame[];
  renderFrame: (frame: CanvasFrame, onInput: (input: CanvasFrameInput) => void) => ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState<CanvasCamera>({ x: 0, y: 0, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const overview = useRef<CanvasCamera | null>(null);
  const initialized = useRef(false);
  const drag = useRef<{ origin: CanvasPoint; point: CanvasPoint; moved: boolean } | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      setSize(next);
      if (!initialized.current && next.width > 96 && next.height > 96 && frames.length) {
        initialized.current = true;
        setCamera(fitCanvas(frames, next));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [frames]);

  useEffect(() => {
    const element = host.current;
    if (!element) {
      return;
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      setCamera((current) =>
        event.ctrlKey || event.metaKey
          ? zoomCanvas(current, point, Math.exp(-event.deltaY * unit * 0.005))
          : panCanvas(current, { x: -event.deltaX * unit, y: -event.deltaY * unit }),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);

  const open = (frame: CanvasFrame) => {
    if (!focused) {
      overview.current = camera;
    }
    setSelected(frame.id);
    setFocused(frame.id);
    const scale = Math.min(1, Math.max(0.1, (size.width - 96) / frame.width));
    setCamera({
      x: (size.width - frame.width * scale) / 2 - frame.x * scale,
      y: 48 - frame.y * scale,
      scale,
    });
  };
  const back = () => {
    setFocused(null);
    if (overview.current) {
      setCamera(overview.current);
      overview.current = null;
    }
    host.current?.focus({ preventScroll: true });
  };
  const fit = (group?: string) => {
    setFocused(null);
    overview.current = null;
    setCamera(fitCanvas(group ? frames.filter((frame) => frame.group === group) : frames, size));
  };
  const atPoint = (point: CanvasPoint) => {
    const world = screenToWorld(camera, point);
    return frames.find(
      (frame) =>
        world.x >= frame.x &&
        world.x <= frame.x + frame.width &&
        world.y >= frame.y &&
        world.y <= frame.y + frame.height,
    );
  };
  const localPoint = (clientX: number, clientY: number) => {
    const rect = host.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const center = { x: size.width / 2, y: size.height / 2 };

  return (
    <Stack className="h-full min-h-0 bg-background" gap="none">
      <Inline
        aria-label="Canvas controls"
        className="shrink-0 border-b border-border-default px-4 py-2"
        gap="sm"
        role="toolbar"
        wrap
      >
        {focused && (
          <Button size="sm" variant="outline" onClick={back}>
            Back to overview
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => fit()}>
          Fit all
        </Button>
        {[...new Set(frames.map((frame) => frame.group))].map((group) => (
          <Button key={group} size="sm" variant="ghost" onClick={() => fit(group)}>
            Fit {group}
          </Button>
        ))}
        <Button
          aria-label="Zoom out"
          size="sm"
          variant="ghost"
          onClick={() => setCamera((current) => zoomCanvas(current, center, 0.8))}
        >
          −
        </Button>
        <Text className="min-w-12 text-center tabular-nums" size="sm">
          {formatNumber(Math.round(camera.scale * 100))}%
        </Text>
        <Button
          aria-label="Zoom in"
          size="sm"
          variant="ghost"
          onClick={() => setCamera((current) => zoomCanvas(current, center, 1.25))}
        >
          +
        </Button>
        <Text size="sm" tone="secondary">
          Drag or scroll to pan · Ctrl/⌘ scroll to zoom · Double-click a frame to open
        </Text>
      </Inline>
      <Box
        ref={host}
        aria-label="Theme canvas"
        className="relative min-h-0 flex-1 overflow-clip bg-surface-elevated-2"
        role="region"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && focused) {
            event.preventDefault();
            back();
          }
          if (event.target !== event.currentTarget) {
            return;
          }
          const delta: Record<string, CanvasPoint> = {
            ArrowLeft: { x: 60, y: 0 },
            ArrowRight: { x: -60, y: 0 },
            ArrowUp: { x: 0, y: 60 },
            ArrowDown: { x: 0, y: -60 },
          };
          if (delta[event.key]) {
            event.preventDefault();
            setCamera((current) => panCanvas(current, delta[event.key]));
          }
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onPointerDown={(event) => {
          if (
            (event.button !== 0 && event.button !== 1) ||
            (event.target as HTMLElement).closest('button,[data-canvas-frame]')
          ) {
            return;
          }
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = { x: event.clientX, y: event.clientY };
          drag.current = { origin: point, point, moved: false };
          host.current?.focus({ preventScroll: true });
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current) {
            return;
          }
          if (
            !current.moved &&
            Math.hypot(event.clientX - current.origin.x, event.clientY - current.origin.y) < 3
          ) {
            return;
          }
          current.moved = true;
          const delta = { x: event.clientX - current.point.x, y: event.clientY - current.point.y };
          current.point = { x: event.clientX, y: event.clientY };
          setCamera((value) => panCanvas(value, delta));
        }}
        onPointerUp={(event) => {
          if (!focused && drag.current && !drag.current.moved) {
            setSelected(atPoint(localPoint(event.clientX, event.clientY))?.id ?? null);
          }
          drag.current = null;
        }}
      >
        <Box
          className="absolute top-0 left-0 origin-top-left"
          data-testid="canvas-world"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}
        >
          {frames.map((frame) => (
            <Box
              key={frame.id}
              className={`absolute overflow-hidden bg-background shadow-md ${selected === frame.id ? 'outline-2 outline-primary' : ''}`}
              data-canvas-frame={frame.id}
              // React 18 needs a string-valued inert attribute; its typings predate this DOM API.
              {...{ inert: focused !== frame.id ? '' : undefined }}
              style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
            >
              {renderFrame(frame, (input) => {
                if (focused !== frame.id) {
                  return;
                }
                if (input.kind === 'escape') {
                  back();
                } else {
                  const anchor = {
                    x: camera.x + (frame.x + input.x) * camera.scale,
                    y: camera.y + (frame.y + input.y) * camera.scale,
                  };
                  const unit =
                    input.deltaMode === 1 ? 16 : input.deltaMode === 2 ? frame.height : 1;
                  setCamera((current) =>
                    zoomCanvas(current, anchor, Math.exp(-input.deltaY * unit * 0.005)),
                  );
                }
              })}
            </Box>
          ))}
        </Box>
        {!focused && (
          <Box
            aria-hidden="true"
            className="absolute inset-0 z-10 cursor-grab touch-none active:cursor-grabbing"
            onDoubleClick={(event) => {
              const frame = atPoint(localPoint(event.clientX, event.clientY));
              if (frame) {
                open(frame);
              }
            }}
          />
        )}
        {frames.map((frame) => (
          <Button
            key={frame.id}
            aria-label={frame.label}
            aria-pressed={selected === frame.id}
            className="absolute z-20 h-8 justify-start truncate bg-background px-2 text-xs shadow-sm"
            size="sm"
            style={{
              left: camera.x + frame.x * camera.scale,
              top: camera.y + frame.y * camera.scale - 36,
              maxWidth: Math.max(150, frame.width * camera.scale),
            }}
            tabIndex={
              camera.x + frame.x * camera.scale >= 0 &&
              camera.x + frame.x * camera.scale + 150 <= size.width &&
              camera.y + frame.y * camera.scale >= 36 &&
              camera.y + frame.y * camera.scale <= size.height
                ? 0
                : -1
            }
            title={`${frame.label} · ${formatNumber(frame.width)} × ${formatNumber(frame.height)} CSS pixels`}
            variant="outline"
            onClick={() => setSelected(frame.id)}
            onDoubleClick={() => open(frame)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                open(frame);
              }
            }}
          >
            {frame.label}
          </Button>
        ))}
      </Box>
    </Stack>
  );
}
