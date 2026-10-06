import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { PageHeader } from '@tryghost/shade/patterns';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber, LucideIcon } from '@tryghost/shade/utils';

import { fitCanvas, fitCanvasWidth, panCanvas, screenToWorld, zoomCanvas } from './canvas-camera';

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
  | { kind: 'pan-key'; active: boolean; interactionTime: number }
  | {
      kind: 'pan-drag';
      phase: 'start' | 'move' | 'end' | 'cancel';
      gesture: number;
      x: number;
      y: number;
    }
  | { kind: 'escape'; interactionTime?: number }
  | { kind: 'pan'; deltaX: number; deltaY: number; deltaMode: number }
  | { kind: 'inline-edit'; box: CanvasRect | null }
  | { kind: 'zoom'; x: number; y: number; deltaY: number; deltaMode: number };
export type CanvasView = {
  camera: CanvasCamera;
  selectedFrameId: string | null;
};
const boardPanOwner = Symbol('canvas-board');

function frameHeaders(frames: readonly CanvasFrame[], camera: CanvasCamera, size: CanvasSize) {
  // Compact labels stay with their live frames as the camera zooms out.
  return frames.map((frame) => {
    const left = camera.x + frame.x * camera.scale;
    const top = camera.y + frame.y * camera.scale;
    const available = frame.width * camera.scale;
    const visible =
      left < size.width &&
      left + available > 0 &&
      top < size.height &&
      top + frame.height * camera.scale > 0;
    const width = Math.min(
      150,
      available,
      visible ? Math.min(size.width, left + available) - Math.max(0, left) : available,
    );
    // A cropped page keeps its header within its own visible portion.
    const x = visible && left < 0 ? Math.min(8, left + available - width) : left;
    return {
      frame,
      x,
      y: visible ? Math.max(8, Math.min(top - 36, size.height - 40)) : top - 36,
      width,
      showActions: visible && x + 234 <= Math.min(size.width, left + available),
    };
  });
}

/** Presentation only: the caller owns documents, viewport dimensions, and surface lifetime. */
export function CanvasBoard({
  frames,
  renderFrame,
  renderFrameActions,
  initialFitReady = true,
  renderControls,
  onSelectionIntent,
  onViewChange,
}: {
  frames: readonly CanvasFrame[];
  renderFrameActions?: (frame: CanvasFrame) => ReactNode;
  initialFitReady?: boolean;
  renderControls?: (controls: ReactNode) => ReactNode;
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
  const drag = useRef<{
    origin: CanvasPoint;
    point: CanvasPoint;
    moved: boolean;
    source: string | typeof boardPanOwner;
    space: boolean;
    cancelled: boolean;
    pointerId?: number;
    gesture?: number;
  } | null>(null);
  const [panArmed, setPanArmed] = useState(false);
  const [panDragging, setPanDragging] = useState(false);
  const panOwner = useRef<string | typeof boardPanOwner | null>(null);
  const panTime = useRef(0);
  const panKeyInput = (source: string | typeof boardPanOwner, active: boolean, time: number) => {
    if (time < panTime.current || (!active && panOwner.current !== source)) {
      return;
    }
    panTime.current = time;
    panOwner.current = active ? source : null;
    setPanArmed(active);
    if (!active && drag.current?.space) {
      if (drag.current.source === boardPanOwner) {
        // Retain capture until pointerup so releasing Space cannot click through.
        drag.current.cancelled = true;
      } else {
        drag.current = null;
        setPanDragging(false);
      }
    }
  };
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
    const editable = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest(
        'input,textarea,select,button,dialog,[role="button"],[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="dialog"],[role="menu"],[role="listbox"]',
      );
    const down = (event: KeyboardEvent) => {
      if (!event.isTrusted || event.isComposing || !host.current?.contains(event.target as Node)) {
        return;
      }
      if (event.key === 'Escape' && (panOwner.current || drag.current?.space)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        panKeyInput(
          panOwner.current ?? boardPanOwner,
          false,
          performance.timeOrigin + event.timeStamp,
        );
      } else if (
        event.code === 'Space' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !editable(event.target)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        // Cancellation lasts until a fresh press, even while the OS repeats Space.
        if (!event.repeat) {
          panKeyInput(boardPanOwner, true, performance.timeOrigin + event.timeStamp);
        }
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.isTrusted && event.code === 'Space' && panOwner.current) {
        event.preventDefault();
        panKeyInput(panOwner.current, false, performance.timeOrigin + event.timeStamp);
      }
    };
    const blur = () => {
      panOwner.current = null;
      setPanArmed(false);
      const pointer = drag.current?.pointerId;
      drag.current = null;
      setPanDragging(false);
      if (pointer !== undefined && host.current?.hasPointerCapture(pointer)) {
        host.current.releasePointerCapture(pointer);
      }
    };
    const focus = (event: FocusEvent) => {
      if (
        panOwner.current &&
        (!host.current?.contains(event.target as Node) ||
          editable(event.target) ||
          event.target instanceof HTMLIFrameElement)
      ) {
        panKeyInput(panOwner.current, false, performance.timeOrigin + performance.now());
      }
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    window.addEventListener('blur', blur);
    window.addEventListener('focusin', focus);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focusin', focus);
      blur();
    };
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      setSize(next);
      if (initialFitReady && !initialized.current && next.width > 96 && frames.length) {
        initialized.current = true;
        const home = frames.filter((frame) => frame.group === 'Home');
        setCamera(fitCanvasWidth(home.length ? home : frames.slice(0, 1), next));
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
  const controls = (
    <Inline align="center" aria-label="Canvas zoom" gap="xs" role="group">
      <PageHeader.ActionGroup>
        <PageHeader.Action
          label="Zoom out"
          iconOnly
          onClick={() => navigate((current) => zoomCanvas(current, center, 0.8))}
        >
          <LucideIcon.Minus />
        </PageHeader.Action>
        <Text className="min-w-10 text-center tabular-nums" size="sm">
          {formatNumber(Math.round(camera.scale * 100))}%
        </Text>
        <PageHeader.Action
          label="Zoom in"
          iconOnly
          onClick={() => navigate((current) => zoomCanvas(current, center, 1.25))}
        >
          <LucideIcon.Plus />
        </PageHeader.Action>
      </PageHeader.ActionGroup>
    </Inline>
  );

  return (
    <Stack className="h-full min-h-0 bg-background" gap="none">
      {renderControls ? renderControls(controls) : controls}
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
        aria-description="Scroll or Space-drag to pan. Ctrl/Command-scroll to zoom. Double-click text to edit. F to fit all."
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
          if (
            event.key.toLowerCase() === 'f' &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault();
            navigate(fitCanvas(frames, size));
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
          const interrupted = drag.current !== null;
          drag.current = null;
          setPanDragging(false);
          if (interrupted) {
            panOwner.current = null;
            setPanArmed(false);
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPanDragging(false);
          panOwner.current = null;
          setPanArmed(false);
        }}
        onPointerDown={(event) => {
          if (
            (event.button !== 0 && event.button !== 1) ||
            (!panOwner.current &&
              (event.target as HTMLElement).closest('button,[data-canvas-frame]'))
          ) {
            return;
          }
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = { x: event.clientX, y: event.clientY };
          const space = panOwner.current !== null;
          drag.current = {
            origin: point,
            point,
            moved: false,
            source: boardPanOwner,
            space,
            cancelled: false,
            pointerId: event.pointerId,
          };
          setPanDragging(space);
          if (!space) {
            host.current?.focus({ preventScroll: true });
          }
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || current.source !== boardPanOwner || current.cancelled) {
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
          if (drag.current && !drag.current.space && !drag.current.moved) {
            selectFrame(atPoint(localPoint(event.clientX, event.clientY))?.id ?? null);
          }
          drag.current = null;
          setPanDragging(false);
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
                  if (input.kind === 'pan-key') {
                    panKeyInput(frame.id, input.active, input.interactionTime);
                    return;
                  }
                  if (input.kind === 'pan-drag') {
                    const point = { x: input.x, y: input.y };
                    if (input.phase === 'start' && panOwner.current === frame.id) {
                      drag.current = {
                        origin: point,
                        point,
                        moved: false,
                        source: frame.id,
                        space: true,
                        cancelled: false,
                        gesture: input.gesture,
                      };
                      setPanDragging(true);
                    } else {
                      const current = drag.current;
                      if (
                        !current ||
                        current.source !== frame.id ||
                        current.gesture !== input.gesture
                      ) {
                        return;
                      }
                      if (input.phase === 'move' || input.phase === 'end') {
                        if (
                          current.moved ||
                          Math.hypot(point.x - current.origin.x, point.y - current.origin.y) >= 3
                        ) {
                          current.moved = true;
                          const delta = {
                            x: point.x - current.point.x,
                            y: point.y - current.point.y,
                          };
                          current.point = point;
                          navigate((value) => panCanvas(value, delta));
                        }
                      }
                      if (input.phase === 'end' || input.phase === 'cancel') {
                        drag.current = null;
                        setPanDragging(false);
                      }
                    }
                    return;
                  }
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
        {frameHeaders(frames, camera, size).map(({ frame, x, y, width, showActions }) => (
          <Inline key={frame.id} className="absolute z-20" gap="xs" style={{ left: x, top: y }}>
            <Button
              ref={(element) => {
                if (element) {
                  element.inert = x < 0 || x + width > size.width || y < 0 || y + 32 > size.height;
                }
              }}
              aria-label={frame.label}
              aria-pressed={selected === frame.id}
              className={`h-8 truncate bg-background text-xs shadow-sm ${width < 150 ? 'justify-center' : 'justify-start'} ${width < 40 ? 'px-0' : 'px-2'}`}
              size="sm"
              style={{
                width,
                height: 32,
              }}
              tabIndex={
                x >= 0 && x + width <= size.width && y >= 0 && y + 32 <= size.height ? 0 : -1
              }
              title={`${frame.label} · ${formatNumber(frame.viewport?.width ?? frame.width)} × ${formatNumber(frame.viewport?.height ?? frame.height)} CSS pixels${frame.overviewLabel ? ` · ${frame.overviewLabel} · ${formatNumber(frame.height)} CSS pixels high` : ''}`}
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
              {width >= 150 ? frame.label : frame.label.endsWith(' · Mobile') ? 'M' : frame.group}
            </Button>
            {renderFrameActions && showActions && (
              <Box
                ref={(element) => {
                  if (element) {
                    element.inert =
                      x + 154 < 0 || x + 230 > size.width || y < 0 || y + 32 > size.height;
                  }
                }}
              >
                {renderFrameActions(frame)}
              </Box>
            )}
          </Inline>
        ))}
        {(panArmed || panDragging) && (
          <Box
            className={`absolute inset-0 z-30 ${panDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            data-canvas-pan-shield
          />
        )}
      </Box>
    </Stack>
  );
}
