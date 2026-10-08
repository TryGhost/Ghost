import React from 'react';
import { Background, ReactFlow, type Viewport } from '@xyflow/react';
import { Skeleton } from '@tryghost/shade/components';
import { Box, Inline, Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { AutomationCanvasControls } from './controls';
import { CANVAS_ZOOM_CONFIG } from './use-canvas-viewport';
import { canvasBackground } from './canvas-background';

// Mirrors the canvas's node column: its first node sits 40px down, centred, with
// a fixed visual gap to the next.
const NODE_GAP_Y = 112;

function Bone({ className, rounded = 'rounded-sm' }: { className: string; rounded?: string }) {
  return (
    <Skeleton
      className={cn('h-full', rounded)}
      containerClassName={cn('flex shrink-0', className)}
    />
  );
}

const NodeSkeleton: React.FC<{ editable: boolean; height: number }> = ({ editable, height }) =>
  editable ? (
    <Inline
      align="start"
      className="w-[400px] rounded-xl border border-border-default bg-surface-elevated p-6 shadow-sm"
      gap="md"
      style={{ height }}
    >
      <Bone className="size-10" rounded="rounded-md" />
      <Stack className="flex-1 pt-1" gap="sm">
        <Bone className="h-4 w-2/5" />
        <Bone className="h-3 w-3/5" />
      </Stack>
    </Inline>
  ) : (
    <Inline
      className="w-64 rounded-lg bg-surface-elevated p-3 shadow-sm"
      gap="md"
      style={{ height }}
    >
      <Bone className="size-8" rounded="rounded-md" />
      <Stack className="flex-1" gap="sm">
        <Bone className="h-3 w-1/3" />
        <Bone className="h-4 w-3/4" />
      </Stack>
    </Inline>
  );

/** The editing canvas while its automation loads: the dot grid and two node outlines. */
export const AutomationCanvasSkeleton: React.FC<{ defaultViewport?: Viewport }> = ({
  defaultViewport,
}) => {
  const editable = useFeatureFlag('automationRunAnalytics');

  return (
    <Box
      aria-busy="true"
      className="relative min-h-0 flex-1 overflow-hidden bg-background"
      data-testid="automation-canvas-loading"
    >
      <span className="sr-only" role="status">
        Loading
      </span>
      <ReactFlow
        className="[--xy-background-color:var(--preview-canvas)]"
        defaultViewport={defaultViewport}
        edges={[]}
        maxZoom={CANVAS_ZOOM_CONFIG.maxZoom}
        minZoom={CANVAS_ZOOM_CONFIG.minZoom}
        nodes={[]}
        panOnDrag={false}
        proOptions={{ hideAttribution: true }}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        zoomOnScroll={false}
      >
        <Background {...canvasBackground} />
        <AutomationCanvasControls />
      </ReactFlow>
      <Stack
        align="center"
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-10"
        gap="none"
      >
        <NodeSkeleton editable={editable} height={editable ? 156 : 68} />
        <Box className="w-px bg-border-default" style={{ height: NODE_GAP_Y }} />
        <NodeSkeleton editable={editable} height={editable ? 144 : 68} />
      </Stack>
    </Box>
  );
};
