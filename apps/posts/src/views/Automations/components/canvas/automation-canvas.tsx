import '@xyflow/react/dist/style.css';
import AddStepEdge, {type AddStepEdgeData} from './add-step-edge';
import EmailContentModal from '../email-modal/email-content-modal';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Banner, Button, LoadingIndicator} from '@tryghost/shade/components';
import {AutomationAction, AutomationDetail, AutomationSendEmailAction, MAX_AUTOMATION_ACTIONS, insertSendEmailAction, insertWaitAction, removeAction, updateSendEmailAction, updateWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {AutomationCanvasControls} from './controls';
import {AutomationFlowNode, CanvasAnchor, NodeContextMenuEntry, StepNodeDisplayData, TAIL_CANVAS_ID, TRIGGER_CANVAS_ID, nodeTypes, toApiAnchor} from './nodes';
import {Background, BackgroundVariant, Edge, ReactFlow} from '@xyflow/react';
import {LucideIcon} from '@tryghost/shade/utils';
import {type StepPickerType} from './step-picker';
import {StepSidebar} from './step-sidebar';
import {formatWait} from './format-wait';
import {isEmptyEmailLexical} from '../../utils';
import {useLocation, useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
import type {EmailModalMode} from '../types';

const NODE_X = 0;
const NODE_WIDTH = 256;
const NODE_COLUMN_CENTER_X = NODE_X + (NODE_WIDTH / 2);
const NODE_GAP_Y = 180;
const INITIAL_VIEWPORT_Y = 40;
const NODE_ENTER_ANIMATION_DURATION = 250;
const DISABLED_REASON = 'Maximum steps added';
const DEFAULT_EDGE_STROKE = 'var(--xy-edge-stroke)';
export const EMAIL_STEP_QUERY_PARAM = 'emailStep';

const edgeTypes = {
    'add-step-edge': AddStepEdge
};

const buildActionData = (action: AutomationAction): StepNodeDisplayData => {
    switch (action.type) {
    case 'wait':
        return {icon: LucideIcon.Clock, label: 'Wait', value: formatWait(action.data.wait_hours)};
    case 'send_email':
        return {
            icon: LucideIcon.Mail,
            isPlaceholderValue: !action.data.email_subject,
            label: 'Send email',
            value: action.data.email_subject || 'Untitled',
            warningMessage: isEmptyEmailLexical(action.data.email_lexical) ? 'Empty email body' : undefined
        };
    default: {
        const _exhaustive: never = action;
        throw new Error(`Unknown automation action type: ${_exhaustive}`);
    }
    }
};

const buildNodeContextMenuItems = ({
    canDelete = false,
    canEditEmailBody = false,
    onDelete,
    onEditEmailBody,
    onPreviewEmail,
    onSelectStep,
    stepId
}: {
    canDelete?: boolean;
    canEditEmailBody?: boolean;
    onDelete?: (deleteStepId: string) => void;
    onEditEmailBody?: (editEmailBodyStepId: string, mode?: EmailModalMode) => void;
    onPreviewEmail?: (previewEmailStepId: string) => void;
    onSelectStep: (nextStepId: string) => void;
    stepId: string;
}): NodeContextMenuEntry[] => {
    const items: NodeContextMenuEntry[] = [{
        icon: LucideIcon.Settings2,
        label: 'Edit settings',
        onSelect: () => onSelectStep(stepId)
    }];

    if (canEditEmailBody && onEditEmailBody) {
        items.push({
            icon: LucideIcon.Pencil,
            label: 'Edit email body',
            onSelect: () => onEditEmailBody(stepId)
        });
    }

    if (canEditEmailBody && onPreviewEmail) {
        items.push({
            icon: LucideIcon.Eye,
            label: 'Preview',
            onSelect: () => onPreviewEmail(stepId)
        });
    }

    if (canDelete && onDelete) {
        if (canEditEmailBody) {
            items.push({id: 'before-delete', type: 'separator'});
        }
        items.push({
            icon: LucideIcon.Trash2,
            label: 'Delete',
            onSelect: () => onDelete(stepId),
            variant: 'destructive'
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

    const actionsById = new Map(automation.actions.map(action => [action.id, action]));
    const incoming = new Set(automation.edges.map(edge => edge.target_action_id));
    const head = automation.actions.find(action => !incoming.has(action.id));

    if (!head) {
        throw new Error(`Could not determine the starting step for automation ${automation.id}.`);
    }

    // NOTE: This doesn't handle branching automations. Our UI doesn't support
    // them either. If we revisit that, we'll need to revisit this code.

    const nextById = new Map(automation.edges.map(edge => [edge.source_action_id, edge.target_action_id]));
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
    disabled: boolean;
    onDelete: (stepId: string) => void;
    onEditEmailBody: (stepId: string, mode?: EmailModalMode) => void;
    onPreviewEmail: (stepId: string) => void;
    onPick: (type: StepPickerType, anchor: CanvasAnchor) => void;
    onSelectStep: (stepId: string) => void;
    newStepId: string | null;
    selectedStepId: string | null;
}

const buildGraph = ({actionErrors, automation, disabled, onDelete, onEditEmailBody, onPick, onPreviewEmail, onSelectStep, newStepId, selectedStepId}: BuildGraphParams): { nodes: AutomationFlowNode[]; edges: Edge[] } => {
    const ordered = getInitialActionOrder(automation);
    const baseNodeProps = {
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false
    };
    const disabledReason = disabled ? DISABLED_REASON : undefined;

    const lastActionId = ordered[ordered.length - 1]?.id;
    const tailAnchor: CanvasAnchor = {
        sourceId: lastActionId ?? TRIGGER_CANVAS_ID,
        targetId: TAIL_CANVAS_ID
    };

    const nodes: AutomationFlowNode[] = [
        {
            id: TRIGGER_CANVAS_ID,
            type: 'trigger',
            position: {x: NODE_X, y: 0},
            data: {
                contextMenuItems: buildNodeContextMenuItems({
                    onSelectStep,
                    stepId: TRIGGER_CANVAS_ID
                }),
                icon: LucideIcon.Zap,
                isNew: false,
                label: 'Trigger',
                value: 'Member signs up',
                selected: selectedStepId === TRIGGER_CANVAS_ID,
                onSelect: () => onSelectStep(TRIGGER_CANVAS_ID)
            },
            ...baseNodeProps
        }
    ];

    ordered.forEach((action, index) => {
        nodes.push({
            id: action.id,
            type: 'step',
            position: {x: NODE_X, y: NODE_GAP_Y * (index + 1)},
            data: {
                ...buildActionData(action),
                contextMenuItems: buildNodeContextMenuItems({
                    canDelete: true,
                    canEditEmailBody: action.type === 'send_email',
                    onDelete,
                    onEditEmailBody,
                    onPreviewEmail,
                    onSelectStep,
                    stepId: action.id
                }),
                errorMessage: actionErrors[action.id],
                isNew: newStepId === action.id,
                selected: selectedStepId === action.id,
                onSelect: () => onSelectStep(action.id)
            },
            ...baseNodeProps
        });
    });

    nodes.push({
        id: TAIL_CANVAS_ID,
        type: 'tail',
        position: {x: NODE_X, y: NODE_GAP_Y * (ordered.length + 1)},
        data: {disabled, disabledReason, onPick, anchor: tailAnchor},
        draggable: false,
        connectable: false
    });

    // Every connecting line between existing nodes gets a circular + on hover. The trailing edge into the
    // tail node intentionally has none — the rectangular tail button already covers that slot.
    const edges: Edge[] = [];
    let previousCanvasId: string = TRIGGER_CANVAS_ID;
    ordered.forEach((action) => {
        const edgeData: AddStepEdgeData = {
            sourceId: previousCanvasId,
            targetId: action.id,
            disabled,
            disabledReason,
            onPick
        };
        edges.push({
            id: `e-${previousCanvasId}-${action.id}`,
            source: previousCanvasId,
            target: action.id,
            type: 'add-step-edge',
            focusable: false,
            data: edgeData
        });
        previousCanvasId = action.id;
    });

    edges.push({
        id: `e-${previousCanvasId}-${TAIL_CANVAS_ID}`,
        source: previousCanvasId,
        target: TAIL_CANVAS_ID,
        type: 'smoothstep',
        focusable: false,
        style: {stroke: DEFAULT_EDGE_STROKE}
    });

    return {nodes, edges};
};

const getInitialViewport = (canvasWidth: number): { x: number; y: number; zoom: number } => ({
    x: Math.round((canvasWidth / 2) - NODE_COLUMN_CENTER_X),
    y: INITIAL_VIEWPORT_Y,
    zoom: 1
});

type AutomationCanvasProps = {
    actionErrors?: Record<string, string>;
    automation?: AutomationDetail;
    isEmailNavigationBlocked?: boolean;
    isLoading: boolean;
    isError: boolean;
    onChange: (next: AutomationDetail) => void;
    onDiscardBlockedEmailNavigation?: (closeEmailModal: () => void) => void;
    onEmailDirtyChange?: (isDirty: boolean) => void;
    onKeepEditingAfterBlockedEmailNavigation?: () => void;
};

type SelectedStep = {
    id: string;
};

const insertActionByType = {
    wait: insertWaitAction,
    send_email: insertSendEmailAction
};

const hasAutomationEmailModalState = (state: unknown): state is {automationEmailModal: boolean} => (
    !!state
    && typeof state === 'object'
    && 'automationEmailModal' in state
    && typeof state.automationEmailModal === 'boolean'
);

const AutomationCanvas: React.FC<AutomationCanvasProps> = ({
    actionErrors = {},
    automation,
    isEmailNavigationBlocked = false,
    isLoading,
    isError,
    onChange,
    onDiscardBlockedEmailNavigation,
    onEmailDirtyChange,
    onKeepEditingAfterBlockedEmailNavigation
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [newStepId, setNewStepId] = useState<string | null>(null);
    const [emailModalMode, setEmailModalMode] = useState<EmailModalMode>('edit');
    const [selectedStep, setSelectedStep] = useState<SelectedStep | null>(null);
    const [deleteConfirmationActionId, setDeleteConfirmationActionId] = useState<string | null>(null);
    const selectedStepId = selectedStep?.id ?? null;
    const emailModalStepId = searchParams.get(EMAIL_STEP_QUERY_PARAM);
    const isRouterOpenedEmailModal = hasAutomationEmailModalState(location.state) && location.state.automationEmailModal;

    const removeEmailStepParam = useCallback((options?: {replace?: boolean}) => {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete(EMAIL_STEP_QUERY_PARAM);
        setSearchParams(nextSearchParams, {replace: options?.replace ?? true});
    }, [searchParams, setSearchParams]);

    const handlePick = useCallback((type: StepPickerType, anchor: CanvasAnchor) => {
        if (!automation) {
            return;
        }
        if (automation.actions.length >= MAX_AUTOMATION_ACTIONS) {
            return;
        }
        const apiAnchor = toApiAnchor(anchor);
        const insertAction = insertActionByType[type];
        const next = insertAction({detail: automation, anchor: apiAnchor});
        const insertedAction = next.actions.find(action => !automation.actions.some(existingAction => existingAction.id === action.id));
        setNewStepId(insertedAction?.id ?? null);
        if (insertedAction) {
            setSelectedStep({id: insertedAction.id});
        }
        onChange(next);
    }, [automation, onChange]);

    useEffect(() => {
        if (!newStepId) {
            return;
        }
        const timeout = window.setTimeout(() => {
            setNewStepId(null);
        }, NODE_ENTER_ANIMATION_DURATION);
        return () => window.clearTimeout(timeout);
    }, [newStepId]);

    const handleDelete = useCallback((actionId: string) => {
        if (!automation) {
            return;
        }
        const next = removeAction({detail: automation, actionId});
        if (emailModalStepId === actionId) {
            removeEmailStepParam();
        }
        setSelectedStep(null);
        setDeleteConfirmationActionId(null);
        onChange(next);
    }, [automation, emailModalStepId, onChange, removeEmailStepParam]);

    const handleRequestDelete = useCallback((actionId: string) => {
        if (!automation) {
            return;
        }

        const action = automation.actions.find(item => item.id === actionId);
        if (action?.type === 'send_email' && !isEmptyEmailLexical(action.data.email_lexical)) {
            setDeleteConfirmationActionId(action.id);
            return;
        }

        handleDelete(actionId);
    }, [automation, handleDelete]);

    const handleUpdateWait = useCallback((actionId: string, waitHours: number) => {
        if (!automation) {
            return;
        }
        onChange(updateWaitAction({detail: automation, actionId, waitHours}));
    }, [automation, onChange]);

    const handleUpdateSubject = useCallback((actionId: string, subject: string) => {
        if (!automation) {
            return;
        }
        const action = automation.actions.find((item): item is AutomationSendEmailAction => item.id === actionId && item.type === 'send_email');
        if (!action) {
            return;
        }
        onChange(updateSendEmailAction({detail: automation, actionId, emailSubject: subject, emailLexical: action.data.email_lexical}));
    }, [automation, onChange]);

    const handleEditEmail = useCallback((actionId: string, mode: EmailModalMode = 'edit') => {
        setEmailModalMode(mode);
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set(EMAIL_STEP_QUERY_PARAM, actionId);
        setSearchParams(nextSearchParams, {
            state: {
                ...(location.state && typeof location.state === 'object' ? location.state : {}),
                automationEmailModal: true
            }
        });
    }, [location.state, searchParams, setSearchParams]);

    const handleContextMenuEditEmail = useCallback((actionId: string, mode: EmailModalMode = 'edit') => {
        setSelectedStep(null);
        handleEditEmail(actionId, mode);
    }, [handleEditEmail]);

    const handleContextMenuPreviewEmail = useCallback((actionId: string) => {
        handleContextMenuEditEmail(actionId, 'preview');
    }, [handleContextMenuEditEmail]);

    const emailModalAction = emailModalStepId && automation
        ? automation.actions.find((action): action is AutomationSendEmailAction => action.id === emailModalStepId && action.type === 'send_email')
        : undefined;

    const deleteConfirmationAction = automation && deleteConfirmationActionId
        ? automation.actions.find((action): action is AutomationSendEmailAction => action.id === deleteConfirmationActionId && action.type === 'send_email')
        : undefined;

    const initialViewport = useRef(getInitialViewport(window.innerWidth));

    const graph = useMemo(() => {
        if (!automation) {
            return null;
        }
        return buildGraph({
            actionErrors,
            automation,
            disabled: automation.actions.length >= MAX_AUTOMATION_ACTIONS,
            onDelete: handleRequestDelete,
            onEditEmailBody: handleContextMenuEditEmail,
            onPick: handlePick,
            onPreviewEmail: handleContextMenuPreviewEmail,
            onSelectStep: id => setSelectedStep({id}),
            newStepId,
            selectedStepId
        });
    }, [actionErrors, automation, handleContextMenuEditEmail, handleContextMenuPreviewEmail, handlePick, handleRequestDelete, newStepId, selectedStepId]);

    const clearDetail = useCallback(() => {
        setSelectedStep(null);
    }, []);

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

        const hasEmailAction = automation.actions.some(action => action.id === emailModalStepId && action.type === 'send_email');
        if (!hasEmailAction) {
            removeEmailStepParam();
        }
    }, [automation, emailModalStepId, removeEmailStepParam]);

    const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: AutomationFlowNode) => {
        event.stopPropagation();
        if (!automation || node.id === TAIL_CANVAS_ID || node.id === TRIGGER_CANVAS_ID) {
            return;
        }
        const action = automation.actions.find(item => item.id === node.id);
        if (action?.type === 'send_email') {
            handleEditEmail(action.id);
        }
    }, [automation, handleEditEmail]);

    if (isLoading) {
        return (
            <div className='flex flex-1 items-center justify-center bg-surface-page' data-testid='automation-canvas-loading'>
                <LoadingIndicator size='lg' />
            </div>
        );
    }

    if (isError || !automation || !graph) {
        return (
            <div className='flex flex-1 items-start justify-center bg-surface-page px-4 py-8'>
                <Banner className='max-w-md' role='alert' variant='destructive'>
                    <div className='flex items-start gap-3'>
                        <LucideIcon.CircleAlert className='mt-0.5 size-5 text-red' />
                        <div>
                            <strong className='block'>Couldn&apos;t load automation</strong>
                            <p className='text-sm text-muted-foreground'>Try refreshing the page.</p>
                        </div>
                    </div>
                </Banner>
            </div>
        );
    }

    return (
        <div className='relative flex-1 overflow-hidden bg-surface-page' data-testid='automation-canvas'>
            <ReactFlow
                className='[--xy-background-color:var(--color-grey-50)] [--xy-background-pattern-color:var(--color-grey-500)] [--xy-edge-stroke:var(--color-grey-300)] dark:[--xy-background-color:var(--color-black)] dark:[--xy-background-pattern-color:var(--color-grey-900)] dark:[--xy-edge-stroke:var(--color-grey-800)]'
                defaultViewport={initialViewport.current}
                edges={graph.edges}
                edgesFocusable={false}
                edgeTypes={edgeTypes}
                nodes={graph.nodes}
                nodesConnectable={false}
                nodesDraggable={false}
                nodesFocusable={false}
                nodeTypes={nodeTypes}
                proOptions={{hideAttribution: true}}
                zoomOnDoubleClick={false}
                zoomOnScroll={false}
                panOnScroll
                onNodeClick={(event, node) => {
                    if (event.button !== 0) {
                        return;
                    }
                    if (node.id !== TAIL_CANVAS_ID) {
                        setSelectedStep({id: node.id});
                    }
                }}
                onNodeDoubleClick={handleNodeDoubleClick}
                onPaneClick={clearDetail}
            >
                <Background variant={BackgroundVariant.Dots} />
                <AutomationCanvasControls />
            </ReactFlow>
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
            {emailModalAction && automation && (
                <EmailContentModal
                    automationId={automation.id}
                    initialLexical={emailModalAction.data.email_lexical}
                    initialMode={emailModalMode}
                    initialSubject={emailModalAction.data.email_subject}
                    isDiscardNavigationBlocked={isEmailNavigationBlocked}
                    onClose={closeEmailModal}
                    onDirtyChange={onEmailDirtyChange}
                    onDiscardBlockedNavigation={() => onDiscardBlockedEmailNavigation?.(closeEmailModalWithoutHistoryNavigation)}
                    onKeepEditingAfterBlockedNavigation={onKeepEditingAfterBlockedEmailNavigation}
                    onSave={({subject, lexical}) => {
                        onChange(updateSendEmailAction({detail: automation, actionId: emailModalAction.id, emailSubject: subject, emailLexical: lexical}));
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
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this email?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This email will be removed from the automation. Save or publish the automation to apply this change.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                            variant='destructive'
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
        </div>
    );
};

export default AutomationCanvas;
