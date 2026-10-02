import '@xyflow/react/dist/style.css';
import AddStepEdge, { type AddStepEdgeData } from './add-step-edge';
import EmailContentModal from '@/automations/components/email-modal/email-content-modal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Banner,
  Button,
  LoadingIndicator,
} from '@tryghost/shade/components';
import {
  MAX_AUTOMATION_ACTIONS,
  insertSendEmailAction,
  insertWaitAction,
  removeAction,
  updateSendEmailAction,
  updateWaitAction,
} from '@tryghost/admin-x-framework/api/automations';
import type {
  AutomationAction,
  AutomationDetail,
  AutomationSendEmailAction,
} from '@tryghost/admin-x-framework/api/automations';
import { AutomationCanvasControls } from './controls';
import { TAIL_CANVAS_ID, TRIGGER_CANVAS_ID } from './nodes';
import { nodeTypes, toApiAnchor } from './node-helpers';
import type {
  AutomationFlowNode,
  CanvasAnchor,
  NodeContextMenuEntry,
  StepNodeDisplayData,
} from './nodes';
import { Background, BackgroundVariant, ReactFlow } from '@xyflow/react';
import type { Edge, NodeChange } from '@xyflow/react';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { Box, Inline } from '@tryghost/shade/primitives';
import { RunHistory } from './run-history';
import { canvasBackground } from './canvas-background';
import { PerformanceSidebar } from './performance-sidebar';
import { type StepPickerType } from './step-picker';
import { StepSidebar } from './step-sidebar';
import { EmailPerformanceSidebar } from './email-performance-sidebar';
import { formatWait } from './format-wait';
import { isEmptyEmailLexical } from '@/automations/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useLocation, useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import type { EmailModalMode } from '@/automations/components/types';
import { CANVAS_ZOOM_CONFIG, useCanvasViewport } from './use-canvas-viewport';
import type { CanvasContentBounds } from './use-canvas-viewport';

const NODE_X = 0;
const NODE_WIDTH = 256;
const NODE_COLUMN_CENTER_X = NODE_X + NODE_WIDTH / 2;
// Visible space between node bottom and the next node's top. Constant across all pairs so the
// chain reads as evenly spaced regardless of how tall any individual node renders.
const NODE_VISUAL_GAP_Y = 112;
// Initial height estimates; React Flow measurements replace these once mounted,
// keeping the visible gap uniform as content and validation messages change.
const REGULAR_NODE_HEIGHT = 68;
const EMAIL_NODE_WITH_STATS_HEIGHT = 133;
const EDITABLE_NODE_WIDTH = 400;
const EDITABLE_EMAIL_NODE_HEIGHT = 350;
const EDITABLE_WAIT_NODE_HEIGHT = 144;
const FIXED_TRIGGER_NODE_HEIGHT = 86;
const EXIT_NODE_HEIGHT = 55;
const INITIAL_VIEWPORT_Y = 40;
// Rendered height of the tail node (h-12) — used to derive the content's bottom edge for the pan bound.
const TAIL_NODE_HEIGHT = 48;
const NODE_ENTER_ANIMATION_DURATION = 250;
const DISABLED_REASON = 'Maximum steps added';
const DEFAULT_EDGE_STROKE = 'var(--xy-edge-stroke)';
export const EMAIL_STEP_QUERY_PARAM = 'emailStep';

const edgeTypes = {
  'add-step-edge': AddStepEdge,
};

const buildActionData = (action: AutomationAction): StepNodeDisplayData => {
  switch (action.type) {
    case 'wait':
      return { icon: LucideIcon.Clock, label: 'Wait', value: formatWait(action.data.wait_hours) };
    case 'send_email':
      return {
        icon: LucideIcon.Mail,
        isPlaceholderValue: !action.data.email_subject,
        label: 'Send email',
        stats: action.stats,
        value: action.data.email_subject || 'Untitled',
        warningMessage: isEmptyEmailLexical(action.data.email_lexical)
          ? 'Empty email body'
          : undefined,
      };
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown automation action type: ${String(_exhaustive)}`);
    }
  }
};

const buildNodeContextMenuItems = ({
  canDelete = false,
  canEditSettings = true,
  canEditEmailBody = false,
  onDelete,
  onEditEmailBody,
  onPreviewEmail,
  onSelectStep,
  stepId,
}: {
  canDelete?: boolean;
  canEditSettings?: boolean;
  canEditEmailBody?: boolean;
  onDelete?: (deleteStepId: string) => void;
  onEditEmailBody?: (editEmailBodyStepId: string, mode?: EmailModalMode) => void;
  onPreviewEmail?: (previewEmailStepId: string) => void;
  onSelectStep: (nextStepId: string) => void;
  stepId: string;
}): NodeContextMenuEntry[] => {
  const items: NodeContextMenuEntry[] = canEditSettings
    ? [
        {
          icon: LucideIcon.Settings2,
          label: 'Edit settings',
          onSelect: () => onSelectStep(stepId),
        },
      ]
    : [];

  if (canEditEmailBody && onEditEmailBody) {
    items.push({
      icon: LucideIcon.Pencil,
      label: 'Edit email body',
      onSelect: () => onEditEmailBody(stepId),
    });
  }

  if (canEditEmailBody && onPreviewEmail) {
    items.push({
      icon: LucideIcon.Eye,
      label: 'Preview',
      onSelect: () => onPreviewEmail(stepId),
    });
  }

  if (canDelete && onDelete) {
    if (canEditEmailBody) {
      items.push({ id: 'before-delete', type: 'separator' });
    }
    items.push({
      icon: LucideIcon.Trash2,
      label: 'Delete',
      onSelect: () => onDelete(stepId),
      variant: 'destructive',
    });
  }

  return items;
};

// Returns the actions of `automation` ordered along the chain from the head. Throws on malformed
// data (cycle, branch, or disconnected nodes). The canvas wraps its render tree in an Error
// Boundary that catches these and renders the same "Couldn't load automation" banner.
const getInitialActionOrder = (automation: AutomationDetail): AutomationAction[] => {
  if (automation.actions.length === 0) {
    return [];
  }

  const actionsById = new Map(automation.actions.map((action) => [action.id, action]));
  const incoming = new Set(automation.edges.map((edge) => edge.target_action_id));
  const head = automation.actions.find((action) => !incoming.has(action.id));

  if (!head) {
    throw new Error(`Could not determine the starting step for automation ${automation.id}.`);
  }

  // NOTE: This doesn't handle branching automations. Our UI doesn't support
  // them either. If we revisit that, we'll need to revisit this code.

  const nextById = new Map(
    automation.edges.map((edge) => [edge.source_action_id, edge.target_action_id]),
  );
  const ordered: AutomationAction[] = [];
  const visited = new Set<string>();
  let cursor: AutomationAction | undefined = head;

  while (cursor) {
    if (visited.has(cursor.id)) {
      throw new Error(`Detected a loop in automation ${automation.id}.`);
    }
    ordered.push(cursor);
    visited.add(cursor.id);
    const nextId = nextById.get(cursor.id);
    cursor = nextId ? actionsById.get(nextId) : undefined;
  }

  if (ordered.length !== automation.actions.length) {
    throw new Error(`Some steps in automation ${automation.id} are missing or disconnected.`);
  }

  return ordered;
};

type BuildGraphParams = {
  actionErrors: Record<string, string>;
  automation: AutomationDetail;
  automationAnalyticsEnabled: boolean;
  automationRunAnalyticsEnabled: boolean;
  nodeSizes: Record<string, { width: number; height: number }>;
  newEmailWithoutWarningsId: string | null;
  onInteract: (stepId: string) => void;
  onWaitValidityChange: (stepId: string, valid: boolean) => void;
  onUpdateSubject: (stepId: string, subject: string) => void;
  onUpdateWait: (stepId: string, hours: number) => void;
  disabled: boolean;
  onDelete: (stepId: string) => void;
  onEditEmailBody: (stepId: string, mode?: EmailModalMode) => void;
  onPreviewEmail: (stepId: string) => void;
  onPick: (type: StepPickerType, anchor: CanvasAnchor) => void;
  onSelectStep: (stepId: string) => void;
  newStepId: string | null;
  selectedStepId: string | null;
};

const buildGraph = ({
  actionErrors,
  automation,
  automationAnalyticsEnabled,
  automationRunAnalyticsEnabled,
  nodeSizes,
  newEmailWithoutWarningsId,
  onInteract,
  onWaitValidityChange,
  onUpdateSubject,
  onUpdateWait,
  disabled,
  onDelete,
  onEditEmailBody,
  onPick,
  onPreviewEmail,
  onSelectStep,
  newStepId,
  selectedStepId,
}: BuildGraphParams): {
  nodes: AutomationFlowNode[];
  edges: Edge[];
  contentBounds: CanvasContentBounds;
} => {
  const ordered = getInitialActionOrder(automation);
  const layoutSizes = automationRunAnalyticsEnabled ? nodeSizes : {};
  // React Flow hides and re-measures any node passed without `measured`; while hidden, the
  // node's inputs lose focus and keystrokes.
  const nodeProps = (id: string) => ({
    draggable: false,
    selectable: false,
    connectable: false,
    focusable: false,
    measured: nodeSizes[id],
  });
  const disabledReason = disabled ? DISABLED_REASON : undefined;

  const lastActionId = ordered[ordered.length - 1]?.id;
  const tailAnchor: CanvasAnchor = {
    sourceId: lastActionId ?? TRIGGER_CANVAS_ID,
    targetId: TAIL_CANVAS_ID,
  };

  let cursorY = 0;
  const nodeWidth = automationRunAnalyticsEnabled ? EDITABLE_NODE_WIDTH : NODE_WIDTH;
  const nodeX = NODE_COLUMN_CENTER_X - nodeWidth / 2;
  const nodes: AutomationFlowNode[] = [
    {
      id: TRIGGER_CANVAS_ID,
      type: 'trigger',
      position: {
        x: nodeX,
        y: cursorY,
      },
      data: {
        fixedTrigger: automationRunAnalyticsEnabled,
        onInteract: () => onInteract(TRIGGER_CANVAS_ID),
        contextMenuItems: buildNodeContextMenuItems({
          onSelectStep,
          stepId: TRIGGER_CANVAS_ID,
        }),
        icon: LucideIcon.Zap,
        isNew: false,
        label: 'Trigger',
        value: 'Member signs up',
        selected: selectedStepId === TRIGGER_CANVAS_ID,
        onSelect: () => onSelectStep(TRIGGER_CANVAS_ID),
      },
      ...nodeProps(TRIGGER_CANVAS_ID),
    },
  ];
  cursorY +=
    (layoutSizes[TRIGGER_CANVAS_ID]?.height ??
      (automationRunAnalyticsEnabled ? FIXED_TRIGGER_NODE_HEIGHT : REGULAR_NODE_HEIGHT)) +
    NODE_VISUAL_GAP_Y;

  ordered.forEach((action) => {
    const displayData = buildActionData(action);
    const editableEmail = automationRunAnalyticsEnabled && action.type === 'send_email';
    const editableWait = automationRunAnalyticsEnabled && action.type === 'wait';
    const errorMessage = actionErrors[action.id];
    const showStatsFooter =
      automationAnalyticsEnabled &&
      action.type === 'send_email' &&
      Boolean(action.stats) &&
      (editableEmail || (!errorMessage && !displayData.warningMessage));

    nodes.push({
      id: action.id,
      type: 'step',
      position: { x: nodeX, y: cursorY },
      data: {
        ...displayData,
        ...(editableEmail
          ? {
              email: {
                subject: action.data.email_subject,
                lexical: action.data.email_lexical,
                suppressWarning: newEmailWithoutWarningsId === action.id,
                onInteract: () => onInteract(action.id),
                onUpdateSubject: (subject: string) => onUpdateSubject(action.id, subject),
                onEditContent: () => onEditEmailBody(action.id),
                onToggleAnalytics:
                  automationAnalyticsEnabled && action.stats
                    ? () => onSelectStep(action.id)
                    : undefined,
              },
            }
          : {}),
        ...(editableWait
          ? {
              wait: {
                hours: action.data.wait_hours,
                onInteract: () => onInteract(action.id),
                onValidityChange: (valid: boolean) => onWaitValidityChange(action.id, valid),
                onUpdate: (hours: number) => onUpdateWait(action.id, hours),
              },
            }
          : {}),
        contextMenuItems: buildNodeContextMenuItems({
          canEditSettings: !editableWait && !editableEmail,
          canDelete: true,
          canEditEmailBody: action.type === 'send_email',
          onDelete,
          onEditEmailBody,
          onPreviewEmail,
          onSelectStep,
          stepId: action.id,
        }),
        errorMessage,
        isNew: newStepId === action.id,
        selected: selectedStepId === action.id,
        showStatsFooter,
        onSelect: () => onSelectStep(action.id),
      },
      ...nodeProps(action.id),
    });
    let estimatedHeight = showStatsFooter ? EMAIL_NODE_WITH_STATS_HEIGHT : REGULAR_NODE_HEIGHT;
    if (editableEmail) {
      estimatedHeight = EDITABLE_EMAIL_NODE_HEIGHT;
    }
    if (editableWait) {
      estimatedHeight = EDITABLE_WAIT_NODE_HEIGHT;
    }
    cursorY += (layoutSizes[action.id]?.height ?? estimatedHeight) + NODE_VISUAL_GAP_Y;
  });

  nodes.push({
    id: TAIL_CANVAS_ID,
    type: 'tail',
    position: {
      x: nodeX,
      y: cursorY,
    },
    data: {
      disabled,
      disabledReason,
      onPick,
      anchor: tailAnchor,
      fixedExit: automationRunAnalyticsEnabled,
    },
    ...nodeProps(TAIL_CANVAS_ID),
  });
  // Content bounds in flow coordinates, derived from node positions so the pan bound keeps
  // working if the graph ever grows wider (e.g. branching).
  const xs = nodes.map((node) => node.position.x);
  const contentBounds: CanvasContentBounds = {
    left: Math.min(...xs),
    right: Math.max(
      ...nodes.map((node) => node.position.x + (layoutSizes[node.id]?.width ?? nodeWidth)),
    ),
    bottom:
      cursorY +
      (layoutSizes[TAIL_CANVAS_ID]?.height ??
        (automationRunAnalyticsEnabled ? EXIT_NODE_HEIGHT : TAIL_NODE_HEIGHT)),
  };

  // Every connecting line between existing nodes gets a circular + on hover. The trailing edge into the
  // legacy tail node has none — its rectangular button already covers that slot.
  // The fixed exit marker uses the same insertion control as the other connectors.
  const edges: Edge[] = [];
  let previousCanvasId: string = TRIGGER_CANVAS_ID;
  ordered.forEach((action) => {
    const edgeData: AddStepEdgeData = {
      sourceId: previousCanvasId,
      targetId: action.id,
      disabled,
      disabledReason,
      onPick,
    };
    edges.push({
      id: `e-${previousCanvasId}-${action.id}`,
      source: previousCanvasId,
      target: action.id,
      type: 'add-step-edge',
      focusable: false,
      data: edgeData,
    });
    previousCanvasId = action.id;
  });

  edges.push({
    id: `e-${previousCanvasId}-${TAIL_CANVAS_ID}`,
    source: previousCanvasId,
    target: TAIL_CANVAS_ID,
    type: automationRunAnalyticsEnabled ? 'add-step-edge' : 'smoothstep',
    data: automationRunAnalyticsEnabled
      ? ({
          ...tailAnchor,
          disabled,
          disabledReason,
          onPick,
          label: 'Add step',
        } satisfies AddStepEdgeData)
      : undefined,
    focusable: false,
    style: { stroke: DEFAULT_EDGE_STROKE },
  });

  return { nodes, edges, contentBounds };
};

const getInitialViewport = (canvasWidth: number): { x: number; y: number; zoom: number } => ({
  x: Math.round(canvasWidth / 2 - NODE_COLUMN_CENTER_X),
  y: INITIAL_VIEWPORT_Y,
  zoom: 1,
});

type AutomationCanvasProps = {
  actionErrors?: Record<string, string>;
  onWaitValidityChange: (stepId: string, valid: boolean) => void;
  automation?: AutomationDetail;
  isEmailNavigationBlocked?: boolean;
  isLoading: boolean;
  isError: boolean;
  onChange: (next: AutomationDetail) => void;
  selectedRunId: string | null;
  onSelectRun: (id: string | null) => void;
  onDiscardBlockedEmailNavigation?: (closeEmailModal: () => void) => void;
  onEmailDirtyChange?: (isDirty: boolean) => void;
  onKeepEditingAfterBlockedEmailNavigation?: () => void;
};

type SelectedStep = {
  id: string;
};

const insertActionByType = {
  wait: insertWaitAction,
  send_email: insertSendEmailAction,
};

const hasAutomationEmailModalState = (state: unknown): state is { automationEmailModal: boolean } =>
  !!state &&
  typeof state === 'object' &&
  'automationEmailModal' in state &&
  typeof state.automationEmailModal === 'boolean';

const AutomationCanvas: React.FC<AutomationCanvasProps> = ({
  actionErrors = {},
  onWaitValidityChange,
  automation,
  isEmailNavigationBlocked = false,
  isLoading,
  isError,
  onChange,
  selectedRunId,
  onSelectRun,
  onDiscardBlockedEmailNavigation,
  onEmailDirtyChange,
  onKeepEditingAfterBlockedEmailNavigation,
}) => {
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const layoutRef = useRef<HTMLElement>(null);
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({});
  const handleNodesChange = useCallback((changes: NodeChange<AutomationFlowNode>[]) => {
    setNodeSizes((previous) => {
      let next = previous;
      for (const change of changes) {
        if (change.type !== 'dimensions' || !change.dimensions) {
          continue;
        }
        const { width, height } = change.dimensions;
        if (next[change.id]?.width !== width || next[change.id]?.height !== height) {
          next = { ...next, [change.id]: { width, height } };
        }
      }
      return next;
    });
  }, []);
  const editingCanvasRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newEmailWithoutWarningsId, setNewEmailWithoutWarningsId] = useState<string | null>(null);
  const showWarningsForOtherSteps = useCallback((stepId: string) => {
    setNewEmailWithoutWarningsId((current) => (current === stepId ? current : null));
  }, []);
  const [newStepId, setNewStepId] = useState<string | null>(null);
  const [emailModalMode, setEmailModalMode] = useState<EmailModalMode>('edit');
  const [selectedStep, setSelectedStep] = useState<SelectedStep | null>(null);
  const [deleteConfirmationActionId, setDeleteConfirmationActionId] = useState<string | null>(null);
  const automationRunAnalyticsEnabled = useFeatureFlag('automationRunAnalytics');
  const selectedStepId = selectedStep?.id ?? null;
  const emailModalStepId = searchParams.get(EMAIL_STEP_QUERY_PARAM);
  const isRouterOpenedEmailModal =
    hasAutomationEmailModalState(location.state) && location.state.automationEmailModal;

  const removeEmailStepParam = useCallback(
    (options?: { replace?: boolean }) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete(EMAIL_STEP_QUERY_PARAM);
      setSearchParams(nextSearchParams, { replace: options?.replace ?? true });
    },
    [searchParams, setSearchParams],
  );

  const handlePick = useCallback(
    (type: StepPickerType, anchor: CanvasAnchor) => {
      if (!automation) {
        return;
      }
      if (automation.actions.length >= MAX_AUTOMATION_ACTIONS) {
        return;
      }
      const apiAnchor = toApiAnchor(anchor);
      const insertAction = insertActionByType[type];
      const next = insertAction({ detail: automation, anchor: apiAnchor });
      const insertedAction = next.actions.find(
        (action) => !automation.actions.some((existingAction) => existingAction.id === action.id),
      );
      setNewStepId(insertedAction?.id ?? null);
      setNewEmailWithoutWarningsId(
        insertedAction?.type === 'send_email' ? insertedAction.id : null,
      );
      if (insertedAction) {
        setSelectedStep(automationRunAnalyticsEnabled ? null : { id: insertedAction.id });
      }
      onChange(next);
    },
    [automation, automationRunAnalyticsEnabled, onChange],
  );

  useEffect(() => {
    if (!newStepId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setNewStepId(null);
    }, NODE_ENTER_ANIMATION_DURATION);
    return () => window.clearTimeout(timeout);
  }, [newStepId]);

  const handleDelete = useCallback(
    (actionId: string) => {
      if (!automation) {
        return;
      }
      setNewEmailWithoutWarningsId(null);
      const next = removeAction({ detail: automation, actionId });
      if (emailModalStepId === actionId) {
        removeEmailStepParam();
      }
      setSelectedStep(null);
      setDeleteConfirmationActionId(null);
      onChange(next);
    },
    [automation, emailModalStepId, onChange, removeEmailStepParam],
  );

  const handleRequestDelete = useCallback(
    (actionId: string) => {
      if (!automation) {
        return;
      }

      const action = automation.actions.find((item) => item.id === actionId);
      if (action?.type === 'send_email' && !isEmptyEmailLexical(action.data.email_lexical)) {
        setDeleteConfirmationActionId(action.id);
        return;
      }

      handleDelete(actionId);
    },
    [automation, handleDelete],
  );

  const handleUpdateWait = useCallback(
    (actionId: string, waitHours: number) => {
      if (!automation) {
        return;
      }
      onChange(updateWaitAction({ detail: automation, actionId, waitHours }));
    },
    [automation, onChange],
  );

  const handleUpdateSubject = useCallback(
    (actionId: string, subject: string) => {
      if (!automation) {
        return;
      }
      const action = automation.actions.find(
        (item): item is AutomationSendEmailAction =>
          item.id === actionId && item.type === 'send_email',
      );
      if (!action) {
        return;
      }
      onChange(
        updateSendEmailAction({
          detail: automation,
          actionId,
          emailSubject: subject,
          emailLexical: action.data.email_lexical,
        }),
      );
    },
    [automation, onChange],
  );

  const handleEditEmail = useCallback(
    (actionId: string, mode: EmailModalMode = 'edit') => {
      setEmailModalMode(mode);
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set(EMAIL_STEP_QUERY_PARAM, actionId);
      setSearchParams(nextSearchParams, {
        state: {
          ...(location.state && typeof location.state === 'object'
            ? (location.state as Record<string, unknown>)
            : {}),
          automationEmailModal: true,
        },
      });
    },
    [location.state, searchParams, setSearchParams],
  );

  const handleContextMenuEditEmail = useCallback(
    (actionId: string, mode: EmailModalMode = 'edit') => {
      setSelectedStep(null);
      handleEditEmail(actionId, mode);
    },
    [handleEditEmail],
  );

  const handleContextMenuPreviewEmail = useCallback(
    (actionId: string) => {
      handleContextMenuEditEmail(actionId, 'preview');
    },
    [handleContextMenuEditEmail],
  );

  const emailModalAction =
    emailModalStepId && automation
      ? automation.actions.find(
          (action): action is AutomationSendEmailAction =>
            action.id === emailModalStepId && action.type === 'send_email',
        )
      : undefined;

  const deleteConfirmationAction =
    automation && deleteConfirmationActionId
      ? automation.actions.find(
          (action): action is AutomationSendEmailAction =>
            action.id === deleteConfirmationActionId && action.type === 'send_email',
        )
      : undefined;

  const [selectedMember, setSelectedMember] = useState<{ runId: string; name: string } | null>(
    null,
  );
  const initialViewport = useRef(getInitialViewport(window.innerWidth));
  const automationAnalyticsEnabled = useFeatureFlag('automationAnalytics');
  const automationsTinybirdSyncEnabled = useFeatureFlag('automationsTinybirdSync');
  const isHistoryOpen = automationRunAnalyticsEnabled && selectedRunId !== null;

  useEffect(() => {
    // Opening an email via the URL returns to editing, including browser Back/Forward.
    if ((!automationRunAnalyticsEnabled || emailModalStepId) && selectedRunId) {
      onSelectRun(null);
    }
  }, [automationRunAnalyticsEnabled, emailModalStepId, selectedRunId, onSelectRun]);

  const handleSelectRun = (id: string, memberName: string) => {
    setSelectedMember({ runId: id, name: memberName });
    onSelectRun(id);
    // Below the sidebar breakpoint, show either the member list or the canvas.
    if (layoutRef.current && layoutRef.current.clientWidth < 960) {
      setIsPerformanceOpen(false);
    }
  };

  const handleCloseHistory = () => {
    onSelectRun(null);
    requestAnimationFrame(() => editingCanvasRef.current?.focus());
  };

  const graph = useMemo(() => {
    if (!automation) {
      return null;
    }
    return buildGraph({
      actionErrors,
      automation,
      automationAnalyticsEnabled,
      automationRunAnalyticsEnabled,
      nodeSizes,
      newEmailWithoutWarningsId,
      onInteract: showWarningsForOtherSteps,
      onWaitValidityChange,
      onUpdateSubject: handleUpdateSubject,
      onUpdateWait: handleUpdateWait,
      disabled: automation.actions.length >= MAX_AUTOMATION_ACTIONS,
      onDelete: handleRequestDelete,
      onEditEmailBody: handleContextMenuEditEmail,
      onPick: handlePick,
      onPreviewEmail: handleContextMenuPreviewEmail,
      onSelectStep: (id) => {
        showWarningsForOtherSteps(id);
        setSelectedStep((current) =>
          automationRunAnalyticsEnabled && current?.id === id ? null : { id },
        );
        if (automationRunAnalyticsEnabled) {
          setIsPerformanceOpen(false);
        }
      },
      newStepId,
      selectedStepId,
    });
  }, [
    actionErrors,
    automation,
    automationAnalyticsEnabled,
    automationRunAnalyticsEnabled,
    nodeSizes,
    newEmailWithoutWarningsId,
    showWarningsForOtherSteps,
    onWaitValidityChange,
    handleUpdateSubject,
    handleUpdateWait,
    handleContextMenuEditEmail,
    handleContextMenuPreviewEmail,
    handlePick,
    handleRequestDelete,
    newStepId,
    selectedStepId,
  ]);

  const viewport = useCanvasViewport<AutomationFlowNode, Edge>({
    contentBounds: graph?.contentBounds,
    initialViewport: initialViewport.current,
  });

  const clearDetail = useCallback(() => {
    setSelectedStep(null);
  }, []);

  const handleCloseEmailPerformance = useCallback(() => {
    editingCanvasRef.current
      ?.querySelector<HTMLButtonElement>('[aria-label="Hide email analytics"]')
      ?.focus({ preventScroll: true });
    clearDetail();
  }, [clearDetail]);

  useEffect(() => {
    if (
      !automationRunAnalyticsEnabled ||
      emailModalAction ||
      deleteConfirmationAction ||
      (!isPerformanceOpen && !selectedStepId)
    ) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isPerformanceOpen) {
          setIsPerformanceOpen(false);
        } else {
          handleCloseEmailPerformance();
        }
      }
    };
    // Menus, popovers, and search consume Escape before it reaches window.
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    automationRunAnalyticsEnabled,
    handleCloseEmailPerformance,
    deleteConfirmationAction,
    emailModalAction,
    isPerformanceOpen,
    selectedStepId,
  ]);

  const closeEmailModal = () => {
    setEmailModalMode('edit');
    if (isRouterOpenedEmailModal) {
      navigate(-1);
      return;
    }

    removeEmailStepParam();
  };

  const closeEmailModalWithoutHistoryNavigation = useCallback(() => {
    setEmailModalMode('edit');
    removeEmailStepParam();
  }, [removeEmailStepParam]);

  useEffect(() => {
    if (!automation || !emailModalStepId) {
      return;
    }

    const hasEmailAction = automation.actions.some(
      (action) => action.id === emailModalStepId && action.type === 'send_email',
    );
    if (!hasEmailAction) {
      removeEmailStepParam();
    }
  }, [automation, emailModalStepId, removeEmailStepParam]);

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: AutomationFlowNode) => {
      event.stopPropagation();
      if (!automation || node.id === TAIL_CANVAS_ID || node.id === TRIGGER_CANVAS_ID) {
        return;
      }
      if (('email' in node.data && node.data.email) || ('wait' in node.data && node.data.wait)) {
        return;
      }
      const action = automation.actions.find((item) => item.id === node.id);
      if (action?.type === 'send_email') {
        handleEditEmail(action.id);
      }
    },
    [automation, handleEditEmail],
  );

  if (isLoading) {
    return (
      <div
        className="flex flex-1 items-center justify-center bg-surface-page"
        data-testid="automation-canvas-loading"
      >
        <LoadingIndicator size="lg" />
      </div>
    );
  }

  if (isError || !automation || !graph) {
    return (
      <div className="flex flex-1 items-start justify-center bg-surface-page px-4 py-8">
        <Banner className="max-w-md" role="alert" variant="destructive">
          <div className="flex items-start gap-3">
            <LucideIcon.CircleAlert className="mt-0.5 size-5 text-red" />
            <div>
              <strong className="block">Couldn&apos;t load automation</strong>
              <p className="text-sm text-muted-foreground">Try refreshing the page.</p>
            </div>
          </div>
        </Banner>
      </div>
    );
  }

  return (
    <Inline
      ref={layoutRef}
      align="stretch"
      className="@container/automation relative min-h-0 flex-1 overflow-hidden bg-background"
      data-testid="automation-canvas"
      gap="none"
    >
      {automationRunAnalyticsEnabled && automationsTinybirdSyncEnabled && (
        <PerformanceSidebar
          automationId={automation.id}
          isOpen={isPerformanceOpen}
          isRunSelectionDisabled={Boolean(emailModalAction) || Boolean(deleteConfirmationAction)}
          selectedRunId={selectedRunId}
          onOpenChange={(open) => {
            setIsPerformanceOpen(open);
            if (open) {
              clearDetail();
            }
          }}
          onSelectRun={handleSelectRun}
        />
      )}
      <Box
        ref={viewport.measureCanvas}
        className={cn(
          'relative min-w-0 flex-1',
          isPerformanceOpen && '@max-[960px]/automation:invisible',
        )}
      >
        <Box
          ref={(element) => {
            editingCanvasRef.current = element;
            if (element) {
              element.inert = isHistoryOpen;
            }
          }}
          aria-hidden={isHistoryOpen}
          aria-label="Editing canvas"
          className={isHistoryOpen ? 'invisible absolute inset-0' : 'absolute inset-0'}
          role="region"
          tabIndex={-1}
        >
          <ReactFlow
            className="[--xy-background-color:var(--preview-canvas)] [--xy-edge-stroke:var(--border-default)]"
            defaultViewport={initialViewport.current}
            edges={graph.edges}
            edgesFocusable={false}
            edgeTypes={edgeTypes}
            maxZoom={CANVAS_ZOOM_CONFIG.maxZoom}
            minZoom={CANVAS_ZOOM_CONFIG.minZoom}
            nodes={graph.nodes}
            nodesConnectable={false}
            nodesDraggable={false}
            nodesFocusable={false}
            nodeTypes={nodeTypes}
            proOptions={{ hideAttribution: true }}
            translateExtent={viewport.translateExtent}
            zoomOnDoubleClick={false}
            zoomOnScroll={false}
            panOnScroll
            onInit={viewport.onInit}
            onMove={viewport.onMove}
            onNodeClick={(event, node) => {
              if (event.button !== 0) {
                return;
              }
              if (
                node.id !== TAIL_CANVAS_ID &&
                !(automationRunAnalyticsEnabled && node.id === TRIGGER_CANVAS_ID) &&
                !('email' in node.data && node.data.email) &&
                !('wait' in node.data && node.data.wait)
              ) {
                showWarningsForOtherSteps(node.id);
                setSelectedStep({ id: node.id });
              }
            }}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodesChange={handleNodesChange}
            onPaneClick={automationRunAnalyticsEnabled ? undefined : clearDetail}
          >
            <Background {...canvasBackground} variant={BackgroundVariant.Dots} />
            <AutomationCanvasControls />
          </ReactFlow>
        </Box>
        {isHistoryOpen && (
          <RunHistory
            key={selectedRunId}
            automationId={automation.id}
            automationSlug={automation.slug}
            isPerformanceOpen={isPerformanceOpen}
            memberName={selectedMember?.runId === selectedRunId ? selectedMember.name : undefined}
            runId={selectedRunId}
            onClose={handleCloseHistory}
          />
        )}
      </Box>
      {/* The redesigned editor exposes settings in its cards and performance in this panel. */}
      <Box className={isHistoryOpen ? 'hidden' : 'contents'}>
        {automationRunAnalyticsEnabled ? (
          !isHistoryOpen && (
            <EmailPerformanceSidebar
              automationId={automation.id}
              email={
                automationAnalyticsEnabled
                  ? automation.actions.find(
                      (action): action is AutomationSendEmailAction =>
                        action.id === selectedStepId && action.type === 'send_email',
                    )
                  : undefined
              }
              onClose={handleCloseEmailPerformance}
            />
          )
        ) : (
          <StepSidebar
            automation={automation}
            isEmailModalOpen={Boolean(emailModalAction) || Boolean(deleteConfirmationAction)}
            stepId={selectedStepId}
            onClose={clearDetail}
            onDelete={handleRequestDelete}
            onEditEmail={handleEditEmail}
            onUpdateSubject={handleUpdateSubject}
            onUpdateWait={handleUpdateWait}
          />
        )}
      </Box>
      {emailModalAction && automation && (
        <EmailContentModal
          automationId={automation.id}
          initialLexical={emailModalAction.data.email_lexical}
          initialMode={emailModalMode}
          initialSubject={emailModalAction.data.email_subject}
          isDiscardNavigationBlocked={isEmailNavigationBlocked}
          onClose={closeEmailModal}
          onDirtyChange={onEmailDirtyChange}
          onDiscardBlockedNavigation={() =>
            onDiscardBlockedEmailNavigation?.(closeEmailModalWithoutHistoryNavigation)
          }
          onKeepEditingAfterBlockedNavigation={onKeepEditingAfterBlockedEmailNavigation}
          onSave={({ subject, lexical }) => {
            onChange(
              updateSendEmailAction({
                detail: automation,
                actionId: emailModalAction.id,
                emailSubject: subject,
                emailLexical: lexical,
              }),
            );
          }}
        />
      )}
      <AlertDialog
        open={Boolean(deleteConfirmationAction)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmationActionId(null);
          }
        }}
      >
        <AlertDialogContent onEscapeKeyDown={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email?</AlertDialogTitle>
            <AlertDialogDescription>
              This email will be removed from the automation. Save or publish the automation to
              apply this change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmationAction) {
                  handleDelete(deleteConfirmationAction.id);
                }
              }}
            >
              Delete email
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Inline>
  );
};

export default AutomationCanvas;
