import '@xyflow/react/dist/style.css';
import AddStepEdge, {type AddStepEdgeData} from './add-step-edge';
import EmailContentModal from './email-modal/email-content-modal';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import StepPicker, {type StepPickerType} from './step-picker';
import {AutomationAction, AutomationDetail, AutomationSendEmailAction, AutomationWaitAction, InsertActionAnchor, MAX_AUTOMATION_ACTIONS, insertSendEmailAction, insertWaitAction, removeAction, updateSendEmailAction, updateWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {Background, BackgroundVariant, Controls, Edge, Handle, Node, NodeProps, Position, ReactFlow, useReactFlow, useViewport} from '@xyflow/react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Banner, Button, Checkbox, ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, Field, FieldError, FieldLabel, Input, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, Label, LoadingIndicator, Popover, PopoverContent, PopoverTrigger, Select, SelectTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import type {EmailModalMode} from './types';

const MAX_WAIT_DAYS = 30;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

const NODE_X = 0;
const NODE_WIDTH = 256;
const NODE_COLUMN_CENTER_X = NODE_X + (NODE_WIDTH / 2);
const NODE_GAP_Y = 180;
const INITIAL_VIEWPORT_Y = 40;
const VIEWPORT_ANIMATION_DURATION = 180;
const NODE_ENTER_ANIMATION_DURATION = 250;
const DISABLED_REASON = `Limit of ${formatNumber(MAX_AUTOMATION_ACTIONS)} steps reached`;
const DEFAULT_EDGE_STROKE = 'var(--xy-edge-stroke)';
const ZOOM_PRESETS = [1.5, 1, 0.75, 0.5, 0.25];

// React Flow node IDs for the trigger and tail nodes. The canvas builds the visual graph using
// these; they are not action IDs and never reach the API.
export const TRIGGER_CANVAS_ID = '__trigger__';
export const TAIL_CANVAS_ID = '__tail__';

// Canvas-local anchor: React Flow node IDs of the two nodes between which a step is being inserted.
// Translated to the API's `InsertActionAnchor` by `toApiAnchor` before reaching the data helpers.
type CanvasAnchor = {sourceId: string; targetId: string};

const toApiAnchor = ({sourceId, targetId}: CanvasAnchor): InsertActionAnchor => ({
    previousActionId: sourceId === TRIGGER_CANVAS_ID ? undefined : sourceId,
    nextActionId: targetId === TAIL_CANVAS_ID ? undefined : targetId
});

type StepNodeDisplayData = {
    errorMessage?: string;
    icon: React.ElementType;
    label: string;
    isPlaceholderValue?: boolean;
    value?: string;
    warningMessage?: string;
};

type NodeContextMenuItem = {
    icon?: React.ElementType;
    label: string;
    onSelect: () => void;
    type?: 'item';
    variant?: 'default' | 'destructive';
};

type NodeContextMenuSeparator = {
    id: string;
    type: 'separator';
};

type NodeContextMenuEntry = NodeContextMenuItem | NodeContextMenuSeparator;

type StepNodeData = StepNodeDisplayData & {
    contextMenuItems: NodeContextMenuEntry[];
    isNew: boolean;
    selected: boolean;
    onSelect: () => void;
};

type TailNodeData = {
    disabled: boolean;
    disabledReason?: string;
    onPick: (type: StepPickerType, anchor: CanvasAnchor) => void;
    anchor: CanvasAnchor;
};

type StepFlowNode = Node<StepNodeData, 'trigger' | 'step'>;
type TailFlowNode = Node<TailNodeData, 'tail'>;
type AutomationFlowNode = StepFlowNode | TailFlowNode;

const HIDDEN_HANDLE_STYLE: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    height: 0,
    minHeight: 0,
    minWidth: 0,
    opacity: 0,
    pointerEvents: 'none',
    width: 0
};

const HiddenHandle: React.FC<{type: 'source' | 'target'; position: Position}> = ({type, position}) => (
    <Handle isConnectable={false} position={position} style={HIDDEN_HANDLE_STYLE} type={type} />
);

const NodeShell: React.FC<React.PropsWithChildren<{className?: string; data: StepNodeData}>> = ({children, className, data}) => {
    const ignoreNextClickRef = useRef(false);

    return (
        <ContextMenu onOpenChange={(open) => {
            if (!open) {
                ignoreNextClickRef.current = false;
            }
        }}>
            <ContextMenuTrigger asChild>
                <button
                    aria-invalid={Boolean(data.errorMessage)}
                    aria-label={data.value ? `${data.label}: ${data.value}` : data.label}
                    aria-pressed={data.selected}
                    className={cn(
                        'flex w-64 items-center gap-3 rounded-lg border border-transparent bg-surface-elevated p-3 text-left text-sm text-foreground shadow-sm transition-all focus-visible:border-border-strong focus-visible:outline-none',
                        (data.errorMessage || data.warningMessage) && 'items-start',
                        !data.selected && 'hover:border-border-strong',
                        data.selected && !data.errorMessage && 'border-gray-700 shadow-[inset_0_0_0_1px_var(--color-gray-700),0_1px_2px_0_rgb(0_0_0_/_0.05)]',
                        data.errorMessage && 'border-destructive',
                        !data.errorMessage && data.warningMessage && 'border-yellow-600',
                        data.isNew && 'animate-in fade-in-0 zoom-in-90 duration-250 ease-out motion-reduce:animate-none',
                        className
                    )}
                    type='button'
                    onClick={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || ignoreNextClickRef.current) {
                            ignoreNextClickRef.current = false;
                            return;
                        }
                        data.onSelect();
                    }}
                    onContextMenu={(event) => {
                        ignoreNextClickRef.current = true;
                        event.stopPropagation();
                    }}
                    onPointerDown={(event) => {
                        if (event.button === 2) {
                            event.stopPropagation();
                        }
                    }}
                >
                    {children}
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent
                className='w-44'
                onClick={event => event.stopPropagation()}
                onPointerDown={event => event.stopPropagation()}
            >
                {data.contextMenuItems.map((item) => {
                    if (item.type === 'separator') {
                        return <ContextMenuSeparator key={item.id} />;
                    }
                    const Icon = item.icon;
                    return (
                        <ContextMenuItem key={item.label} variant={item.variant} onSelect={item.onSelect}>
                            {Icon && <Icon className='size-4' />}
                            {item.label}
                        </ContextMenuItem>
                    );
                })}
            </ContextMenuContent>
        </ContextMenu>
    );
};

const StepNodeContent: React.FC<{data: StepNodeData}> = ({data}) => {
    const Icon = data.icon;
    const statusMessage = data.errorMessage || data.warningMessage;
    return (
        <>
            <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-text-secondary', statusMessage && 'mt-[3px]')}>
                <Icon className='size-4' />
            </div>
            <div className='flex min-w-0 flex-col text-left'>
                <span className='text-xs text-text-secondary'>{data.label}</span>
                {data.value && <span className={cn('truncate font-medium', data.isPlaceholderValue && 'opacity-50')}>{data.value}</span>}
                {data.errorMessage && <span className='mt-1 text-xs text-destructive'>{data.errorMessage}</span>}
                {!data.errorMessage && data.warningMessage && <span className='mt-1 text-xs text-yellow-600'>{data.warningMessage}</span>}
            </div>
        </>
    );
};

const TriggerNode = React.memo<NodeProps<StepFlowNode>>(({data}) => (
    <NodeShell data={data}>
        <StepNodeContent data={data} />
        <HiddenHandle position={Position.Bottom} type='source' />
    </NodeShell>
));
TriggerNode.displayName = 'TriggerNode';

const StepNode = React.memo<NodeProps<StepFlowNode>>(({data}) => (
    <NodeShell data={data}>
        <HiddenHandle position={Position.Top} type='target' />
        <StepNodeContent data={data} />
        <HiddenHandle position={Position.Bottom} type='source' />
    </NodeShell>
));
StepNode.displayName = 'StepNode';

const TailNode: React.FC<NodeProps<TailFlowNode>> = ({data}) => {
    const [open, setOpen] = useState(false);

    const handlePick = (type: StepPickerType) => {
        setOpen(false);
        data.onPick(type, data.anchor);
    };

    const triggerClassName = 'flex h-12 w-64 items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-page transition-colors hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none';

    if (data.disabled) {
        const content = (
            <div
                aria-disabled='true'
                className={cn(triggerClassName, 'cursor-not-allowed opacity-60')}
                data-testid='add-step-tail-button'
            >
                <HiddenHandle position={Position.Top} type='target' />
                <LucideIcon.Plus className='size-5 text-text-secondary' strokeWidth={1.5} />
            </div>
        );
        if (!data.disabledReason) {
            return content;
        }
        return (
            <TooltipProvider delayDuration={150}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span tabIndex={0}>{content}</span>
                    </TooltipTrigger>
                    <TooltipContent>{data.disabledReason}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                aria-label='Add step'
                className={cn(triggerClassName, 'cursor-pointer')}
                data-testid='add-step-tail-button'
            >
                <HiddenHandle position={Position.Top} type='target' />
                <LucideIcon.Plus className='size-5 text-text-secondary' strokeWidth={1.5} />
            </PopoverTrigger>
            <PopoverContent align='center' className='border-0 p-0 shadow-lg' side='top' sideOffset={12}>
                <StepPicker onPick={handlePick} />
            </PopoverContent>
        </Popover>
    );
};

const nodeTypes = {
    trigger: TriggerNode,
    step: StepNode,
    tail: TailNode
};

const edgeTypes = {
    'add-step-edge': AddStepEdge
};

const AutomationCanvasControls: React.FC = () => {
    const [open, setOpen] = useState(false);
    const {fitView, zoomIn, zoomOut, zoomTo} = useReactFlow();
    const {zoom} = useViewport();
    const animationOptions = {duration: VIEWPORT_ANIMATION_DURATION};
    const zoomPercent = Math.round(zoom * 100);

    const handleZoomTo = (nextZoom: number) => {
        setOpen(false);
        void zoomTo(nextZoom, animationOptions);
    };

    const handleFitView = () => {
        setOpen(false);
        void fitView(animationOptions);
    };

    return (
        <Controls
            className='gap-1 overflow-hidden rounded-md bg-surface-elevated p-0.5 text-foreground shadow-sm'
            orientation='horizontal'
            showFitView={false}
            showInteractive={false}
            showZoom={false}
            style={{bottom: 24, left: 24}}
        >
            <Button
                aria-label='Zoom out'
                className='rounded-sm text-text-secondary hover:text-foreground'
                size='icon'
                title='Zoom out'
                type='button'
                variant='ghost'
                onClick={() => void zoomOut(animationOptions)}
            >
                <LucideIcon.Minus className='size-5' strokeWidth={1.5} />
            </Button>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        aria-label={`Zoom level ${formatNumber(zoomPercent)}%`}
                        className='min-w-14 rounded-sm px-2 font-semibold'
                        type='button'
                        variant='ghost'
                    >
                        {formatNumber(zoomPercent)}%
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='center' className='w-40' side='top' sideOffset={12}>
                    {ZOOM_PRESETS.map((preset) => {
                        const presetPercent = Math.round(preset * 100);
                        const isSelected = Math.abs(zoom - preset) < 0.01;
                        return (
                            <DropdownMenuItem key={preset} onSelect={() => handleZoomTo(preset)}>
                                {formatNumber(presetPercent)}%
                                {isSelected && (
                                    <DropdownMenuShortcut>
                                        <LucideIcon.Check className='size-4 text-text-secondary' strokeWidth={1.5} />
                                    </DropdownMenuShortcut>
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleFitView}>
                        Fit to view
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button
                aria-label='Zoom in'
                className='rounded-sm text-text-secondary hover:text-foreground'
                size='icon'
                title='Zoom in'
                type='button'
                variant='ghost'
                onClick={() => void zoomIn(animationOptions)}
            >
                <LucideIcon.Plus className='size-5' strokeWidth={1.5} />
            </Button>
        </Controls>
    );
};

export const formatWait = (hours: number): string => {
    if (hours <= 0) {
        throw new Error('Wait time must be a positive number of hours.');
    }
    if (hours % 24 === 0) {
        const days = hours / 24;
        return days === 1 ? '1 day' : `${days} days`;
    }
    return hours === 1 ? '1 hour' : `${hours} hours`;
};

const isEmptyEmailLexical = (lexical: string | null | undefined): boolean => {
    if (!lexical) {
        return true;
    }

    try {
        const parsed = JSON.parse(lexical);
        const children = parsed?.root?.children;

        if (!children || children.length === 0) {
            return true;
        }

        return children.length === 1 && children[0].type === 'paragraph' && (!children[0].children || children[0].children.length === 0);
    } catch {
        return true;
    }
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

const buildGraph = ({actionErrors, automation, disabled, onDelete, onEditEmailBody, onPick, onPreviewEmail, onSelectStep, newStepId, selectedStepId}: BuildGraphParams): {nodes: AutomationFlowNode[]; edges: Edge[]} => {
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

const getInitialViewport = (canvasWidth: number): {x: number; y: number; zoom: number} => ({
    x: Math.round((canvasWidth / 2) - NODE_COLUMN_CENTER_X),
    y: INITIAL_VIEWPORT_Y,
    zoom: 1
});

type BaseStepSidebarDetail<Type extends string, LabelText extends string> = {
    icon: React.ElementType;
    isPlaceholderTitle?: boolean;
    title: string;
    label: LabelText;
    type: Type;
};

type ActionStepSidebarDetail<Action extends AutomationAction, LabelText extends string> = BaseStepSidebarDetail<Action['type'], LabelText> & {
    action: Action;
    onDelete: () => void;
};

type TriggerStepSidebarDetail = BaseStepSidebarDetail<'trigger', 'Trigger'> & {
    memberTiers: MemberTier[];
};

type WaitStepSidebarDetail = ActionStepSidebarDetail<AutomationWaitAction, 'Wait'> & {
    onUpdate: (waitHours: number) => void;
};

type SendEmailStepSidebarDetail = ActionStepSidebarDetail<AutomationSendEmailAction, 'Send email'> & {
    onUpdateSubject: (subject: string) => void;
    onEditEmail: () => void;
};

type StepSidebarDetail = TriggerStepSidebarDetail | WaitStepSidebarDetail | SendEmailStepSidebarDetail;

type MemberTier = 'free' | 'paid';

const automationSlugMemberTiers: Record<string, MemberTier[]> = {
    'member-welcome-email-free': ['free'],
    'member-welcome-email-paid': ['paid']
};

type StepSidebarDetailOptions = {
    automation: AutomationDetail;
    onDelete: (actionId: string) => void;
    onUpdateWait: (actionId: string, waitHours: number) => void;
    onUpdateSubject: (actionId: string, subject: string) => void;
    onEditEmail: (actionId: string) => void;
    stepId: string | null;
};

const getStepSidebarDetail = ({automation, stepId, onDelete, onUpdateWait, onUpdateSubject, onEditEmail}: StepSidebarDetailOptions): StepSidebarDetail | null => {
    if (!stepId) {
        return null;
    }

    if (stepId === TRIGGER_CANVAS_ID) {
        return {
            icon: LucideIcon.Zap,
            label: 'Trigger',
            title: 'Member signs up',
            memberTiers: automationSlugMemberTiers[automation.slug] ?? [],
            type: 'trigger'
        };
    }

    const action = automation.actions.find(item => item.id === stepId);
    if (!action) {
        return null;
    }

    switch (action.type) {
    case 'wait': {
        const waitValue = formatWait(action.data.wait_hours);
        return {
            icon: LucideIcon.Clock,
            label: 'Wait',
            title: waitValue,
            action,
            onDelete: () => onDelete(action.id),
            onUpdate: (waitHours: number) => onUpdateWait(action.id, waitHours),
            type: 'wait'
        };
    }
    case 'send_email':
        return {
            icon: LucideIcon.Mail,
            label: 'Send email',
            isPlaceholderTitle: !action.data.email_subject,
            title: action.data.email_subject || 'Untitled',
            action,
            onDelete: () => onDelete(action.id),
            onUpdateSubject: (subject: string) => onUpdateSubject(action.id, subject),
            onEditEmail: () => onEditEmail(action.id),
            type: 'send_email'
        };
    default: {
        const _exhaustive: never = action;
        throw new Error(`Unknown automation action type: ${_exhaustive}`);
    }
    }
};

const SidebarField: React.FC<{label: string; children: React.ReactNode; htmlFor?: string}> = ({children, htmlFor, label}) => (
    <Field>
        <FieldLabel className='text-xs font-medium text-text-secondary' htmlFor={htmlFor}>
            {label}
        </FieldLabel>
        {children}
    </Field>
);

const ReadOnlySelect: React.FC<{value: string}> = ({value}) => (
    <Select value={value}>
        <SelectTrigger disabled>
            <span>{value}</span>
        </SelectTrigger>
    </Select>
);

const TriggerSidebarBody: React.FC<{memberTiers: MemberTier[]}> = ({memberTiers}) => (
    <div className='flex flex-col gap-5'>
        <SidebarField label='Trigger'>
            <ReadOnlySelect value='New member sign up' />
        </SidebarField>
        <div className='flex flex-col gap-2'>
            <span className='text-xs font-medium text-text-secondary'>Members</span>
            <Label className='flex items-center gap-2 text-sm font-normal text-foreground'>
                <Checkbox checked={memberTiers.includes('free')} disabled />
                Free
            </Label>
            <Label className='flex items-center gap-2 text-sm font-normal text-foreground'>
                <Checkbox checked={memberTiers.includes('paid')} disabled />
                Paid
            </Label>
        </div>
    </div>
);

const DeleteStepButton: React.FC<{onClick: () => void}> = ({onClick}) => (
    <Button
        className='w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground'
        type='button'
        variant='outline'
        onClick={onClick}
    >
        <LucideIcon.Trash2 className='size-4' />
        Delete step
    </Button>
);

const getValidWaitDays = (value: string): number | null => {
    const days = Number(value);
    if (!WHOLE_NUMBER_PATTERN.test(value) || !Number.isInteger(days) || days < 1 || days > MAX_WAIT_DAYS) {
        return null;
    }
    return days;
};

const WaitSidebarBody: React.FC<{
    action: AutomationWaitAction;
    onUpdate: (waitHours: number) => void;
    onDelete: () => void;
}> = ({action, onUpdate, onDelete}) => {
    if (action.data.wait_hours % 24 !== 0) {
        throw new Error(`WaitSidebarBody: wait_hours must be a multiple of 24, received ${action.data.wait_hours}`);
    }
    const initialDays = action.data.wait_hours / 24;
    const [daysText, setDaysText] = useState<string>(String(initialDays));

    const days = Number(daysText);
    const isValid = getValidWaitDays(daysText) !== null;
    const updateWaitDays = (nextDays: number) => {
        const nextHours = nextDays * 24;
        if (nextHours !== action.data.wait_hours) {
            onUpdate(nextHours);
        }
    };

    const stepWaitDays = (direction: -1 | 1) => {
        const currentDays = getValidWaitDays(daysText);
        if (currentDays === null) {
            return;
        }

        const nextDays = Math.min(MAX_WAIT_DAYS, Math.max(1, currentDays + direction));
        setDaysText(String(nextDays));
        updateWaitDays(nextDays);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextDaysText = event.target.value;
        setDaysText(nextDaysText);

        const nextDays = getValidWaitDays(nextDaysText);
        if (nextDays === null) {
            return;
        }
        updateWaitDays(nextDays);
    };

    return (
        <div className='flex flex-1 flex-col gap-5'>
            <SidebarField htmlFor='automation-wait-days' label='Wait for'>
                <InputGroup
                    aria-label='Wait duration in days'
                    className='h-(--control-height)'
                    data-disabled={!isValid ? 'true' : undefined}
                >
                    <InputGroupInput
                        aria-describedby={!isValid ? 'automation-wait-days-error' : undefined}
                        aria-invalid={!isValid}
                        className='w-10 min-w-10 flex-none pr-1 font-mono tabular-nums'
                        id='automation-wait-days'
                        inputMode='numeric'
                        value={daysText}
                        onChange={handleChange}
                    />
                    <InputGroupText className='mr-auto'>{days === 1 ? 'day' : 'days'}</InputGroupText>
                    <InputGroupAddon align='inline-end' className='gap-0.5 pr-2'>
                        <InputGroupButton
                            aria-label='Decrease wait by one day'
                            disabled={!isValid || days <= 1}
                            size='icon-xs'
                            title='Decrease wait by one day'
                            onClick={() => stepWaitDays(-1)}
                        >
                            <LucideIcon.Minus className='size-4' />
                        </InputGroupButton>
                        <InputGroupButton
                            aria-label='Increase wait by one day'
                            disabled={!isValid || days >= MAX_WAIT_DAYS}
                            size='icon-xs'
                            title='Increase wait by one day'
                            onClick={() => stepWaitDays(1)}
                        >
                            <LucideIcon.Plus className='size-4' />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                {!isValid && (
                    <FieldError className='text-xs' id='automation-wait-days-error'>
                        Enter a whole number between 1 and {formatNumber(MAX_WAIT_DAYS)} days.
                    </FieldError>
                )}
            </SidebarField>
            <div className='mt-auto pt-6'>
                <DeleteStepButton onClick={onDelete} />
            </div>
        </div>
    );
};

const SendEmailSidebarBody: React.FC<{
    action: AutomationSendEmailAction;
    onUpdateSubject: (subject: string) => void;
    onEditEmail: () => void;
    onDelete: () => void;
}> = ({action, onUpdateSubject, onEditEmail, onDelete}) => {
    const subjectInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        subjectInputRef.current?.focus({preventScroll: true});
    }, [action.id]);

    return (
        <div className='flex flex-1 flex-col gap-5'>
            <SidebarField label='Subject line'>
                <Input
                    ref={subjectInputRef}
                    placeholder='Subject line'
                    value={action.data.email_subject}
                    onChange={e => onUpdateSubject(e.target.value)}
                />
            </SidebarField>
            <Button
                className='w-full'
                type='button'
                variant='outline'
                onClick={onEditEmail}
            >
                <LucideIcon.Pencil className='size-4' />
                Edit email
            </Button>
            <div className='mt-auto pt-6'>
                <DeleteStepButton onClick={onDelete} />
            </div>
        </div>
    );
};

const StepSidebarBody: React.FC<{detail: StepSidebarDetail}> = ({detail}) => {
    switch (detail.type) {
    case 'trigger':
        return <TriggerSidebarBody memberTiers={detail.memberTiers} />;
    case 'wait':
        return <WaitSidebarBody key={detail.action.id} action={detail.action} onDelete={detail.onDelete} onUpdate={detail.onUpdate} />;
    case 'send_email':
        return <SendEmailSidebarBody key={detail.action.id} action={detail.action} onDelete={detail.onDelete} onEditEmail={detail.onEditEmail} onUpdateSubject={detail.onUpdateSubject} />;
    default: {
        const _exhaustive: never = detail;
        throw new Error(`Unknown sidebar type: ${_exhaustive}`);
    }
    }
};

const StepSidebarContent: React.FC<{detail: StepSidebarDetail}> = ({detail}) => {
    const Icon = detail.icon;

    return (
        <div className='flex min-h-full flex-col gap-6'>
            <div className='flex items-start gap-4'>
                <div className='flex min-w-0 items-center gap-3'>
                    <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-text-secondary'>
                        <Icon className='size-4' />
                    </div>
                    <div className='min-w-0'>
                        <span className='block text-xs text-text-secondary'>{detail.label}</span>
                        <h2 className={cn('truncate text-base leading-tight font-medium text-foreground', detail.isPlaceholderTitle && 'opacity-50')}>{detail.title}</h2>
                    </div>
                </div>
            </div>

            <StepSidebarBody detail={detail} />
        </div>
    );
};

const StepSidebar: React.FC<{detail: StepSidebarDetail | null; isEmailModalOpen: boolean; onClose: () => void}> = ({detail, isEmailModalOpen, onClose}) => {
    useEffect(() => {
        if (!detail) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isEmailModalOpen) {
                    return;
                }
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [detail, isEmailModalOpen, onClose]);

    return (
        <aside
            aria-hidden={!detail}
            aria-label='Step details'
            className={cn(
                'absolute inset-y-0 right-0 z-[1] flex w-[calc(100%-6rem)] max-w-none translate-x-full flex-col gap-6 overflow-y-auto bg-background p-6 shadow-sm transition-transform duration-200 ease-out sm:w-[36rem] dark:border-l dark:border-gray-950',
                detail ? 'translate-x-0' : 'pointer-events-none'
            )}
            data-state={detail ? 'open' : 'closed'}
            data-testid='automation-step-sidebar'
        >
            {detail && <StepSidebarContent detail={detail} />}
        </aside>
    );
};

type AutomationCanvasProps = {
    actionErrors?: Record<string, string>;
    automation?: AutomationDetail;
    isLoading: boolean;
    isError: boolean;
    onChange: (next: AutomationDetail) => void;
};

type SelectedStep = {
    id: string;
};

const insertActionByType = {
    wait: insertWaitAction,
    send_email: insertSendEmailAction
};

const AutomationCanvas: React.FC<AutomationCanvasProps> = ({actionErrors = {}, automation, isLoading, isError, onChange}) => {
    const [newStepId, setNewStepId] = useState<string | null>(null);
    const [emailModalMode, setEmailModalMode] = useState<EmailModalMode>('edit');
    const [emailModalStepId, setEmailModalStepId] = useState<string | null>(null);
    const [selectedStep, setSelectedStep] = useState<SelectedStep | null>(null);
    const [deleteConfirmationActionId, setDeleteConfirmationActionId] = useState<string | null>(null);
    const selectedStepId = selectedStep?.id ?? null;

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
        setEmailModalStepId(currentId => (currentId === actionId ? null : currentId));
        setSelectedStep(null);
        setDeleteConfirmationActionId(null);
        onChange(next);
    }, [automation, onChange]);

    const handleRequestDelete = useCallback((actionId: string) => {
        if (!automation) {
            return;
        }

        const action = automation.actions.find(item => item.id === actionId);
        if (action?.type === 'send_email') {
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
        setEmailModalStepId(actionId);
    }, []);

    const handleContextMenuEditEmail = useCallback((actionId: string, mode: EmailModalMode = 'edit') => {
        setSelectedStep(null);
        setEmailModalMode(mode);
        setEmailModalStepId(actionId);
    }, []);

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
            onDelete: handleDelete,
            onEditEmailBody: handleContextMenuEditEmail,
            onPick: handlePick,
            onPreviewEmail: handleContextMenuPreviewEmail,
            onSelectStep: id => setSelectedStep({id}),
            newStepId,
            selectedStepId
        });
    }, [actionErrors, automation, handleContextMenuEditEmail, handleContextMenuPreviewEmail, handleDelete, handlePick, newStepId, selectedStepId]);

    const sidebarDetail = automation ? getStepSidebarDetail({
        automation,
        onDelete: handleRequestDelete,
        onUpdateWait: handleUpdateWait,
        onUpdateSubject: handleUpdateSubject,
        onEditEmail: handleEditEmail,
        stepId: selectedStepId
    }) : null;
    const clearDetail = useCallback(() => {
        setSelectedStep(null);
    }, []);

    const closeEmailModal = () => {
        setEmailModalStepId(null);
        setEmailModalMode('edit');
    };

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
            <StepSidebar detail={sidebarDetail} isEmailModalOpen={Boolean(emailModalAction) || Boolean(deleteConfirmationAction)} onClose={clearDetail} />
            {emailModalAction && automation && (
                <EmailContentModal
                    initialLexical={emailModalAction.data.email_lexical}
                    initialMode={emailModalMode}
                    initialSubject={emailModalAction.data.email_subject}
                    onClose={closeEmailModal}
                    onSave={({subject, lexical}) => {
                        onChange(updateSendEmailAction({detail: automation, actionId: emailModalAction.id, emailSubject: subject, emailLexical: lexical}));
                        closeEmailModal();
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
