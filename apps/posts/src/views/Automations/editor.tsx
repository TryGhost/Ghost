import '@xyflow/react/dist/style.css';
import React, {useCallback} from 'react';
import {
    Background,
    Connection,
    Controls,
    Edge,
    Node,
    Position,
    ReactFlow,
    addEdge,
    useEdgesState,
    useNodesState
} from '@xyflow/react';
import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getAutomationById} from './mock-data';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

const nodeDefaults = {
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    className: 'border-0! shadow-sm text-sm! px-5! py-4! rounded-lg! w-56!'
};

type NodeLabelProps = {
    icon: React.ElementType;
    type: string;
    value?: string;
};

const NodeLabel: React.FC<NodeLabelProps> = ({icon: Icon, type, value}) => (
    <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-xs text-grey-600">
            <Icon className="size-3.5" />
            <span>{type}</span>
        </div>
        {value && <div className="font-medium">{value}</div>}
    </div>
);

const initialNodes: Node[] = [
    {
        id: 'trigger',
        type: 'input',
        position: {x: 240, y: 0},
        data: {label: <NodeLabel icon={LucideIcon.Zap} type="Trigger" value="Member signs up" />},
        ...nodeDefaults
    },
    {
        id: 'delay',
        position: {x: 240, y: 180},
        data: {label: <NodeLabel icon={LucideIcon.Clock} type="Wait" value="1 day" />},
        ...nodeDefaults
    },
    {
        id: 'send-email',
        position: {x: 0, y: 360},
        data: {label: <NodeLabel icon={LucideIcon.Mail} type="Send email" value="Welcome to The Blueprint" />},
        ...nodeDefaults
    },
    {
        id: 'add-label',
        position: {x: 480, y: 360},
        data: {label: <NodeLabel icon={LucideIcon.Tag} type="Add label" value="Onboarding" />},
        ...nodeDefaults
    },
    {
        id: 'end',
        type: 'output',
        position: {x: 240, y: 540},
        data: {label: <NodeLabel icon={LucideIcon.Flag} type="End" />},
        ...nodeDefaults
    }
];

const initialEdges: Edge[] = [
    {id: 'e1', source: 'trigger', target: 'delay', animated: true},
    {id: 'e2', source: 'delay', target: 'send-email'},
    {id: 'e3', source: 'delay', target: 'add-label'},
    {id: 'e4', source: 'send-email', target: 'end'},
    {id: 'e5', source: 'add-label', target: 'end'}
];

const AutomationEditor: React.FC = () => {
    const navigate = useNavigate();
    const {id} = useParams<{id: string}>();
    const existing = id && id !== 'new' ? getAutomationById(id) : undefined;
    const title = existing?.name ?? (id === 'new' ? 'New automation' : 'Automation');

    const [nodes, , onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

    const onConnect = useCallback(
        (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
        [setEdges]
    );

    const goBack = () => navigate('/automations');

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center gap-3">
                    <Button aria-label="Back to automations" size="icon" variant="ghost" onClick={goBack}>
                        <LucideIcon.ArrowLeft />
                    </Button>
                    <span className="font-medium">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={goBack}>Cancel</Button>
                    <Button onClick={goBack}>Save</Button>
                </div>
            </header>
            <style>{`.react-flow__handle { opacity: 0 !important; }`}</style>
            <div className="flex-1 bg-grey-75">
                <ReactFlow
                    defaultEdgeOptions={{type: 'smoothstep', style: {stroke: 'var(--color-grey-500)'}, ...({pathOptions: {borderRadius: 40}} as object)}}
                    edges={edges}
                    fitViewOptions={{maxZoom: 1}}
                    nodes={nodes}
                    nodesDraggable={false}
                    fitView
                    onConnect={onConnect}
                    onEdgesChange={onEdgesChange}
                    onNodesChange={onNodesChange}
                >
                    <Background color="var(--color-grey-400)" />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
};

export default AutomationEditor;
export const Component = AutomationEditor;
