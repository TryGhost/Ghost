import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CoordinateExtent,
  Edge,
  Node,
  OnInit,
  OnMove,
  ReactFlowInstance,
  Viewport,
} from '@xyflow/react';

export type CanvasContentBounds = {
  left: number;
  right: number;
  bottom: number;
};

export const CANVAS_ZOOM_CONFIG = {
  minZoom: 0.5,
  maxZoom: 1,
  presets: [1, 0.75, 0.5],
} as const;

// Keep the viewport center over the content. Each content edge can move as far as the center of
// the canvas, while short flows retain their initial top-anchored position.
const getPanTranslateExtent = (
  content: CanvasContentBounds,
  size: { width: number; height: number },
  viewport: Pick<Viewport, 'y' | 'zoom'>,
): CoordinateExtent => {
  const halfWidth = size.width / (2 * viewport.zoom);
  const halfHeight = size.height / (2 * viewport.zoom);
  const initialVisibleBottom = (size.height - viewport.y) / viewport.zoom;

  return [
    [content.left - halfWidth, -halfHeight],
    [content.right + halfWidth, Math.max(content.bottom + halfHeight, initialVisibleBottom)],
  ];
};

const constrainViewport = (
  viewport: Viewport,
  size: { width: number; height: number },
  extent: CoordinateExtent,
): Viewport => ({
  x: Math.min(
    Math.max(viewport.x, size.width - extent[1][0] * viewport.zoom),
    -extent[0][0] * viewport.zoom,
  ),
  y: Math.min(
    Math.max(viewport.y, size.height - extent[1][1] * viewport.zoom),
    -extent[0][1] * viewport.zoom,
  ),
  zoom: viewport.zoom,
});

export const useCanvasViewport = <NodeType extends Node = Node, EdgeType extends Edge = Edge>({
  contentBounds,
  initialViewport,
  rightInset = 0,
}: {
  contentBounds?: CanvasContentBounds;
  initialViewport: Viewport;
  // Width covered by a panel floating over the canvas's right edge.
  rightInset?: number;
}) => {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    NodeType,
    EdgeType
  > | null>(null);
  const [zoom, setZoom] = useState(initialViewport.zoom);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const previousCanvasWidth = useRef<number | null>(null);
  const previousRightInset = useRef(rightInset);

  const measureCanvas = useCallback((element: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();

    if (!element) {
      resizeObserverRef.current = null;
      return;
    }

    const update = () => {
      const nextSize = { width: element.clientWidth, height: element.clientHeight };
      setCanvasSize((currentSize) =>
        currentSize.width === nextSize.width && currentSize.height === nextSize.height
          ? currentSize
          : nextSize,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    resizeObserverRef.current = observer;
  }, []);

  const visibleSize = useMemo(
    () => ({ width: Math.max(0, canvasSize.width - rightInset), height: canvasSize.height }),
    [canvasSize, rightInset],
  );

  const translateExtent = useMemo(
    () =>
      contentBounds && visibleSize.width && visibleSize.height
        ? getPanTranslateExtent(contentBounds, visibleSize, { y: initialViewport.y, zoom })
        : undefined,
    [visibleSize, contentBounds, initialViewport.y, zoom],
  );

  const onInit = useCallback<OnInit<NodeType, EdgeType>>((instance) => {
    setReactFlowInstance(instance);
    setZoom(instance.getViewport().zoom);
  }, []);

  const onMove = useCallback<OnMove>((_, viewport) => {
    setZoom((currentZoom) =>
      Math.abs(currentZoom - viewport.zoom) < 1e-6 ? currentZoom : viewport.zoom,
    );
  }, []);

  const contentBottom = contentBounds?.bottom;
  const contentLeft = contentBounds?.left;
  const contentRight = contentBounds?.right;

  useEffect(() => {
    if (
      !reactFlowInstance ||
      !visibleSize.width ||
      !visibleSize.height ||
      contentBottom === undefined ||
      contentLeft === undefined ||
      contentRight === undefined
    ) {
      return;
    }

    // React Flow applies a new translateExtent to future interactions but does not constrain
    // the current transform. Clamp it explicitly after the canvas, graph, or zoom changes.
    const currentViewport = reactFlowInstance.getViewport();
    const nextExtent = getPanTranslateExtent(
      {
        bottom: contentBottom,
        left: contentLeft,
        right: contentRight,
      },
      visibleSize,
      { y: initialViewport.y, zoom },
    );
    // Preserve the visible center when a sidebar changes the visible width.
    const widthChange = visibleSize.width - (previousCanvasWidth.current ?? visibleSize.width);
    previousCanvasWidth.current = visibleSize.width;
    const insetChanged = previousRightInset.current !== rightInset;
    previousRightInset.current = rightInset;
    const nextViewport = constrainViewport(
      { ...currentViewport, x: currentViewport.x + widthChange / 2 },
      visibleSize,
      nextExtent,
    );

    if (nextViewport.x !== currentViewport.x || nextViewport.y !== currentViewport.y) {
      void reactFlowInstance.setViewport(nextViewport, {
        // A docked sidebar's width already animates in CSS, so a second animation would
        // trail each resize frame. A floating one slides over a canvas that doesn't resize.
        duration: insetChanged ? 300 : widthChange === 0 ? 250 : 0,
        interpolate: 'linear',
      });
    }
  }, [
    visibleSize.height,
    visibleSize.width,
    rightInset,
    contentBottom,
    contentLeft,
    contentRight,
    initialViewport.y,
    reactFlowInstance,
    zoom,
  ]);

  return {
    measureCanvas,
    onInit,
    onMove,
    translateExtent,
  };
};
