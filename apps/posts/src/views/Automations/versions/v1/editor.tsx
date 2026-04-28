import '@xyflow/react/dist/style.css';
import React, {useRef} from 'react';
import {
    Background,
    BaseEdge,
    Edge,
    EdgeProps,
    Node,
    Position,
    ReactFlow,
    getSmoothStepPath
} from '@xyflow/react';
import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getAutomationById} from './mock-data';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useVersionLink} from '../../use-version-link';

type StepMeta = {icon: React.ElementType; type: string; value?: string};

const stepMeta: Record<string, StepMeta> = {
    trigger: {icon: LucideIcon.Zap, type: 'Trigger', value: 'Member signs up'},
    'email-1': {icon: LucideIcon.Mail, type: 'Send email', value: 'Welcome to The Blueprint'},
    'wait-1': {icon: LucideIcon.Clock, type: 'Wait', value: '1 day'},
    'email-2': {icon: LucideIcon.Mail, type: 'Send email', value: 'Reader favorites'}
};

const NodeLabel: React.FC<{icon: React.ElementType; type: string; value?: string}> = ({icon: Icon, type, value}) => (
    <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-grey-100 text-grey-700">
            <Icon className="size-4" />
        </div>
        <div className="flex min-w-0 flex-col">
            <span className="text-xs text-grey-600">{type}</span>
            {value && <span className="truncate font-medium">{value}</span>}
        </div>
    </div>
);

const nodeDefaults = {
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    className: 'border-0! shadow-sm text-sm! px-4! py-3! rounded-lg! w-64! text-left!'
};

const buildNode = (id: string, position: {x: number; y: number}, type?: 'input' | 'output'): Node => {
    const meta = stepMeta[id];
    return {
        id,
        type,
        position,
        data: {
            ...meta,
            label: <NodeLabel icon={meta.icon} type={meta.type} value={meta.value} />
        },
        ...nodeDefaults
    };
};

const initialNodes: Node[] = [
    buildNode('trigger', {x: 240, y: 0}, 'input'),
    buildNode('email-1', {x: 240, y: 180}),
    buildNode('wait-1', {x: 240, y: 360}),
    buildNode('email-2', {x: 240, y: 540}, 'output')
];

const initialEdges: Edge[] = [
    {id: 'e1', source: 'trigger', target: 'email-1'},
    {id: 'e2', source: 'email-1', target: 'wait-1'},
    {id: 'e3', source: 'wait-1', target: 'email-2'}
];

const SmoothEdge: React.FC<EdgeProps> = ({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd}) => {
    const [path] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 40
    });
    return <BaseEdge interactionWidth={0} markerEnd={markerEnd} path={path} style={style} />;
};

const edgeTypes = {smooth: SmoothEdge};

const NODE_COLUMN_CENTER_X = 240 + 128;

const V1Editor: React.FC = () => {
    const navigate = useNavigate();
    const toVersioned = useVersionLink();
    const {id} = useParams<{id: string}>();
    const automation = id ? getAutomationById(id) : undefined;
    const title = automation?.name ?? 'Automation';
    const isDraft = automation?.status === 'draft';
    const canvasRef = useRef<HTMLDivElement>(null);

    const goBack = () => navigate(toVersioned('/automations'));

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button aria-label="Back to automations" size="icon" variant="ghost" onClick={goBack}>
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Button>
                    <span className="font-medium">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={goBack}>{isDraft ? 'Publish' : 'Unpublish'}</Button>
                </div>
            </header>
            <style>{`.react-flow__handle { opacity: 0 !important; }`}</style>
            <div className="flex min-h-0 flex-1 overflow-hidden">
                <div ref={canvasRef} className="flex-1 bg-grey-75">
                    <ReactFlow
                        defaultEdgeOptions={{type: 'smooth', style: {stroke: 'var(--color-grey-500)'}}}
                        edges={initialEdges}
                        edgeTypes={edgeTypes}
                        nodes={initialNodes}
                        nodesConnectable={false}
                        nodesDraggable={false}
                        zoomOnScroll={false}
                        panOnScroll
                        onInit={(instance) => {
                            const width = canvasRef.current?.clientWidth ?? 1200;
                            instance.setViewport({x: Math.round(width / 2 - NODE_COLUMN_CENTER_X), y: 40, zoom: 1});
                        }}
                    >
                        <Background color="var(--color-grey-400)" />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
};

export default V1Editor;
export const Component = V1Editor;
