import '@xyflow/react/dist/style.css';
import React, {useCallback, useState} from 'react';
import {
    Background,
    BaseEdge,
    Connection,
    Edge,
    EdgeProps,
    Node,
    Position,
    ReactFlow,
    addEdge,
    getSmoothStepPath,
    useEdgesState,
    useNodesState
} from '@xyflow/react';
import {Button, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Label, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getAutomationById} from './mock-data';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useRef} from 'react';
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
    buildNode('email-2', {x: 240, y: 540})
];

const initialEdges: Edge[] = [
    {id: 'e1', source: 'trigger', target: 'email-1'},
    {id: 'e2', source: 'email-1', target: 'wait-1'},
    {id: 'e3', source: 'wait-1', target: 'email-2'}
];

const TAIL_NODE_ID = '__tail__';

type AddStepOption = {id: string; icon: React.ElementType; title: string; description: string};

const addStepOptions: AddStepOption[] = [
    {id: 'email', icon: LucideIcon.Mail, title: 'Email', description: 'Send an email'},
    {id: 'delay', icon: LucideIcon.Clock, title: 'Delay', description: 'Wait for a time or a date'}
];

const AddStepMenu: React.FC<{children: React.ReactNode; disabledIds?: string[]}> = ({children, disabledIds = []}) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64" sideOffset={8}>
            {addStepOptions.map(({id, icon: Icon, title, description}) => {
                const isDisabled = disabledIds.includes(id);
                return (
                    <DropdownMenuItem key={id} className="gap-3 py-2" disabled={isDisabled}>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-grey-100 text-grey-700">
                            <Icon className="size-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{title}</span>
                            <span className="text-xs text-grey-600">{description}</span>
                        </div>
                    </DropdownMenuItem>
                );
            })}
        </DropdownMenuContent>
    </DropdownMenu>
);

const PlusEdge: React.FC<EdgeProps> = ({source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd}) => {
    const [path, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 40
    });
    const sourceMeta = stepMeta[source];
    const targetMeta = stepMeta[target];
    const disabledIds = sourceMeta?.type === 'Wait' || targetMeta?.type === 'Wait' ? ['delay'] : [];

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
                <AddStepMenu disabledIds={disabledIds}>
                    <button
                        aria-label="Add step"
                        className="pointer-events-auto flex size-5 items-center justify-center rounded-full bg-blue-500 text-white opacity-0 shadow-md transition-opacity hover:bg-blue-600"
                        type="button"
                    >
                        <LucideIcon.Plus className="size-3" />
                    </button>
                </AddStepMenu>
            </foreignObject>
        </>
    );
};

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

const edgeTypes = {plus: PlusEdge, smooth: SmoothEdge};

const SidebarShell: React.FC<{children: React.ReactNode}> = ({children}) => (
    <aside className="absolute top-0 right-0 bottom-0 flex w-[36rem] animate-in flex-col gap-6 overflow-y-auto border-l bg-background p-6 duration-200 slide-in-from-right-10">
        {children}
    </aside>
);

const SidebarField: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
    <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-grey-600">{label}</span>
        <div className="text-sm">{children}</div>
    </div>
);

const triggerGroups: {label: string; options: {value: string; label: string}[]}[] = [
    {
        label: 'Members',
        options: [
            {value: 'signup', label: 'New member sign up'},
            {value: 'unsubscribe', label: 'Member unsubscribes'},
            {value: 'upgrade', label: 'Member upgrades'},
            {value: 'subscription-cancelled', label: 'Subscription cancelled'}
        ]
    },
    {
        label: 'Engagement',
        options: [
            {value: 'inactive', label: 'Member inactive for a period'},
            {value: 'engagement-threshold', label: 'Engagement threshold reached'},
            {value: 'label-added', label: 'A label is added to a member'}
        ]
    },
    {
        label: 'Content',
        options: [
            {value: 'newsletter-sent', label: 'Newsletter sent'},
            {value: 'post-published', label: 'Post published'}
        ]
    }
];

const tierOptions = [
    {value: 'free', label: 'Free'},
    {value: 'paid', label: 'Paid'},
    {value: 'comp', label: 'Complimentary'}
];

const TriggerStepBody: React.FC = () => {
    const [trigger, setTrigger] = useState('signup');
    const [tiers, setTiers] = useState<string[]>(['free', 'paid']);
    const toggleTier = (value: string) => setTiers(curr => (curr.includes(value) ? curr.filter(v => v !== value) : [...curr, value]));
    return (
        <div className="flex flex-col gap-5">
            <SidebarField label="Trigger">
                <Select value={trigger} onValueChange={setTrigger}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {triggerGroups.map(group => (
                            <SelectGroup key={group.label}>
                                <SelectLabel>{group.label}</SelectLabel>
                                {group.options.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
            </SidebarField>
            <SidebarField label="Tier">
                <div className="flex flex-col gap-2">
                    {tierOptions.map(opt => (
                        <Label key={opt.value} className="flex cursor-pointer items-center gap-2 font-normal">
                            <Checkbox
                                checked={tiers.includes(opt.value)}
                                onCheckedChange={() => toggleTier(opt.value)}
                            />
                            <span>{opt.label}</span>
                        </Label>
                    ))}
                </div>
            </SidebarField>
        </div>
    );
};

const delayUnits = [
    {value: 'minutes', label: 'Minutes'},
    {value: 'hours', label: 'Hours'},
    {value: 'days', label: 'Days'}
];

const parseDelay = (value: string | undefined): {amount: string; unit: string} => {
    if (!value) {
        return {amount: '1', unit: 'days'};
    }
    const match = value.match(/^(\d+)\s*(minute|hour|day)s?$/i);
    if (!match) {
        return {amount: '1', unit: 'days'};
    }
    return {amount: match[1], unit: `${match[2].toLowerCase()}s`};
};

const DelayStepBody: React.FC<{initialValue?: string}> = ({initialValue}) => {
    const parsed = parseDelay(initialValue);
    const [amount, setAmount] = useState(parsed.amount);
    const [unit, setUnit] = useState(parsed.unit);
    return (
        <SidebarField label="Wait for">
            <div className="flex items-center gap-2">
                <Input
                    className="w-24"
                    min={0}
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                />
                <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="flex-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {delayUnits.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </SidebarField>
    );
};

const SendEmailStepBody: React.FC<{initialSubject?: string; onEdit: () => void}> = ({initialSubject, onEdit}) => {
    const [subject, setSubject] = useState(initialSubject ?? 'Welcome to The Blueprint');
    const [preview, setPreview] = useState('Your first issue is on the way');
    return (
        <div className="flex flex-col gap-5">
            <SidebarField label="Subject line">
                <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </SidebarField>
            <SidebarField label="Preview text">
                <Input value={preview} onChange={e => setPreview(e.target.value)} />
            </SidebarField>
            <Button className="w-full" variant="outline" onClick={onEdit}>
                <LucideIcon.Pencil /> Edit email
            </Button>
        </div>
    );
};

const EmailEditorModal: React.FC<{onClose: () => void}> = ({onClose}) => (
    <div className="fixed inset-0 z-[60] flex animate-in flex-col bg-background duration-200 fade-in-0">
        <header className="relative z-10 flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-sm">
            <div className="flex items-center gap-3">
                <Button aria-label="Close email editor" size="icon" variant="ghost" onClick={onClose}>
                    <LucideIcon.ArrowLeft />
                </Button>
                <span className="font-medium">Edit email</span>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={onClose}>Done</Button>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-grey-75">
            <article className="mx-auto my-10 flex max-w-2xl flex-col gap-6 rounded-lg border bg-background p-10 shadow-sm">
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium tracking-wide text-grey-600 uppercase">The Blueprint · Issue 01</span>
                    <h1 className="text-3xl font-semibold">Welcome to The Blueprint</h1>
                </div>
                <p className="text-sm text-grey-600">Your first issue is on the way</p>
                <div className="flex flex-col gap-4 text-base leading-relaxed text-grey-800">
                    <p>Hey there — thanks for signing up. Every Tuesday, we unpack one idea, one tool, and one story from the world of independent publishing.</p>
                    <p>Before your first proper issue lands next week, here are three things worth knowing:</p>
                    <ol className="flex list-decimal flex-col gap-2 pl-6">
                        <li>Replies come straight to our inbox — we read everything.</li>
                        <li>Every issue is archived at blueprint.example.com/archive.</li>
                        <li>If you ever want to take a break, the unsubscribe link at the bottom of each email does the trick.</li>
                    </ol>
                    <p>Until next week,<br />— The Blueprint team</p>
                </div>
            </article>
        </div>
    </div>
);

const StepSidebarBody: React.FC<{nodeId: string; onDelete: () => void; onEditEmail: () => void}> = ({nodeId, onDelete, onEditEmail}) => {
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
            {meta.type === 'Trigger' && <TriggerStepBody />}
            {meta.type === 'Wait' && <DelayStepBody initialValue={meta.value} />}
            {meta.type === 'Send email' && <SendEmailStepBody initialSubject={meta.value} onEdit={onEditEmail} />}
            <div className="mt-auto pt-6">
                <Button
                    className="w-full border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                    variant="outline"
                    onClick={onDelete}
                >
                    <LucideIcon.Trash2 /> Delete step
                </Button>
            </div>
        </>
    );
};

const NODE_COLUMN_CENTER_X = 240 + 128;

const V1Editor: React.FC = () => {
    const navigate = useNavigate();
    const toVersioned = useVersionLink();
    const {id} = useParams<{id: string}>();
    const automation = id ? getAutomationById(id) : undefined;
    const title = automation?.name ?? 'Automation';
    const isDraft = automation?.status === 'draft';
    const canvasRef = useRef<HTMLDivElement>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [emailEditorOpen, setEmailEditorOpen] = useState(false);
    const onConnect = useCallback(
        (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
        [setEdges]
    );

    const goBack = () => navigate(toVersioned('/automations'));

    const workflowNodes: Node[] = (() => {
        if (nodes.length === 0) {
            return nodes;
        }
        const last = nodes[nodes.length - 1];
        return [...nodes, {
            id: TAIL_NODE_ID,
            position: {x: 240, y: last.position.y + 180},
            draggable: false,
            connectable: false,
            data: {label: <LucideIcon.Plus className="size-5 text-grey-500" strokeWidth={1.5} />},
            className: 'flex! items-center! justify-center! border! border-dashed! border-grey-300! rounded-lg! w-64! h-12!'
        }];
    })();

    const workflowEdges: Edge[] = (() => {
        if (nodes.length === 0) {
            return edges;
        }
        const last = nodes[nodes.length - 1];
        return [...edges, {
            id: 'e-tail',
            source: last.id,
            target: TAIL_NODE_ID,
            type: 'smooth',
            style: {stroke: 'var(--color-grey-500)'}
        }];
    })();

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
                .react-flow__edge:has(.automation-edge-plus):hover .react-flow__edge-path,
                .automation-edge-plus > button:hover ~ .react-flow__edge-path { stroke: var(--color-blue-500) !important; }
            `}</style>
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <div ref={canvasRef} className="flex-1 bg-grey-75">
                    <ReactFlow
                        defaultEdgeOptions={{type: 'plus', style: {stroke: 'var(--color-grey-500)'}}}
                        edges={workflowEdges}
                        edgeTypes={edgeTypes}
                        nodes={workflowNodes}
                        nodesConnectable={false}
                        nodesDraggable={false}
                        zoomOnScroll={false}
                        panOnScroll
                        onConnect={onConnect}
                        onEdgesChange={onEdgesChange}
                        onInit={(instance) => {
                            const width = canvasRef.current?.clientWidth ?? 1200;
                            instance.setViewport({x: Math.round(width / 2 - NODE_COLUMN_CENTER_X), y: 40, zoom: 1});
                        }}
                        onNodeClick={(_, node) => node.id !== TAIL_NODE_ID && setSelectedNodeId(node.id)}
                        onNodesChange={onNodesChange}
                        onPaneClick={() => setSelectedNodeId(null)}
                    >
                        <Background color="var(--color-grey-400)" />
                    </ReactFlow>
                </div>
                {selectedNodeId && (
                    <SidebarShell>
                        <StepSidebarBody
                            nodeId={selectedNodeId}
                            onDelete={() => {
                                const targetId = selectedNodeId;
                                setNodes(curr => curr.filter(n => n.id !== targetId));
                                setEdges(curr => curr.filter(e => e.source !== targetId && e.target !== targetId));
                                setSelectedNodeId(null);
                            }}
                            onEditEmail={() => setEmailEditorOpen(true)}
                        />
                    </SidebarShell>
                )}
            </div>
            {emailEditorOpen && <EmailEditorModal onClose={() => setEmailEditorOpen(false)} />}
        </div>
    );
};

export default V1Editor;
export const Component = V1Editor;
