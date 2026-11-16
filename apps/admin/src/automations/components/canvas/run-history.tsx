import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from '@sentry/react';
import { Background, BackgroundVariant, ReactFlow } from '@xyflow/react';
import type { Edge, Node, NodeChange, NodeProps } from '@xyflow/react';
import type {
  AutomationRunHistory,
  AutomationRunPlan,
} from '@tryghost/admin-x-framework/api/automation-run-history';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { useAutomationRunHistory } from '@/automations/hooks/use-automation-run-history';
import type { EditorChrome } from '@/automations/components/types';
import { HistoryFlow } from './history-flow';
import { HistoryBackground } from './history-background';
import { canvasBackground, canvasColorClass } from './canvas-background';
import { AutomationCanvasControls } from './controls';
import { CANVAS_ZOOM_CONFIG, useCanvasViewport } from './use-canvas-viewport';

type RunHistoryProps = {
  automationId: string;
  automationSlug: string | null | undefined;
  runId: string;
  memberName?: string;
  isAutomationSidebarOpen: boolean;
  // SHAPING PROTOTYPE ONLY: Docked and Floating show the run on a canvas like the
  // editor's; the current build keeps main's scrolling column.
  chrome: EditorChrome;
  // Width covered by a panel floating over the canvas's right edge.
  rightInset?: number;
  onClose: () => void;
  // Reports the member once the run loads, for a header showing it.
  onMemberNameChange?: (name: string) => void;
};

export const RunHistory: React.FC<RunHistoryProps> = (props) => (
  <ErrorBoundary
    fallback={(error) => (
      <Stack
        align="center"
        aria-label="Run history"
        className="absolute inset-0 bg-preview-canvas px-6 text-center"
        gap="sm"
        justify="center"
        role="region"
      >
        <Text role="alert">Could not load run history</Text>
        <Button
          ref={(button) => button?.focus({ preventScroll: true })}
          variant="outline"
          onClick={() => error.resetError()}
        >
          Retry
        </Button>
      </Stack>
    )}
  >
    <RunHistoryContent {...props} />
  </ErrorBoundary>
);

const HISTORY_WIDTH = 448;

type HistoryNodeData = {
  history: AutomationRunHistory;
  plan?: AutomationRunPlan;
  automationSlug: string | null | undefined;
};
type HistoryNode = Node<HistoryNodeData, 'history'>;

const HistoryNodeView: React.FC<NodeProps<HistoryNode>> = ({ data }) => (
  <HistoryFlow
    automationSlug={data.automationSlug}
    history={data.history}
    plan={data.plan}
    editorStyle
  />
);

const historyNodeTypes = { history: HistoryNodeView };

// The run's steps as one node, so the canvas pans, zooms and stops where the editor's does.
const HistoryCanvas: React.FC<
  HistoryNodeData & { isAutomationSidebarOpen: boolean; rightInset: number; top: number }
> = ({ history, plan, automationSlug, isAutomationSidebarOpen, rightInset, top }) => {
  const [size, setSize] = useState<{ width: number; height: number }>();
  // Centred in the visible width, as the editor's canvas opens.
  const [initialViewport] = useState(() => ({
    x: Math.round(
      (window.innerWidth - (isAutomationSidebarOpen && window.innerWidth >= 960 ? 480 : 0)) / 2,
    ),
    y: top,
    zoom: 1,
  }));

  const nodes = useMemo<HistoryNode[]>(
    () => [
      {
        id: 'history',
        type: 'history',
        position: { x: -HISTORY_WIDTH / 2, y: 0 },
        data: { history, plan, automationSlug },
        style: { width: HISTORY_WIDTH },
        draggable: false,
        selectable: false,
        focusable: false,
        ...(size ? { measured: size } : {}),
      },
    ],
    [automationSlug, history, plan, size],
  );

  const onNodesChange = useCallback((changes: NodeChange<HistoryNode>[]) => {
    for (const change of changes) {
      if (change.type === 'dimensions' && change.dimensions) {
        const next = change.dimensions;
        setSize((current) =>
          current?.width === next.width && current.height === next.height ? current : next,
        );
      }
    }
  }, []);

  const { measureCanvas, translateExtent, onInit, onMove } = useCanvasViewport<HistoryNode, Edge>({
    contentBounds: size
      ? { left: -HISTORY_WIDTH / 2, right: HISTORY_WIDTH / 2, bottom: size.height }
      : undefined,
    initialViewport,
    rightInset,
  });

  return (
    <Box ref={measureCanvas} className="absolute inset-0">
      <ReactFlow
        defaultViewport={initialViewport}
        edges={[]}
        edgesFocusable={false}
        elementsSelectable={false}
        maxZoom={CANVAS_ZOOM_CONFIG.maxZoom}
        minZoom={CANVAS_ZOOM_CONFIG.minZoom}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable={false}
        nodeTypes={historyNodeTypes}
        proOptions={{ hideAttribution: true }}
        translateExtent={translateExtent}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        panOnScroll
        onInit={onInit}
        onMove={onMove}
        onNodesChange={onNodesChange}
      >
        <Background {...canvasBackground} variant={BackgroundVariant.Dots} />
        <AutomationCanvasControls />
      </ReactFlow>
    </Box>
  );
};

const RunHistoryContent: React.FC<RunHistoryProps> = ({
  automationId,
  automationSlug,
  runId,
  memberName,
  isAutomationSidebarOpen,
  chrome,
  rightInset = 0,
  onClose,
  onMemberNameChange,
}) => {
  const { history, summary, isLoading, isError, notFound, retry, plan } = useAutomationRunHistory(
    automationId,
    runId,
  );
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!isAutomationSidebarOpen) {
      closeButton.current?.focus({ preventScroll: true });
    }
  }, [isAutomationSidebarOpen]);

  const loadedMemberName = summary?.memberName;
  useEffect(() => {
    if (loadedMemberName) {
      onMemberNameChange?.(loadedMemberName);
    }
  }, [loadedMemberName, onMemberNameChange]);

  const floating = chrome === 'floating';

  const closeRow = (className: string) => (
    <Inline
      className={cn(
        'pointer-events-none z-10 shrink-0 px-6 py-4',
        className,
        // 12px below the floating header's buttons, in line with their left edge.
        floating && 'pt-[76px] pl-8',
        chrome === 'current' && !isAutomationSidebarOpen && 'pl-16',
      )}
      gap="sm"
    >
      <Button
        ref={closeButton}
        aria-label="Back to editing"
        className="pointer-events-auto h-9 max-w-full min-w-0 bg-surface-elevated"
        title={`Run ${runId}`}
        variant="outline"
        onClick={onClose}
      >
        <LucideIcon.X aria-hidden="true" className="shrink-0" />
        <span className="truncate">{summary?.memberName ?? memberName ?? 'Member'}</span>
      </Button>
    </Inline>
  );

  const statuses = (
    <>
      {isLoading && (
        <Stack align="center" aria-label="Loading run history" gap="sm" role="status">
          <LoadingIndicator size="lg" />
        </Stack>
      )}
      {notFound && (
        <Text role="status" tone="secondary">
          Run not found
        </Text>
      )}
      {isError && (
        <Stack align="center" gap="sm" role="alert">
          <Text>Could not load run history</Text>
          <Button variant="outline" onClick={retry}>
            Retry
          </Button>
        </Stack>
      )}
      {history && summary && (
        <Stack gap="sm">
          <Text as="h2" className="sr-only">
            {summary.statusLabel}
          </Text>
          <Text className="sr-only" role="status" tone="secondary">
            {`${formatNumber(history.steps.length)} recorded ${history.steps.length === 1 ? 'step' : 'steps'}`}
          </Text>
        </Stack>
      )}
    </>
  );

  if (chrome !== 'current') {
    return (
      <Box
        aria-label="Run history"
        className={cn('absolute inset-0 bg-(--xy-background-color)', canvasColorClass(chrome))}
        role="region"
      >
        {history ? (
          <HistoryCanvas
            automationSlug={automationSlug}
            history={history}
            isAutomationSidebarOpen={isAutomationSidebarOpen}
            plan={plan}
            rightInset={rightInset}
            // The first step starts where the editor's trigger does.
            top={floating ? 80 : 24}
          />
        ) : (
          <HistoryBackground />
        )}
        <Stack
          align="center"
          className={
            history
              ? 'sr-only'
              : 'pointer-events-none absolute inset-y-0 left-0 px-6 text-center [&_button]:pointer-events-auto'
          }
          gap="md"
          justify="center"
          // Centred in the part of the canvas the floating panel doesn't cover.
          style={history ? undefined : { right: rightInset }}
        >
          {statuses}
        </Stack>
      </Box>
    );
  }

  return (
    <Box className="absolute inset-0 bg-preview-canvas">
      <HistoryBackground />
      <Stack
        aria-label="Run history"
        className="relative h-full overflow-y-auto"
        gap="none"
        role="region"
      >
        {closeRow('sticky top-0')}
        <Stack
          className={
            history
              ? 'mx-auto w-full max-w-[448px] px-6 text-center'
              : 'm-auto w-full max-w-md px-6 py-12 text-center'
          }
          gap="md"
        >
          {statuses}
        </Stack>
        {history && <HistoryFlow automationSlug={automationSlug} history={history} plan={plan} />}
      </Stack>
    </Box>
  );
};
