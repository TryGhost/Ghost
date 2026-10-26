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
import type { AutomationFlowNode, CanvasAnchor, NodeContextMenuEntry } from './nodes';
import { Background, BackgroundVariant, ReactFlow } from '@xyflow/react';
import type { Edge, NodeChange } from '@xyflow/react';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { Box, Inline } from '@tryghost/shade/primitives';
import { RunHistory } from './run-history';
import { canvasBackground } from './canvas-background';
import { AutomationSidebar } from './automation-sidebar';
import type { TriggerData } from './trigger-card';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import { type StepPickerType } from './step-picker';
import { isEmptyEmailLexical } from '@/automations/utils';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useLocation, useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import type { EmailModalMode } from '@/automations/components/types';
import { CANVAS_ZOOM_CONFIG, useCanvasViewport } from './use-canvas-viewport';
import type { CanvasContentBounds } from './use-canvas-viewport';
import {
  isCanvasCard,
  isCanvasCardV2,
  isConceptA,
  isConceptF,
  useConcept,
  useShowEditMarkers,
} from '@/automations/concepts/concept';
import {
  hasEmailChanged,
  hasStepChanged,
  type PendingChangesKind,
  type StepChangeKind,
} from '@/automations/concepts/pending-changes';

const NODE_X = 0;
const NODE_WIDTH = 256;
const NODE_COLUMN_CENTER_X = NODE_X + NODE_WIDTH / 2;
// Visible space between node bottom and the next node's top. Constant across all pairs so the
// chain reads as evenly spaced regardless of how tall any individual node renders.
const NODE_VISUAL_GAP_Y = 112;
// Initial height estimates; React Flow measurements replace these once mounted,
// keeping the visible gap uniform as content and validation messages change.
const EDITABLE_NODE_WIDTH = 400;
const EDITABLE_EMAIL_NODE_HEIGHT = 350;
const EDITABLE_WAIT_NODE_HEIGHT = 144;
const FIXED_TRIGGER_NODE_HEIGHT = 156;
const EXIT_NODE_HEIGHT = 55;
const INITIAL_VIEWPORT_Y = 40;
// The pane reaches up behind the editor's header (h-14), so a header sliding in
// reveals canvas rather than an empty band.
const HEADER_UNDERLAP_Y = 56;
const NODE_ENTER_ANIMATION_DURATION = 250;
const DISABLED_REASON = 'Maximum steps added';
const DEFAULT_EDGE_STROKE = 'var(--xy-edge-stroke)';
export const EMAIL_STEP_QUERY_PARAM = 'emailStep';

const edgeTypes = {
  'add-step-edge': AddStepEdge,
};

const buildNodeContextMenuItems = ({
  canDelete = false,
  canEditEmailBody = false,
  onDelete,
  onEditEmailBody,
  onPreviewEmail,
  compact = false,
  onUndoChanges,
  stepId,
}: {
  canDelete?: boolean;
  canEditEmailBody?: boolean;
  onDelete?: (deleteStepId: string) => void;
  onEditEmailBody?: (editEmailBodyStepId: string, mode?: EmailModalMode) => void;
  onPreviewEmail?: (previewEmailStepId: string) => void;
  // NY-1715 concept E: the card itself opens and previews the email, so the menu skips those
  // (and the rule above Delete), and gains "Discard changes" while the step has some.
  compact?: boolean;
  onUndoChanges?: () => void;
  stepId: string;
}): NodeContextMenuEntry[] => {
  const items: NodeContextMenuEntry[] = [];

  if (canEditEmailBody && onEditEmailBody && !compact) {
    items.push({
      icon: LucideIcon.Pencil,
      label: 'Edit email body',
      onSelect: () => onEditEmailBody(stepId),
    });
  }

  if (canEditEmailBody && onPreviewEmail && !compact) {
    items.push({
      icon: LucideIcon.Eye,
      label: 'Preview',
      onSelect: () => onPreviewEmail(stepId),
    });
  }

  if (onUndoChanges) {
    // The header's "Discard all changes", for one step.
    items.push({ icon: LucideIcon.Undo2, label: 'Discard changes', onSelect: onUndoChanges });
  }

  if (canDelete && onDelete) {
    if (canEditEmailBody && !compact) {
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
  // Draw the line to the exit card and bring the card in, for a flow just created.
  connectIn: boolean;
  automation: AutomationDetail;
  savedTriggerTierIds: readonly string[];
  // NY-1715 concepts: set to mark steps that differ from the last save.
  savedActionsForMarks: readonly AutomationAction[] | undefined;
  tierQuery: TriggerData['tierQuery'];
  onChange: (next: AutomationDetail) => void;
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
  newStepId: string | null;
  // NY-1715 concept E: set to offer a revert beside steps with unsaved changes.
  onRevertStep?: (stepId: string) => void;
  // NY-1715 concept F: saved steps deleted since the last save, shown until it.
  pendingDeleteIds?: ReadonlySet<string>;
  // NY-1715 concept E: steps offer "Discard changes" in their ⋯ menu.
  offersRevertInMenu?: boolean;
};

const buildGraph = ({
  actionErrors,
  connectIn,
  automation,
  savedTriggerTierIds,
  savedActionsForMarks,
  tierQuery,
  onChange,
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
  newStepId,
  onRevertStep,
  pendingDeleteIds,
  offersRevertInMenu = false,
}: BuildGraphParams): {
  nodes: AutomationFlowNode[];
  edges: Edge[];
  contentBounds: CanvasContentBounds;
} => {
  const ordered = getInitialActionOrder(automation);
  // React Flow hides and re-measures any node passed without `measured`; while hidden, the
  // node's inputs lose focus and keystrokes.
  const nodeProps = (id: string) => ({
    draggable: false,
    selectable: false,
    connectable: false,
    focusable: false,
    measured: nodeSizes[id],
    // React Flow disables pointer events on nodes that aren't selectable or clicked.
    style: { pointerEvents: 'all' as const },
  });
  const disabledReason = disabled ? DISABLED_REASON : undefined;

  let cursorY = 0;
  const nodeWidth = EDITABLE_NODE_WIDTH;
  const nodeX = NODE_COLUMN_CENTER_X - nodeWidth / 2;
  const nodes: AutomationFlowNode[] = [
    {
      id: TRIGGER_CANVAS_ID,
      type: 'trigger',
      // Keep the inline tier picker above downstream cards.
      zIndex: 1,
      position: {
        x: nodeX,
        y: cursorY,
      },
      data: {
        trigger: {
          tierQuery,
          scope: automation.trigger_tier_scope,
          tierIds: automation.trigger_tier_ids ?? [],
          savedTierIds: savedTriggerTierIds,
          onUpdate: (trigger) => onChange({ ...automation, ...trigger }),
        },
        errorMessage: actionErrors[TRIGGER_CANVAS_ID],
        onInteract: () => onInteract(TRIGGER_CANVAS_ID),
      },
      ...nodeProps(TRIGGER_CANVAS_ID),
    },
  ];
  cursorY +=
    (nodeSizes[TRIGGER_CANVAS_ID]?.height ?? FIXED_TRIGGER_NODE_HEIGHT) + NODE_VISUAL_GAP_Y;

  // E: the marker's revert, for a changed step the last save has (a new one has nothing to
  // go back to; its menu deletes it).
  const revertLabel = automation.status === 'active' ? 'Revert to published' : 'Revert to saved';
  // E: what the yellow dot means, on hovering it.
  const unsavedHint = automation.status === 'active' ? 'Unpublished changes' : 'Unsaved changes';
  ordered.forEach((action) => {
    const editableEmail = action.type === 'send_email';
    const editableWait = action.type === 'wait';
    const errorMessage = actionErrors[action.id];
    const deleted = pendingDeleteIds?.has(action.id) ?? false;
    const modified =
      deleted || (savedActionsForMarks ? hasStepChanged(action, savedActionsForMarks) : false);
    const isSaved = savedActionsForMarks?.some((saved) => saved.id === action.id) ?? false;
    const changeKind: StepChangeKind = deleted ? 'deleted' : isSaved ? 'updated' : 'added';
    const revert =
      onRevertStep && modified && isSaved
        ? { onRevert: () => onRevertStep(action.id), revertLabel }
        : {};

    nodes.push({
      id: action.id,
      type: 'step',
      position: { x: nodeX, y: cursorY },
      data: {
        analytics:
          action.type === 'send_email' && action.stats
            ? { automationId: automation.id, actionId: action.id, stats: action.stats }
            : undefined,
        ...(editableEmail
          ? {
              email: {
                subject: action.data.email_subject,
                lexical: action.data.email_lexical,
                suppressWarning: newEmailWithoutWarningsId === action.id,
                onInteract: () => onInteract(action.id),
                onUpdateSubject: (subject: string) => onUpdateSubject(action.id, subject),
                onEditContent: () => onEditEmailBody(action.id),
                deleted,
                changeKind,
                unsavedHint,
                ...revert,
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
                deleted,
                changeKind,
                unsavedHint,
                ...revert,
              },
            }
          : {}),
        contextMenuItems: buildNodeContextMenuItems({
          canDelete: true,
          canEditEmailBody: action.type === 'send_email',
          onDelete,
          onEditEmailBody,
          onPreviewEmail: automation.id ? onPreviewEmail : undefined,
          compact: offersRevertInMenu,
          // E: only while the step differs from its last save (and has one to go back to).
          onUndoChanges:
            offersRevertInMenu && onRevertStep && modified && isSaved
              ? () => onRevertStep(action.id)
              : undefined,
          stepId: action.id,
        }),
        errorMessage,
        isNew: newStepId === action.id,
        modified,
      },
      ...nodeProps(action.id),
    });
    const estimatedHeight = editableEmail ? EDITABLE_EMAIL_NODE_HEIGHT : EDITABLE_WAIT_NODE_HEIGHT;
    cursorY += (nodeSizes[action.id]?.height ?? estimatedHeight) + NODE_VISUAL_GAP_Y;
  });

  nodes.push({
    id: TAIL_CANVAS_ID,
    type: 'tail',
    position: {
      x: nodeX,
      y: cursorY,
    },
    data: { connectIn },
    ...nodeProps(TAIL_CANVAS_ID),
  });
  // Content bounds in flow coordinates, derived from node positions so the pan bound keeps
  // working if the graph ever grows wider (e.g. branching).
  const xs = nodes.map((node) => node.position.x);
  const contentBounds: CanvasContentBounds = {
    left: Math.min(...xs),
    right: Math.max(
      ...nodes.map((node) => node.position.x + (nodeSizes[node.id]?.width ?? nodeWidth)),
    ),
    bottom: cursorY + (nodeSizes[TAIL_CANVAS_ID]?.height ?? EXIT_NODE_HEIGHT),
  };

  // Every connecting line, including the edge to the exit marker, has an insertion control.
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
    type: 'add-step-edge',
    data: {
      sourceId: ordered[ordered.length - 1]?.id ?? TRIGGER_CANVAS_ID,
      targetId: TAIL_CANVAS_ID,
      disabled,
      disabledReason,
      onPick,
      label: 'Add step',
      connectIn,
    } satisfies AddStepEdgeData,
    focusable: false,
    style: { stroke: DEFAULT_EDGE_STROKE },
  });

  // Controlled nodes must carry their measured dimensions through graph
  // updates. Otherwise React Flow hides them for remeasurement, blurring
  // focused inputs and removing the handles that keep edge menus mounted.
  const measuredNodes = nodes.map((node) =>
    nodeSizes[node.id] ? { ...node, measured: nodeSizes[node.id] } : node,
  );
  return { nodes: measuredNodes, edges, contentBounds };
};

const getInitialViewport = (
  canvasWidth: number,
  triggerTop = INITIAL_VIEWPORT_Y,
): { x: number; y: number; zoom: number } => ({
  x: Math.round(canvasWidth / 2 - NODE_COLUMN_CENTER_X),
  y: triggerTop + HEADER_UNDERLAP_Y,
  zoom: 1,
});

type AutomationCanvasProps = {
  initialSidebar: 'unknown' | 'closed' | 'settings' | 'performance';
  // Set when a trigger was just picked: the canvas opens with the trigger where the
  // picker's card was, and the flow below it plays in.
  initialTriggerTop?: number;
  actionErrors?: Record<string, string>;
  onWaitValidityChange: (stepId: string, valid: boolean) => void;
  automation?: AutomationDetail;
  savedTriggerTierIds?: readonly string[];
  isEmailNavigationBlocked?: boolean;
  isLoading: boolean;
  isError: boolean;
  onChange: (next: AutomationDetail) => void;
  selectedRunId: string | null;
  onSelectRun: (id: string | null) => void;
  onDiscardBlockedEmailNavigation?: (closeEmailModal: () => void) => void;
  onEmailDirtyChange?: (isDirty: boolean) => void;
  // NY-1715 concepts: the automation's unsaved/unpublished state, shown in the email editor.
  emailEditorPendingChanges?: PendingChangesKind | null;
  // NY-1715 concept C: the changes bar, shown below the email editor while it's open.
  emailEditorFooter?: React.ReactNode;
  // NY-1715 concepts D and E: changes when Discard (or its Undo) swaps the automation.
  emailEditorResetKey?: number;
  // NY-1715 concept E: reverts one step to the last save.
  onRevertStep?: (stepId: string) => void;
  // NY-1715 concept F: deleting a saved step marks it (pendingDeleteIds) until the next save.
  onDeleteSavedStep?: (stepId: string) => void;
  pendingDeleteIds?: ReadonlySet<string>;
  // NY-1715 concepts: the last-saved steps, so the email editor's indicator covers its own
  // email only.
  savedActions?: readonly AutomationAction[];
  onKeepEditingAfterBlockedEmailNavigation?: () => void;
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
  initialSidebar,
  initialTriggerTop,
  actionErrors = {},
  savedTriggerTierIds = [],
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
  emailEditorPendingChanges = null,
  emailEditorFooter,
  emailEditorResetKey,
  onRevertStep,
  onDeleteSavedStep,
  pendingDeleteIds,
  savedActions,
  onKeepEditingAfterBlockedEmailNavigation,
}) => {
  const layoutRef = useRef<HTMLElement>(null);
  const concept = useConcept();
  const showEditMarkers = useShowEditMarkers();
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
  const [deleteConfirmationActionId, setDeleteConfirmationActionId] = useState<string | null>(null);
  const triggerTierScope = automation?.trigger_tier_scope;
  let tiersEnabled: boolean;
  switch (triggerTierScope) {
    case 'all_paid':
    case 'selected_paid':
      tiersEnabled = true;
      break;
    case 'free':
    case null:
    case undefined:
      tiersEnabled = false;
      break;
    default: {
      const _exhaustive: never = triggerTierScope;
      throw new Error(`Unknown automation trigger scope: ${String(_exhaustive)}`);
    }
  }
  const {
    data: tierData,
    isLoading: tiersLoading,
    isError: tiersError,
    refetch: refetchTiers,
  } = useBrowseTiers({
    searchParams: { filter: 'type:paid', limit: 'all' },
    defaultErrorHandler: false,
    enabled: tiersEnabled,
  });
  const tierQuery = useMemo(
    () => ({ data: tierData, isLoading: tiersLoading, isError: tiersError, refetch: refetchTiers }),
    [tierData, tiersLoading, tiersError, refetchTiers],
  );
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
      onChange(next);
    },
    [automation, onChange],
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
      // F: a saved step is only marked, so it can come back until the next save; no confirm.
      if (onDeleteSavedStep && savedActions?.some((saved) => saved.id === actionId)) {
        onDeleteSavedStep(actionId);
        return;
      }

      const action = automation.actions.find((item) => item.id === actionId);
      if (action?.type === 'send_email' && !isEmptyEmailLexical(action.data.email_lexical)) {
        setDeleteConfirmationActionId(action.id);
        return;
      }

      handleDelete(actionId);
    },
    [automation, handleDelete, onDeleteSavedStep, savedActions],
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

  const handlePreviewEmail = useCallback(
    (actionId: string) => {
      handleEditEmail(actionId, 'preview');
    },
    [handleEditEmail],
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
  const configQuery = useBrowseConfig();
  const isPerformanceEnabled = Boolean(configQuery.data?.config.stats);
  const [sidebar, setSidebar] = useState<{
    open: boolean;
    tab: 'unknown' | 'settings' | 'performance';
  }>({ open: false, tab: 'unknown' });
  // Resolve once after loading; later updates must not override user choices.
  if (sidebar.tab === 'unknown' && initialSidebar !== 'unknown') {
    setSidebar({
      open: initialSidebar !== 'closed',
      tab:
        initialSidebar === 'closed'
          ? isPerformanceEnabled && automation?.id
            ? 'performance'
            : 'settings'
          : initialSidebar,
    });
  }
  const setAutomationSidebarOpen = useCallback((open: boolean) => {
    setSidebar((current) => ({
      open,
      tab: current.tab === 'unknown' ? 'settings' : current.tab,
    }));
  }, []);
  const initialViewport = getInitialViewport(
    window.innerWidth - (sidebar.open && window.innerWidth >= 960 ? 480 : 0),
    initialTriggerTop,
  );
  const isHistoryOpen = selectedRunId !== null;

  useEffect(() => {
    // Opening an email via the URL returns to editing, including browser Back/Forward.
    if (emailModalStepId && selectedRunId) {
      onSelectRun(null);
    }
  }, [emailModalStepId, selectedRunId, onSelectRun]);

  const handleSelectRun = (id: string, memberName: string) => {
    setSelectedMember({ runId: id, name: memberName });
    onSelectRun(id);
    // Below the sidebar breakpoint, show either the member list or the canvas.
    if (layoutRef.current && layoutRef.current.clientWidth < 960) {
      setAutomationSidebarOpen(false);
    }
  };

  const handleCloseHistory = () => {
    onSelectRun(null);
    requestAnimationFrame(() => editingCanvasRef.current?.focus());
  };

  // Only for the edges and card that first appear; later ones arrive as usual.
  const [connecting, setConnecting] = useState(initialTriggerTop !== undefined);
  useEffect(() => {
    if (!connecting) {
      return;
    }
    const timer = setTimeout(() => setConnecting(false), 500);
    return () => clearTimeout(timer);
  }, [connecting]);

  const graph = useMemo(() => {
    if (!automation) {
      return null;
    }
    return buildGraph({
      actionErrors,
      connectIn: connecting,
      automation,
      savedTriggerTierIds,
      savedActionsForMarks: isConceptA(concept) && showEditMarkers ? savedActions : undefined,
      tierQuery,
      onChange,
      nodeSizes,
      newEmailWithoutWarningsId,
      onInteract: showWarningsForOtherSteps,
      onWaitValidityChange,
      onUpdateSubject: handleUpdateSubject,
      onUpdateWait: handleUpdateWait,
      // F: steps waiting to be deleted don't count towards the limit.
      disabled: automation.actions.length - (pendingDeleteIds?.size ?? 0) >= MAX_AUTOMATION_ACTIONS,
      onDelete: handleRequestDelete,
      onEditEmailBody: handleEditEmail,
      onPick: handlePick,
      onPreviewEmail: handlePreviewEmail,
      newStepId,
      onRevertStep,
      pendingDeleteIds,
      offersRevertInMenu: isCanvasCardV2(concept) && !isConceptF(concept),
    });
  }, [
    actionErrors,
    connecting,
    savedTriggerTierIds,
    concept,
    savedActions,
    showEditMarkers,
    tierQuery,
    onChange,
    automation,
    nodeSizes,
    newEmailWithoutWarningsId,
    showWarningsForOtherSteps,
    onWaitValidityChange,
    handleUpdateSubject,
    handleUpdateWait,
    handleEditEmail,
    handlePreviewEmail,
    handlePick,
    handleRequestDelete,
    newStepId,
    onRevertStep,
    pendingDeleteIds,
  ]);

  const viewport = useCanvasViewport<AutomationFlowNode, Edge>({
    contentBounds: graph?.contentBounds,
    initialViewport,
  });

  useEffect(() => {
    if (emailModalAction || deleteConfirmationAction || !sidebar.open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAutomationSidebarOpen(false);
      }
    };
    // Menus, popovers, and search consume Escape before it reaches window.
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteConfirmationAction, emailModalAction, sidebar.open, setAutomationSidebarOpen]);

  // NY-1715 concept A3: the email editor clears the canvas, so an open sidebar slides away
  // as the editor opens and comes back as it closes, both in step with the editor. Nothing
  // the publisher opened stays closed.
  const clearsCanvas = isCanvasCard(concept);
  const sidebarOpenBeforeEmailRef = useRef<boolean | null>(null);
  const isEmailModalOpen = Boolean(emailModalAction);
  useEffect(() => {
    if (isEmailModalOpen && clearsCanvas && sidebarOpenBeforeEmailRef.current === null) {
      sidebarOpenBeforeEmailRef.current = sidebar.open;
      if (sidebar.open) {
        setAutomationSidebarOpen(false);
      }
    } else if (!isEmailModalOpen && sidebarOpenBeforeEmailRef.current !== null) {
      if (sidebarOpenBeforeEmailRef.current) {
        setAutomationSidebarOpen(true);
      }
      sidebarOpenBeforeEmailRef.current = null;
    }
  }, [clearsCanvas, isEmailModalOpen, sidebar.open, setAutomationSidebarOpen]);
  // As the editor starts to shrink back into the card. `false` rather than null keeps the
  // effect above from closing the sidebar again while the editor finishes closing.
  const handleEmailEditorCloseStart = useCallback(() => {
    if (sidebarOpenBeforeEmailRef.current) {
      setAutomationSidebarOpen(true);
      sidebarOpenBeforeEmailRef.current = false;
    }
  }, [setAutomationSidebarOpen]);

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
        className="-mt-14 flex flex-1 items-center justify-center bg-surface-page pt-14"
        data-testid="automation-canvas-loading"
      >
        <div className="delayed-fade-in">
          <LoadingIndicator size="lg" />
        </div>
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
      className="@container/automation relative min-h-0 flex-1 overflow-x-clip bg-background"
      data-testid="automation-canvas"
      gap="none"
    >
      <AutomationSidebar
        automationId={automation.id}
        description={automation.description}
        isOpen={sidebar.open}
        isRunSelectionDisabled={Boolean(emailModalAction) || Boolean(deleteConfirmationAction)}
        metadata={isHistoryOpen ? 'readonly' : 'editable'}
        performanceEnabled={isPerformanceEnabled}
        selectedRunId={selectedRunId}
        selectedTab={sidebar.tab === 'unknown' ? 'settings' : sidebar.tab}
        tiers={tierData?.tiers ?? []}
        triggerTierIds={automation.trigger_tier_ids ?? []}
        triggerTierScope={automation.trigger_tier_scope}
        onDescriptionChange={(description) => onChange({ ...automation, description })}
        onOpenChange={setAutomationSidebarOpen}
        onSelectRun={handleSelectRun}
        onTabChange={(tab) => setSidebar((current) => ({ ...current, tab }))}
      />
      <Box
        ref={viewport.measureCanvas}
        className={cn(
          'relative min-w-0 flex-1',
          sidebar.open && '@max-[960px]/automation:invisible',
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
          {/* Only the pane reaches up behind the header; the region keeps the visible bounds */}
          <Box className="absolute inset-x-0 -top-14 bottom-0">
            <ReactFlow
              className="[--xy-background-color:var(--preview-canvas)] [--xy-edge-stroke:var(--border-default)]"
              defaultViewport={initialViewport}
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
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodesChange={handleNodesChange}
            >
              <Background {...canvasBackground} variant={BackgroundVariant.Dots} />
              <AutomationCanvasControls />
            </ReactFlow>
          </Box>
        </Box>
        {isHistoryOpen && (
          <RunHistory
            key={selectedRunId}
            automationId={automation.id}
            automationSlug={automation.slug}
            isAutomationSidebarOpen={sidebar.open}
            memberName={selectedMember?.runId === selectedRunId ? selectedMember.name : undefined}
            runId={selectedRunId}
            onClose={handleCloseHistory}
          />
        )}
      </Box>
      {emailModalAction && automation && (
        <EmailContentModal
          automationId={automation.id}
          emailChangeKind={
            savedActions?.some((saved) => saved.id === emailModalAction.id) ? 'updated' : 'added'
          }
          footer={emailEditorFooter}
          initialLexical={emailModalAction.data.email_lexical}
          initialMode={emailModalMode}
          initialSubject={emailModalAction.data.email_subject}
          isDiscardNavigationBlocked={isEmailNavigationBlocked}
          isEmailModified={
            showEditMarkers && !!savedActions && hasEmailChanged(emailModalAction, savedActions)
          }
          originStepId={emailModalAction.id}
          pendingChanges={
            emailEditorPendingChanges &&
            (!savedActions || hasEmailChanged(emailModalAction, savedActions))
              ? emailEditorPendingChanges
              : null
          }
          resetKey={emailEditorResetKey}
          revertLabel={automation.status === 'active' ? 'Revert to published' : 'Revert to saved'}
          unsavedHint={automation.status === 'active' ? 'Unpublished changes' : 'Unsaved changes'}
          onClose={closeEmailModal}
          onCloseStart={handleEmailEditorCloseStart}
          onDirtyChange={onEmailDirtyChange}
          onDiscardBlockedNavigation={() =>
            onDiscardBlockedEmailNavigation?.(closeEmailModalWithoutHistoryNavigation)
          }
          onKeepEditingAfterBlockedNavigation={onKeepEditingAfterBlockedEmailNavigation}
          onRevert={
            onRevertStep && savedActions?.some((saved) => saved.id === emailModalAction.id)
              ? () => onRevertStep(emailModalAction.id)
              : undefined
          }
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
