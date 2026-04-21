import '@xyflow/react/dist/style.css';
import React, {useCallback} from 'react';
import {
    Background,
    Connection,
    Controls,
    Edge,
    Node,
    ReactFlow,
    addEdge,
    useEdgesState,
    useNodesState
} from '@xyflow/react';
import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getAutomationById} from './mock-data';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

const initialNodes: Node[] = [
    {
        id: 'trigger',
        type: 'input',
        position: {x: 80, y: 80},
        data: {label: 'Trigger: Member signs up'}
    },
    {
        id: 'delay',
        position: {x: 320, y: 80},
        data: {label: 'Wait 1 day'}
    },
    {
        id: 'send-email',
        position: {x: 560, y: 20},
        data: {label: 'Send email: Welcome'}
    },
    {
        id: 'add-label',
        position: {x: 560, y: 140},
        data: {label: 'Add label: Onboarding'}
    },
    {
        id: 'end',
        type: 'output',
        position: {x: 820, y: 80},
        data: {label: 'End'}
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
            <div className="flex-1">
                <ReactFlow
                    edges={edges}
                    nodes={nodes}
                    fitView
                    onConnect={onConnect}
                    onEdgesChange={onEdgesChange}
                    onNodesChange={onNodesChange}
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
};

export default AutomationEditor;
export const Component = AutomationEditor;
