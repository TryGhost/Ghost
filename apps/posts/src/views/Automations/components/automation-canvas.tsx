import '@xyflow/react/dist/style.css';
import React, {useRef} from 'react';
import {AutomationAction, AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Background, Edge, Handle, Node, NodeProps, Position, ReactFlow, ReactFlowInstance} from '@xyflow/react';
import {Banner, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

const TAIL_NODE_ID = '__tail__';
const NODE_X = 240;
const NODE_GAP_Y = 180;
const NODE_COLUMN_CENTER_X = NODE_X + 128;

type StepNodeData = {
    icon: React.ElementType;
    type: string;
    value?: string;
};

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
                <span className='text-xs text-grey-600'>{data.type}</span>
                {data.value && <span className='truncate font-medium'>{data.value}</span>}
            </div>
        </>
    );
};

const TriggerNode: React.FC<NodeProps> = ({data}) => (
    <NodeShell>
        <StepNodeContent data={data as StepNodeData} />
        <HiddenHandle position={Position.Bottom} type='source' />
    </NodeShell>
);

const StepNode: React.FC<NodeProps> = ({data}) => (
    <NodeShell>
        <HiddenHandle position={Position.Top} type='target' />
        <StepNodeContent data={data as StepNodeData} />
        <HiddenHandle position={Position.Bottom} type='source' />
    </NodeShell>
);

const TailNode: React.FC = () => (
    <div className='flex h-12 w-64 items-center justify-center rounded-lg border border-dashed border-grey-300'>
        <HiddenHandle position={Position.Top} type='target' />
        <LucideIcon.Plus className='size-5 text-grey-500' strokeWidth={1.5} />
    </div>
);

const nodeTypes = {
    trigger: TriggerNode,
    step: StepNode,
    tail: TailNode
};

const formatWait = (hours: number): string => {
    if (hours <= 0) {
        return 'Immediately';
    }
    if (hours % 24 === 0) {
        const days = hours / 24;
        return days === 1 ? '1 day' : `${days} days`;
    }
    return hours === 1 ? '1 hour' : `${hours} hours`;
};

const buildActionData = (action: AutomationAction): StepNodeData => {
    if (action.type === 'wait') {
        return {icon: LucideIcon.Clock, type: 'Wait', value: formatWait(action.data.wait_hours)};
    }
    return {icon: LucideIcon.Mail, type: 'Send email', value: action.data.email_subject};
};

const orderActions = (automation: AutomationDetail): AutomationAction[] => {
    const actionsById = new Map(automation.actions.map(action => [action.id, action]));
    const incoming = new Set(automation.edges.map(edge => edge.target_action_id));
    const head = automation.actions.find(action => !incoming.has(action.id));

    if (!head) {
        return automation.actions;
    }

    const nextById = new Map(automation.edges.map(edge => [edge.source_action_id, edge.target_action_id]));
    const ordered: AutomationAction[] = [];
    const visited = new Set<string>();
    let cursor: AutomationAction | undefined = head;

    while (cursor && !visited.has(cursor.id)) {
        ordered.push(cursor);
        visited.add(cursor.id);
        const nextId = nextById.get(cursor.id);
        cursor = nextId ? actionsById.get(nextId) : undefined;
    }

    return ordered;
};

const buildGraph = (automation: AutomationDetail): {nodes: Node[]; edges: Edge[]} => {
    const ordered = orderActions(automation);
    const baseNodeProps = {
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false
    };

    const nodes: Node[] = [
        {
            id: 'trigger',
            type: 'trigger',
            position: {x: NODE_X, y: 0},
            data: {icon: LucideIcon.Zap, type: 'Trigger', value: 'Member signs up'} satisfies StepNodeData,
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
    ordered.forEach((action) => {
        edges.push({
            id: `e-${previousId}-${action.id}`,
            source: previousId,
            target: action.id,
            type: 'smoothstep',
            focusable: false,
            style: {stroke: 'var(--color-grey-500)'}
        });
        previousId = action.id;
    });
    edges.push({
        id: `e-${previousId}-tail`,
        source: previousId,
        target: TAIL_NODE_ID,
        type: 'smoothstep',
        focusable: false,
        style: {stroke: 'var(--color-grey-500)'}
    });

    return {nodes, edges};
};

interface AutomationCanvasProps {
    automation?: AutomationDetail;
    isLoading: boolean;
    isError: boolean;
}

const AutomationCanvas: React.FC<AutomationCanvasProps> = ({automation, isLoading, isError}) => {
    const canvasRef = useRef<HTMLDivElement>(null);

    if (isLoading) {
        return (
            <div className='flex flex-1 items-center justify-center bg-grey-75' data-testid='automation-canvas-loading'>
                <LoadingIndicator size='lg' />
            </div>
        );
    }

    if (isError || !automation) {
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

    const {nodes, edges} = buildGraph(automation);

    const handleInit = (instance: ReactFlowInstance) => {
        const width = canvasRef.current?.clientWidth ?? 1200;
        instance.setViewport({x: Math.round(width / 2 - NODE_COLUMN_CENTER_X), y: 40, zoom: 1});
    };

    return (
        <div ref={canvasRef} className='flex-1 bg-grey-75' data-testid='automation-canvas'>
            <ReactFlow
                edges={edges}
                edgesFocusable={false}
                nodes={nodes}
                nodesConnectable={false}
                nodesDraggable={false}
                nodesFocusable={false}
                nodeTypes={nodeTypes}
                proOptions={{hideAttribution: true}}
                zoomOnScroll={false}
                panOnScroll
                onInit={handleInit}
            >
                <Background color='var(--color-grey-400)' />
            </ReactFlow>
        </div>
    );
};

export default AutomationCanvas;
