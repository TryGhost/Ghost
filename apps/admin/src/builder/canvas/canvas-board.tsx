import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';

import { fitCanvas, panCanvas, screenToWorld, zoomCanvas } from './canvas-camera';

import type { ReactNode, SetStateAction } from 'react';
import type { CanvasCamera, CanvasPoint, CanvasRect, CanvasSize } from './canvas-camera';

export type CanvasFrame = CanvasRect & {
  id: string;
  label: string;
  group: string;
  viewport?: CanvasSize;
  overviewLabel?: string;
};
export type CanvasFrameInput =
  | { kind: 'escape'; interactionTime?: number }
  | { kind: 'pan'; deltaX: number; deltaY: number; deltaMode: number }
  | { kind: 'inline-edit'; box: CanvasRect | null }
  | { kind: 'zoom'; x: number; y: number; deltaY: number; deltaMode: number };
export type CanvasView = {
  camera: CanvasCamera;
  selectedFrameId: string | null;
};

function frameHeaders(frames: readonly CanvasFrame[], camera: CanvasCamera) {
  const headers: { frame: CanvasFrame; x: number; y: number }[] = [];
  for (const frame of frames) {
    let x = camera.x + frame.x * camera.scale;
    const y = camera.y + frame.y * camera.scale - 36;
    while (
      headers.some(
        (header) =>
          x < header.x + 154 && x + 154 > header.x && y < header.y + 36 && y + 36 > header.y,
      )
    ) {
      const collision = headers.find(
        (header) =>
          x < header.x + 154 && x + 154 > header.x && y < header.y + 36 && y + 36 > header.y,
      )!;
      x = collision.x + 154;
    }
    headers.push({ frame, x, y });
  }
  return headers;
}

/** Presentation only: the caller owns documents, viewport dimensions, and surface lifetime. */
export function CanvasBoard({
  frames,
  renderFrame,
  initialFitReady = true,
  onSelectionIntent,
  onViewChange,
}: {
  frames: readonly CanvasFrame[];
  initialFitReady?: boolean;
  onSelectionIntent?: (frameId: string | null) => void;
  onViewChange?: (view: CanvasView) => void;
  renderFrame: (
    frame: CanvasFrame,
    onInput: (input: CanvasFrameInput) => void,
    state: { reveal: () => void; select: () => void },
  ) => ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const currentSize = useRef(size);
  currentSize.current = size;
  const [camera, setCamera] = useState<CanvasCamera>({ x: 0, y: 0, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const selectionHandler = useRef(onSelectionIntent);
  selectionHandler.current = onSelectionIntent;
  const selectFrame = (frameId: string | null) => {
    selectionHandler.current?.(frameId);
    setSelected(frameId);
  };
  const drafts = useRef(new Map<string, CanvasRect>());
  const [draftFrames, setDraftFrames] = useState<string[]>([]);
  const viewHandler = useRef(onViewChange);
  viewHandler.current = onViewChange;
  useEffect(() => {
    viewHandler.current?.({
      camera: { ...camera },
      selectedFrameId: selected,
    });
  }, [camera, selected]);
  const initialized = useRef(false);
  const drag = useRef<{ origin: CanvasPoint; point: CanvasPoint; moved: boolean } | null>(null);
  const navigate = useCallback((next: SetStateAction<CanvasCamera>) => {
    initialized.current = true;
    setCamera((current) => {
      const result = typeof next === 'function' ? next(current) : next;
      if (drafts.current.size && result.scale < 1) {
        return zoomCanvas(
          result,
          { x: currentSize.current.width / 2, y: currentSize.current.height / 2 },
          1 / result.scale,
        );
      }
      return result;
    });
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      setSize(next);
      if (
        initialFitReady &&
        !initialized.current &&
        next.width > 96 &&
        next.height > 96 &&
        frames.length
      ) {
        initialized.current = true;
        setCamera(fitCanvas(frames, next));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [frames, initialFitReady]);

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
      navigate((current) =>
        event.ctrlKey || event.metaKey
          ? zoomCanvas(current, point, Math.exp(-event.deltaY * unit * 0.005))
          : panCanvas(current, { x: -event.deltaX * unit, y: -event.deltaY * unit }),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [navigate]);

  const reveal = (frame: CanvasFrame, box?: CanvasRect) => {
    const viewport = currentSize.current;
    selectFrame(frame.id);
    const target = box ?? {
      x: 0,
      y: 0,
      width: frame.width,
      height: Math.min(frame.height, viewport.height - 96),
    };
    navigate({
      x: viewport.width / 2 - (frame.x + target.x + target.width / 2),
      y: box ? viewport.height / 2 - (frame.y + target.y + target.height / 2) : 48 - frame.y,
      scale: 1,
    });
  };
  const fit = (group?: string) => {
    navigate(fitCanvas(group ? frames.filter((frame) => frame.group === group) : frames, size));
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
          onClick={() => navigate((current) => zoomCanvas(current, center, 0.8))}
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
          onClick={() => navigate((current) => zoomCanvas(current, center, 1.25))}
        >
          +
        </Button>
        <Text size="sm" tone="secondary">
          Scroll to pan · Ctrl/⌘ scroll to zoom · Double-click text to edit
        </Text>
      </Inline>
      {draftFrames.length > 0 && (
        <Text role="status" size="sm">
          Uncommitted text in{' '}
          {frames
            .filter((frame) => draftFrames.includes(frame.id))
            .map((frame) => frame.label)
            .join(', ')}
          . Resume the text draft to continue.
        </Text>
      )}
      <Box
        ref={host}
        aria-label="Theme canvas"
        className="relative min-h-0 flex-1 overflow-clip bg-surface-elevated-2"
        role="region"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            selectFrame(null);
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
            navigate((current) => panCanvas(current, delta[event.key]));
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
          navigate((value) => panCanvas(value, delta));
        }}
        onPointerUp={(event) => {
          if (drag.current && !drag.current.moved) {
            selectFrame(atPoint(localPoint(event.clientX, event.clientY))?.id ?? null);
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
              style={{
                left: frame.x,
                top: frame.y,
                width: frame.width,
                height: frame.height,
              }}
            >
              {renderFrame(
                frame,
                (input) => {
                  if (input.kind === 'inline-edit') {
                    if (input.box) {
                      drafts.current.set(frame.id, input.box);
                    } else {
                      drafts.current.delete(frame.id);
                    }
                    setDraftFrames([...drafts.current.keys()]);
                    if (input.box) {
                      setSelected(frame.id);
                      const box = input.box;
                      navigate((current) => {
                        const left = current.x + (frame.x + box.x) * current.scale;
                        const top = current.y + (frame.y + box.y) * current.scale;
                        if (
                          current.scale >= 1 &&
                          left >= 24 &&
                          top >= 24 &&
                          left + box.width * current.scale <= size.width - 24 &&
                          top + box.height * current.scale <= size.height - 24
                        ) {
                          return current;
                        }
                        const scale = Math.max(1, current.scale);
                        return {
                          scale,
                          x: size.width / 2 - (frame.x + box.x + box.width / 2) * scale,
                          y: size.height / 2 - (frame.y + box.y + box.height / 2) * scale,
                        };
                      });
                    }
                    return;
                  }
                  if (input.kind === 'escape') {
                    selectFrame(null);
                  } else if (input.kind === 'pan') {
                    const unit =
                      input.deltaMode === 1 ? 16 : input.deltaMode === 2 ? size.height : 1;
                    navigate((current) =>
                      panCanvas(current, { x: -input.deltaX * unit, y: -input.deltaY * unit }),
                    );
                  } else {
                    const anchor = {
                      x: camera.x + (frame.x + input.x) * camera.scale,
                      y: camera.y + (frame.y + input.y) * camera.scale,
                    };
                    const unit =
                      input.deltaMode === 1
                        ? 16
                        : input.deltaMode === 2
                          ? (frame.viewport?.height ?? frame.height)
                          : 1;
                    navigate((current) =>
                      zoomCanvas(current, anchor, Math.exp(-input.deltaY * unit * 0.005)),
                    );
                  }
                },
                {
                  reveal: () => reveal(frame, drafts.current.get(frame.id)),
                  select: () => selectFrame(frame.id),
                },
              )}
            </Box>
          ))}
        </Box>
        {frameHeaders(frames, camera).map(({ frame, x, y }) => (
          <Button
            key={frame.id}
            aria-label={frame.label}
            aria-pressed={selected === frame.id}
            className="absolute z-20 h-8 justify-start truncate bg-background px-2 text-xs shadow-sm"
            size="sm"
            style={{
              left: x,
              top: y,
              width: 150,
              height: 32,
            }}
            tabIndex={x >= 0 && x + 150 <= size.width && y >= 0 && y + 32 <= size.height ? 0 : -1}
            title={`${frame.label} · ${formatNumber(frame.viewport?.width ?? frame.width)} × ${formatNumber(frame.viewport?.height ?? frame.height)} CSS pixels${frame.overviewLabel ? ` · ${frame.overviewLabel} · ${formatNumber(frame.height)}px composition` : ''}`}
            variant="outline"
            onClick={() => selectFrame(frame.id)}
            onDoubleClick={() => reveal(frame)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                reveal(frame);
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
