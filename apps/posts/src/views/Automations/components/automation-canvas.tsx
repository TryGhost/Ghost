import '@xyflow/react/dist/style.css';
import React from 'react';
import {AutomationAction, AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Background, Edge, Handle, Node, NodeProps, Position, ReactFlow} from '@xyflow/react';
import {Banner, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

const TAIL_NODE_ID = '__tail__';
const NODE_X = 0;
const NODE_GAP_Y = 180;

type StepNodeData = {
    icon: React.ElementType;
    label: string;
    value?: string;
};

type StepFlowNode = Node<StepNodeData, 'trigger' | 'step'>;
type TailFlowNode = Node<Record<string, never>, 'tail'>;
type AutomationFlowNode = StepFlowNode | TailFlowNode;

const HIDDEN_HANDLE_STYLE: React.CSSProperties = {
    opacity: 0,
    pointerEvents: 'none',
    background: 'transparent',
    border: 'none'
};

const EDGE_STYLE: React.CSSProperties = {stroke: 'var(--color-grey-500)'};

const HiddenHandle: React.FC<{type: 'source' | 'target'; position: Position}> = ({type, position}) => (
    <Handle isConnectable={false} position={position} style={HIDDEN_HANDLE_STYLE} type={type} />
);

const NodeShell: React.FC<React.PropsWithChildren<{className?: string}>> = ({children, className}) => (
    <div
        className={`flex w-64 items-center gap-3 rounded-lg bg-white px-4 py-3 text-left text-sm shadow-sm ${className ?? ''}`}
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

// TODO: convert to a <button> once "add step" is wired up. Currently decorative.
const TailNode = React.memo<NodeProps<TailFlowNode>>(() => (
    <div aria-hidden='true' className='flex h-12 w-64 items-center justify-center rounded-lg border border-dashed border-grey-300 bg-white'>
        <HiddenHandle position={Position.Top} type='target' />
        <LucideIcon.Plus className='size-5 text-grey-500' strokeWidth={1.5} />
    </div>
));
TailNode.displayName = 'TailNode';

const nodeTypes = {
    trigger: TriggerNode,
    step: StepNode,
    tail: TailNode
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

const buildGraph = (automation: AutomationDetail): {nodes: AutomationFlowNode[]; edges: Edge[]} => {
    const ordered = getInitialActionOrder(automation);
    const baseNodeProps = {
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false
    };

    const nodes: AutomationFlowNode[] = [
        {
            id: 'trigger',
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
        id: TAIL_NODE_ID,
        type: 'tail',
        position: {x: NODE_X, y: NODE_GAP_Y * (ordered.length + 1)},
        data: {},
        ...baseNodeProps
    });

    const edges: Edge[] = [];
    let previousId = 'trigger';
    const pushEdge = (source: string, target: string) => {
        edges.push({
            id: `e-${source}-${target}`,
            source,
            target,
            type: 'smoothstep',
            focusable: false,
            style: EDGE_STYLE
        });
    };
    ordered.forEach((action) => {
        pushEdge(previousId, action.id);
        previousId = action.id;
    });
    pushEdge(previousId, TAIL_NODE_ID);

    return {nodes, edges};
};

interface AutomationCanvasProps {
    automation?: AutomationDetail;
    isLoading: boolean;
    isError: boolean;
}

const AutomationCanvas: React.FC<AutomationCanvasProps> = ({automation, isLoading, isError}) => {
    const graph = React.useMemo(
        () => (automation ? buildGraph(automation) : null),
        [automation]
    );

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
                fitViewOptions={{maxZoom: 1, padding: 0.4}}
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
