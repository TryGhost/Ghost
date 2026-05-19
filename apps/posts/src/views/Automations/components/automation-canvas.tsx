import '@xyflow/react/dist/style.css';
import AddStepEdge, {type AddStepEdgeData} from './add-step-edge';
import React, {useCallback, useState} from 'react';
import StepPicker, {type StepPickerType} from './step-picker';
import {AutomationAction, AutomationDetail, InsertActionAnchor, MAX_AUTOMATION_ACTIONS, insertSendEmailAction, insertWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {Background, Edge, Handle, Node, NodeProps, Position, ReactFlow} from '@xyflow/react';
import {Banner, LoadingIndicator, Popover, PopoverContent, PopoverTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';

const NODE_X = 0;
const NODE_GAP_Y = 180;
const DISABLED_REASON = `Limit of ${MAX_AUTOMATION_ACTIONS} steps reached`;

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

type StepNodeData = {
    icon: React.ElementType;
    label: string;
    value?: string;
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

const NodeShell: React.FC<React.PropsWithChildren<{className?: string}>> = ({children, className}) => (
    <div
        className={cn('flex w-64 items-center gap-3 rounded-lg bg-white px-4 py-3 text-left text-sm shadow-sm', className)}
    >
        {children}
    </div>
);

const StepNodeContent: React.FC<{data: StepNodeData}> = ({data}) => {
    const Icon = data.icon;
    return (
        <>
            <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-grey-100 text-grey-700'>
                <Icon className='size-4' />
            </div>
            <div className='flex min-w-0 flex-col text-left'>
                <span className='text-xs text-grey-600'>{data.label}</span>
                {data.value && <span className='truncate font-medium'>{data.value}</span>}
            </div>
        </>
    );
};

const TriggerNode = React.memo<NodeProps<StepFlowNode>>(({data}) => (
    <NodeShell>
        <StepNodeContent data={data} />
        <HiddenHandle position={Position.Bottom} type='source' />
    </NodeShell>
));
TriggerNode.displayName = 'TriggerNode';

const StepNode = React.memo<NodeProps<StepFlowNode>>(({data}) => (
    <NodeShell>
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

    const triggerClassName = 'flex h-12 w-64 items-center justify-center rounded-lg border border-dashed border-grey-300 bg-white transition-colors hover:border-grey-400 focus-visible:border-grey-500 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-950 dark:hover:border-grey-700';

    if (data.disabled) {
        const content = (
            <div
                aria-disabled='true'
                className={cn(triggerClassName, 'cursor-not-allowed opacity-60')}
                data-testid='add-step-tail-button'
            >
                <HiddenHandle position={Position.Top} type='target' />
                <LucideIcon.Plus className='size-5 text-grey-500' strokeWidth={1.5} />
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
                <LucideIcon.Plus className='size-5 text-grey-500' strokeWidth={1.5} />
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

const buildActionData = (action: AutomationAction): StepNodeData => {
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
}

const buildGraph = ({automation, disabled, onPick}: BuildGraphParams): {nodes: AutomationFlowNode[]; edges: Edge[]} => {
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
            data: {icon: LucideIcon.Zap, label: 'Trigger', value: 'Member signs up'},
            ...baseNodeProps
        }
    ];

    ordered.forEach((action, index) => {
        nodes.push({
            id: action.id,
            type: 'step',
            position: {x: NODE_X, y: NODE_GAP_Y * (index + 1)},
            data: buildActionData(action),
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
        style: {stroke: 'var(--color-grey-500)'}
    });

    return {nodes, edges};
};

type AutomationCanvasProps = {
    automation?: AutomationDetail;
    isLoading: boolean;
    isError: boolean;
    onChange: (next: AutomationDetail) => void;
}

const insertActionByType = {
    wait: insertWaitAction,
    send_email: insertSendEmailAction
};

const AutomationCanvas: React.FC<AutomationCanvasProps> = ({automation, isLoading, isError, onChange}) => {
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

    const graph = React.useMemo(() => {
        if (!automation) {
            return null;
        }
        return buildGraph({
            automation,
            disabled: automation.actions.length >= MAX_AUTOMATION_ACTIONS,
            onPick: handlePick
        });
    }, [automation, handlePick]);

    // Fit only the trigger + first two action nodes on initial render so a deep chain doesn't zoom
    // out to a postage stamp. Below that, the user pans/scrolls to see the rest.
    const initialFitNodes = React.useMemo(() => (
        graph?.nodes.slice(0, 3).map(node => ({id: node.id})) ?? []
    ), [graph]);

    if (isLoading) {
        return (
            <div className='flex flex-1 items-center justify-center bg-grey-75' data-testid='automation-canvas-loading'>
                <LoadingIndicator size='lg' />
            </div>
        );
    }

    if (isError || !automation || !graph) {
        return (
            <div className='flex flex-1 items-start justify-center bg-grey-75 px-4 py-8'>
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
        <div className='flex-1 bg-grey-75' data-testid='automation-canvas'>
            <ReactFlow
                edges={graph.edges}
                edgesFocusable={false}
                edgeTypes={edgeTypes}
                fitViewOptions={{maxZoom: 1, minZoom: 1, padding: 0.2, nodes: initialFitNodes}}
                nodes={graph.nodes}
                nodesConnectable={false}
                nodesDraggable={false}
                nodesFocusable={false}
                nodeTypes={nodeTypes}
                proOptions={{hideAttribution: true}}
                zoomOnScroll={false}
                fitView
                panOnScroll
            >
                <Background color='var(--color-grey-400)' />
            </ReactFlow>
        </div>
    );
};

export default AutomationCanvas;
