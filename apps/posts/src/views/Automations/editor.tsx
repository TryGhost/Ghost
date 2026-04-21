import '@xyflow/react/dist/style.css';
import React, {useCallback, useState} from 'react';
import {
    Background,
    BaseEdge,
    Connection,
    Edge,
    EdgeProps,
    Node,
    Panel,
    Position,
    ReactFlow,
    addEdge,
    getSmoothStepPath,
    useEdgesState,
    useNodesState,
    useReactFlow,
    useViewport
} from '@xyflow/react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger} from '@tryghost/shade/components';
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

const PlusEdge: React.FC<EdgeProps> = ({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd}) => {
    const [path, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 40
    });

    return (
        <>
            <BaseEdge interactionWidth={30} markerEnd={markerEnd} path={path} style={style} />
            <foreignObject
                className="automation-edge-plus pointer-events-none overflow-visible"
                height={20}
                width={20}
                x={labelX - 10}
                y={labelY - 10}
            >
                <button
                    aria-label="Add step"
                    className="pointer-events-auto flex size-5 items-center justify-center rounded-full bg-blue-500 text-white opacity-0 shadow-md transition-opacity hover:bg-blue-600"
                    type="button"
                    // eslint-disable-next-line no-console
                    onClick={() => console.log('Add step on edge')}
                >
                    <LucideIcon.Plus className="size-3" />
                </button>
            </foreignObject>
        </>
    );
};

const edgeTypes = {plus: PlusEdge};

const ZoomControls: React.FC = () => {
    const {zoomIn, zoomOut, zoomTo} = useReactFlow();
    const {zoom} = useViewport();
    return (
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
            <Button aria-label="Zoom out" size="icon" variant="ghost" onClick={() => zoomOut()}>
                <LucideIcon.Minus />
            </Button>
            <button
                aria-label="Reset zoom to 100%"
                className="w-12 rounded-md py-1 text-center text-sm tabular-nums hover:bg-muted"
                type="button"
                onClick={() => zoomTo(1)}
            >
                {Math.round(zoom * 100)}%
            </button>
            <Button aria-label="Zoom in" size="icon" variant="ghost" onClick={() => zoomIn()}>
                <LucideIcon.Plus />
            </Button>
        </div>
    );
};

const NodeLabel: React.FC<NodeLabelProps> = ({icon: Icon, type, value}) => (
    <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-grey-600">
            <Icon className="size-3.5" />
            <span>{type}</span>
        </div>
        {value && <div className="font-medium">{value}</div>}
    </div>
);

type StepMeta = {icon: React.ElementType; type: string; value?: string; description?: string};

const stepMeta: Record<string, StepMeta> = {
    trigger: {icon: LucideIcon.Zap, type: 'Trigger', value: 'Member signs up', description: 'Runs when a new member completes signup.'},
    delay: {icon: LucideIcon.Clock, type: 'Wait', value: '1 day', description: 'Pauses the flow before moving to the next step.'},
    'send-email': {icon: LucideIcon.Mail, type: 'Send email', value: 'Welcome to The Blueprint', description: 'Sends the selected email to the member.'},
    'add-label': {icon: LucideIcon.Tag, type: 'Add label', value: 'Onboarding', description: 'Applies a label to the member for segmentation.'},
    end: {icon: LucideIcon.Flag, type: 'End', description: 'Marks the completion of the automation.'}
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
    buildNode('delay', {x: 240, y: 180}),
    buildNode('send-email', {x: 0, y: 360}),
    buildNode('add-label', {x: 480, y: 360}),
    buildNode('end', {x: 240, y: 540}, 'output')
];

const initialEdges: Edge[] = [
    {id: 'e1', source: 'trigger', target: 'delay'},
    {id: 'e2', source: 'delay', target: 'send-email'},
    {id: 'e3', source: 'delay', target: 'add-label'},
    {id: 'e4', source: 'send-email', target: 'end'},
    {id: 'e5', source: 'add-label', target: 'end'}
];

const SidebarField: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
    <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-grey-600">{label}</span>
        <div className="text-sm">{children}</div>
    </div>
);

const SidebarShell: React.FC<{width: string; children: React.ReactNode}> = ({width, children}) => (
    <aside
        className="absolute top-0 right-0 bottom-0 flex animate-in flex-col gap-6 overflow-y-auto border-l bg-background p-6 transition-[width] duration-200 slide-in-from-right-10"
        style={{width}}
    >
        {children}
    </aside>
);

const StepSidebarBody: React.FC<{nodeId: string}> = ({nodeId}) => {
    const meta = stepMeta[nodeId];
    if (!meta) {
        return null;
    }
    const Icon = meta.icon;
    return (
        <>
            <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-grey-100 text-grey-700">
                    <Icon className="size-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-grey-600">Step</span>
                    <h2 className="text-base leading-tight font-semibold">{meta.type}</h2>
                </div>
            </div>
            {meta.description && (
                <p className="text-sm text-grey-700">{meta.description}</p>
            )}
            {meta.value !== undefined && (
                <SidebarField label="Value">
                    <div className="rounded-md border bg-grey-75 px-3 py-2">{meta.value}</div>
                </SidebarField>
            )}
            <SidebarField label="Step ID">
                <code className="text-xs text-grey-700">{nodeId}</code>
            </SidebarField>
        </>
    );
};

type RunStatus = 'completed' | 'failed' | 'running';

type Run = {id: string; member: string; startedAt: string; status: RunStatus};

const mockRuns: Run[] = [
    {id: 'r-1042', member: 'amelia.harris@example.com', startedAt: '2026-04-21T09:14:00Z', status: 'completed'},
    {id: 'r-1041', member: 'danielle.kumar@example.com', startedAt: '2026-04-21T08:02:00Z', status: 'completed'},
    {id: 'r-1040', member: 'noah.bennet@example.com', startedAt: '2026-04-21T07:47:00Z', status: 'running'},
    {id: 'r-1039', member: 'priya.shah@example.com', startedAt: '2026-04-20T22:31:00Z', status: 'failed'},
    {id: 'r-1038', member: 'jake.thompson@example.com', startedAt: '2026-04-20T18:09:00Z', status: 'completed'}
];

const runStatusStyles: Record<RunStatus, string> = {
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    running: 'bg-blue-100 text-blue-800'
};

const formatRunTime = (iso: string): string => new Date(iso).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});

const RunsSidebarBody: React.FC = () => (
    <>
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-grey-600">Activity</span>
            <h2 className="text-base leading-tight font-semibold">Previous runs</h2>
        </div>
        <ul className="flex flex-col gap-2">
            {mockRuns.map(run => (
                <li key={run.id} className="flex flex-col gap-1 rounded-md border bg-grey-75 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{run.member}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${runStatusStyles[run.status]}`}>{run.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-grey-600">
                        <span>{formatRunTime(run.startedAt)}</span>
                        <code>{run.id}</code>
                    </div>
                </li>
            ))}
        </ul>
    </>
);

type SidebarState = {mode: 'step'; nodeId: string} | {mode: 'runs'} | null;

const AutomationEditor: React.FC = () => {
    const navigate = useNavigate();
    const {id} = useParams<{id: string}>();
    const existing = id && id !== 'new' ? getAutomationById(id) : undefined;
    const title = existing?.name ?? (id === 'new' ? 'New automation' : 'Automation');

    const [nodes, , onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
    const [sidebar, setSidebar] = useState<SidebarState>(null);

    const onConnect = useCallback(
        (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
        [setEdges]
    );

    const goBack = () => navigate('/automations');

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button aria-label="Back to automations" size="icon" variant="ghost" onClick={goBack}>
                        <LucideIcon.ArrowLeft />
                    </Button>
                    <span className="font-medium">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        aria-label="Previous runs"
                        className={sidebar?.mode === 'runs' ? 'bg-muted' : ''}
                        size="icon"
                        variant="ghost"
                        onClick={() => setSidebar(current => (current?.mode === 'runs' ? null : {mode: 'runs'}))}
                    >
                        <LucideIcon.BarChart3 />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-label="More actions" size="icon" variant="ghost">
                                <LucideIcon.MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <LucideIcon.Play className="mr-2 size-4" /> Test
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <LucideIcon.Copy className="mr-2 size-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <LucideIcon.Settings className="mr-2 size-4" /> Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <LucideIcon.Trash2 className="mr-2 size-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={goBack}>Publish</Button>
                </div>
            </header>
            <style>{`
                .react-flow__handle { opacity: 0 !important; }
                .react-flow__node.selectable:focus,
                .react-flow__node.selectable:focus-visible { outline: none !important; box-shadow: none !important; }
                .react-flow__node.selectable.selected,
                .react-flow__node.selectable.selected:focus,
                .react-flow__node.selectable.selected:focus-visible {
                    outline: 2px solid var(--color-blue-500) !important;
                    outline-offset: 2px;
                    box-shadow: var(--tw-shadow, 0 1px 2px 0 rgb(0 0 0 / 0.05)) !important;
                }
                .react-flow__edge:hover .automation-edge-plus > button,
                .automation-edge-plus > button:hover { opacity: 1; }
                .react-flow__edge:hover .react-flow__edge-path,
                .automation-edge-plus > button:hover ~ .react-flow__edge-path { stroke: var(--color-blue-500) !important; }
            `}</style>
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <div className="flex-1 bg-grey-75">
                    <ReactFlow
                        defaultEdgeOptions={{type: 'plus', style: {stroke: 'var(--color-grey-500)'}}}
                        edges={edges}
                        edgeTypes={edgeTypes}
                        fitViewOptions={{maxZoom: 1}}
                        nodes={nodes}
                        nodesDraggable={false}
                        fitView
                        onConnect={onConnect}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={(_, node) => setSidebar({mode: 'step', nodeId: node.id})}
                        onNodesChange={onNodesChange}
                        onPaneClick={() => setSidebar(null)}
                    >
                        <Background color="var(--color-grey-400)" />
                        <Panel position="bottom-left">
                            <ZoomControls />
                        </Panel>
                    </ReactFlow>
                </div>
                {sidebar && (
                    <SidebarShell width={sidebar.mode === 'runs' ? '60rem' : '36rem'}>
                        {sidebar.mode === 'step' && <StepSidebarBody nodeId={sidebar.nodeId} />}
                        {sidebar.mode === 'runs' && <RunsSidebarBody />}
                    </SidebarShell>
                )}
            </div>
        </div>
    );
};

export default AutomationEditor;
export const Component = AutomationEditor;
