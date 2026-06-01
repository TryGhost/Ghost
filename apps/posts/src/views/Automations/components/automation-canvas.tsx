import '@xyflow/react/dist/style.css';
import AddStepEdge, {type AddStepEdgeData} from './add-step-edge';
import EmailContentModal from './email-modal/email-content-modal';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import StepPicker, {type StepPickerType} from './step-picker';
import {AutomationAction, AutomationDetail, AutomationSendEmailAction, AutomationWaitAction, InsertActionAnchor, MAX_AUTOMATION_ACTIONS, insertSendEmailAction, insertWaitAction, removeAction, updateSendEmailAction, updateWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {Background, BackgroundVariant, Edge, Handle, Node, NodeProps, Position, ReactFlow} from '@xyflow/react';
import {Banner, Button, Checkbox, Input, Label, LoadingIndicator, Popover, PopoverContent, PopoverTrigger, Select, SelectTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';

const MAX_WAIT_DAYS = 30;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

const NODE_X = 0;
const NODE_WIDTH = 256;
const NODE_COLUMN_CENTER_X = NODE_X + (NODE_WIDTH / 2);
const NODE_GAP_Y = 180;
const INITIAL_VIEWPORT_Y = 40;
const DISABLED_REASON = `Limit of ${formatNumber(MAX_AUTOMATION_ACTIONS)} steps reached`;
const DEFAULT_EDGE_STROKE = 'var(--xy-edge-stroke)';

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
    icon: React.ElementType;
    label: string;
    value?: string;
};

type StepNodeData = StepNodeDisplayData & {
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
    opacity: 0,
    pointerEvents: 'none',
    background: 'transparent',
    border: 'none'
};

const HiddenHandle: React.FC<{type: 'source' | 'target'; position: Position}> = ({type, position}) => (
    <Handle isConnectable={false} position={position} style={HIDDEN_HANDLE_STYLE} type={type} />
);

const NodeShell: React.FC<React.PropsWithChildren<{className?: string; data: StepNodeData}>> = ({children, className, data}) => (
    <button
        aria-label={data.value ? `${data.label}: ${data.value}` : data.label}
        aria-pressed={data.selected}
        className={cn(
            'flex w-64 items-center gap-3 rounded-lg border border-transparent bg-surface-elevated p-3 text-left text-sm text-foreground shadow-sm transition-all focus-visible:border-border-strong focus-visible:outline-none',
            !data.selected && 'hover:border-border-strong',
            data.selected && 'border-gray-700 shadow-[inset_0_0_0_1px_var(--color-gray-700),0_1px_2px_0_rgb(0_0_0_/_0.05)]',
            className
        )}
        type='button'
        onClick={data.onSelect}
    >
        {children}
    </button>
);

const StepNodeContent: React.FC<{data: StepNodeData}> = ({data}) => {
    const Icon = data.icon;
    return (
        <>
            <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-text-secondary'>
                <Icon className='size-4' />
            </div>
            <div className='flex min-w-0 flex-col text-left'>
                <span className='text-xs text-text-secondary'>{data.label}</span>
                {data.value && <span className='truncate font-medium'>{data.value}</span>}
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
            <PopoverContent align='center' className='p-0' side='top'>
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

const buildActionData = (action: AutomationAction): StepNodeDisplayData => {
    switch (action.type) {
    case 'wait':
        return {icon: LucideIcon.Clock, label: 'Wait', value: formatWait(action.data.wait_hours)};
    case 'send_email':
        return {icon: LucideIcon.Mail, label: 'Send email', value: action.data.email_subject};
    default: {
        const _exhaustive: never = action;
        throw new Error(`Unknown automation action type: ${_exhaustive}`);
    }
    }
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
    automation: AutomationDetail;
    disabled: boolean;
    onPick: (type: StepPickerType, anchor: CanvasAnchor) => void;
    onSelectStep: (stepId: string) => void;
    selectedStepId: string | null;
}

const buildGraph = ({automation, disabled, onPick, onSelectStep, selectedStepId}: BuildGraphParams): {nodes: AutomationFlowNode[]; edges: Edge[]} => {
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
                icon: LucideIcon.Zap,
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
            title: action.data.email_subject || 'No subject',
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

const SidebarField: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
    <label className='flex flex-col gap-2'>
        <span className='text-xs font-medium text-text-secondary'>{label}</span>
        {children}
    </label>
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
    const unitLabel = days === 1 ? 'Day' : 'Days';

    const updateWaitDays = (nextDays: number) => {
        const nextHours = nextDays * 24;
        if (nextHours !== action.data.wait_hours) {
            onUpdate(nextHours);
        }
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
            <SidebarField label='Wait for'>
                <div className='grid grid-cols-[6rem_1fr] gap-2'>
                    <Input
                        aria-invalid={!isValid}
                        className='h-(--control-height)'
                        inputMode='numeric'
                        value={daysText}
                        onChange={handleChange}
                    />
                    <ReadOnlySelect value={unitLabel} />
                </div>
                {!isValid && (
                    <span className='text-xs text-red'>
                        Enter a whole number between 1 and {formatNumber(MAX_WAIT_DAYS)} days.
                    </span>
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
}> = ({action, onUpdateSubject, onEditEmail, onDelete}) => (
    <div className='flex flex-1 flex-col gap-5'>
        <SidebarField label='Subject line'>
            <Input
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
                        <h2 className='truncate text-base leading-tight font-semibold text-foreground'>{detail.title}</h2>
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
    automation?: AutomationDetail;
    isLoading: boolean;
    isError: boolean;
    onChange: (next: AutomationDetail) => void;
};

type SelectedStep = {
    id: string;
    isEditingEmail: boolean;
};

const insertActionByType = {
    wait: insertWaitAction,
    send_email: insertSendEmailAction
};

const AutomationCanvas: React.FC<AutomationCanvasProps> = ({automation, isLoading, isError, onChange}) => {
    const [selectedStep, setSelectedStep] = useState<SelectedStep | null>(null);
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
        onChange(next);
    }, [automation, onChange]);

    const handleDelete = useCallback((actionId: string) => {
        if (!automation) {
            return;
        }
        const next = removeAction({detail: automation, actionId});
        setSelectedStep(null);
        onChange(next);
    }, [automation, onChange]);

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

    const handleEditEmail = (actionId: string) => {
        setSelectedStep({id: actionId, isEditingEmail: true});
    };

    const emailModalAction = selectedStep?.isEditingEmail && automation
        ? automation.actions.find((action): action is AutomationSendEmailAction => action.id === selectedStep.id && action.type === 'send_email')
        : undefined;

    const initialViewport = useRef(getInitialViewport(window.innerWidth));

    const graph = useMemo(() => {
        if (!automation) {
            return null;
        }
        return buildGraph({
            automation,
            disabled: automation.actions.length >= MAX_AUTOMATION_ACTIONS,
            onPick: handlePick,
            onSelectStep: id => setSelectedStep({id, isEditingEmail: false}),
            selectedStepId
        });
    }, [automation, handlePick, selectedStepId]);

    const sidebarDetail = automation ? getStepSidebarDetail({
        automation,
        onDelete: handleDelete,
        onUpdateWait: handleUpdateWait,
        onUpdateSubject: handleUpdateSubject,
        onEditEmail: handleEditEmail,
        stepId: selectedStepId
    }) : null;
    const clearDetail = useCallback(() => {
        setSelectedStep(null);
    }, []);

    const closeEmailModal = () => {
        if (!emailModalAction) {
            return;
        }
        setSelectedStep({id: emailModalAction.id, isEditingEmail: false});
    };

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
                className='[--xy-background-color:var(--color-grey-50)] [--xy-background-pattern-color:var(--color-grey-500)] [--xy-edge-stroke:var(--border-default)] dark:[--xy-background-color:var(--color-black)] dark:[--xy-background-pattern-color:var(--color-grey-900)] dark:[--xy-edge-stroke:var(--color-grey-800)]'
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
                zoomOnScroll={false}
                panOnScroll
                onNodeClick={(_, node) => {
                    if (node.id !== TAIL_CANVAS_ID) {
                        setSelectedStep({id: node.id, isEditingEmail: false});
                    }
                }}
                onPaneClick={clearDetail}
            >
                <Background variant={BackgroundVariant.Dots} />
            </ReactFlow>
            <StepSidebar detail={sidebarDetail} isEmailModalOpen={Boolean(emailModalAction)} onClose={clearDetail} />
            {emailModalAction && automation && (
                <EmailContentModal
                    initialLexical={emailModalAction.data.email_lexical}
                    initialSubject={emailModalAction.data.email_subject}
                    onClose={closeEmailModal}
                    onSave={({subject, lexical}) => {
                        onChange(updateSendEmailAction({detail: automation, actionId: emailModalAction.id, emailSubject: subject, emailLexical: lexical}));
                        setSelectedStep({id: emailModalAction.id, isEditingEmail: false});
                    }}
                />
            )}
        </div>
    );
};

export default AutomationCanvas;
