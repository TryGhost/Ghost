import '@xyflow/react/dist/style.css';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AutomationStatus, getAutomationById, setAutomationStatus} from './mock-data';
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
import {Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Label, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
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

const buildEmailNode = (id: string, position: {x: number; y: number}, value: string): Node => ({
    id,
    position,
    data: {
        icon: LucideIcon.Mail,
        type: 'Send email',
        value,
        label: <NodeLabel icon={LucideIcon.Mail} type="Send email" value={value} />
    },
    ...nodeDefaults
});

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

// Per-automation in-memory graph store. Survives navigation within a session.
type GraphSnapshot = {nodes: Node[]; edges: Edge[]};
const graphStore = new Map<string, GraphSnapshot>();

const loadGraph = (id: string): GraphSnapshot => {
    const stored = graphStore.get(id);
    if (stored) {
        return {nodes: stored.nodes.map(n => ({...n})), edges: stored.edges.map(e => ({...e}))};
    }
    return {nodes: initialNodes.map(n => ({...n})), edges: initialEdges.map(e => ({...e}))};
};

const saveGraph = (id: string, nodes: Node[], edges: Edge[]): void => {
    // Strip the tail-only node so it doesn't get persisted as part of the flow
    const persistedNodes = nodes.filter(n => n.id !== TAIL_NODE_ID).map(n => ({...n}));
    graphStore.set(id, {nodes: persistedNodes, edges: edges.filter(e => e.target !== TAIL_NODE_ID).map(e => ({...e}))});
};

type AddStepOption = {id: string; icon: React.ElementType; title: string; description: string};

const addStepOptions: AddStepOption[] = [
    {id: 'email', icon: LucideIcon.Mail, title: 'Email', description: 'Send an email'},
    {id: 'delay', icon: LucideIcon.Clock, title: 'Delay', description: 'Wait for a time or a date'}
];

const AddStepMenu: React.FC<{
    children: React.ReactNode;
    disabledIds?: string[];
    onSelect?: (kind: string) => void;
}> = ({children, disabledIds = [], onSelect}) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64" sideOffset={8}>
            {addStepOptions.map(({id, icon: Icon, title, description}) => {
                const isDisabled = disabledIds.includes(id);
                return (
                    <DropdownMenuItem
                        key={id}
                        className="gap-3 py-2"
                        disabled={isDisabled}
                        onSelect={() => onSelect?.(id)}
                    >
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

const PlusEdge: React.FC<EdgeProps & {data?: {onAddStep?: (source: string, target: string, kind: string) => void}}> = (props) => {
    const {source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data} = props;
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
    const onAddStep = data?.onAddStep;

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
                <AddStepMenu
                    disabledIds={disabledIds}
                    onSelect={kind => onAddStep?.(source, target, kind)}
                >
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

const StepSidebarBody: React.FC<{
    nodeData: {type: string; value?: string} | undefined;
    nodeIcon: React.ElementType | undefined;
    onDelete: () => void;
    onEditEmail: () => void;
}> = ({nodeData, nodeIcon: Icon, onDelete, onEditEmail}) => {
    if (!nodeData || !Icon) {
        return null;
    }
    return (
        <>
            <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-grey-100 text-grey-700">
                    <Icon className="size-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-grey-600">Step</span>
                    <h2 className="text-base leading-tight font-semibold">{nodeData.type}</h2>
                </div>
            </div>
            {nodeData.type === 'Trigger' && <TriggerStepBody />}
            {nodeData.type === 'Wait' && <DelayStepBody initialValue={nodeData.value} />}
            {nodeData.type === 'Send email' && <SendEmailStepBody initialSubject={nodeData.value} onEdit={onEditEmail} />}
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

const StatusPill: React.FC<{status: AutomationStatus}> = ({status}) => {
    if (status === 'live') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                <span className="size-1.5 rounded-full bg-green-500" />
                LIVE
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-grey-100 px-2 py-0.5 text-xs font-medium text-grey-700">
            OFF
        </span>
    );
};

const SaveIndicator: React.FC<{state: 'idle' | 'saving' | 'saved'}> = ({state}) => {
    if (state === 'idle') {
        return null;
    }
    return (
        <span className="flex items-center gap-1 text-xs text-grey-600">
            {state === 'saving' && <LucideIcon.Loader2 className="size-3 animate-spin" />}
            {state === 'saved' && <LucideIcon.Check className="size-3" />}
            {state === 'saving' ? 'Saving…' : 'Saved'}
        </span>
    );
};

const NODE_COLUMN_CENTER_X = 240 + 128;

const V1Editor: React.FC = () => {
    const navigate = useNavigate();
    const toVersioned = useVersionLink();
    const {id} = useParams<{id: string}>();
    const automation = id ? getAutomationById(id) : undefined;
    const title = automation?.name ?? 'Automation';
    const canvasRef = useRef<HTMLDivElement>(null);

    const [status, setStatus] = useState<AutomationStatus>(automation?.status ?? 'off');
    const [isDirty, setIsDirty] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [publishing, setPublishing] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initialGraph = useMemo(() => (id ? loadGraph(id) : {nodes: initialNodes, edges: initialEdges}), [id]);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialGraph.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialGraph.edges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [emailEditorOpen, setEmailEditorOpen] = useState(false);
    const [turnOffOpen, setTurnOffOpen] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);

    useEffect(() => () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    }, []);

    const onConnect = useCallback(
        (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
        [setEdges]
    );

    const triggerSaveIndicator = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        setSaveState('saving');
        saveTimeoutRef.current = setTimeout(() => setSaveState('saved'), 600);
    };

    const handleAddStep = (sourceId: string, targetId: string, kind: string) => {
        if (kind !== 'email' || !id) {
            return;
        }
        const newId = `email-${Date.now()}`;
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        if (!sourceNode || !targetNode) {
            return;
        }
        const insertY = sourceNode.position.y + 180;
        const newNode = buildEmailNode(newId, {x: 240, y: insertY}, 'New email');

        const nextNodes = nodes.map((n) => {
            if (n.position.y >= insertY) {
                return {...n, position: {x: n.position.x, y: n.position.y + 180}};
            }
            return n;
        });
        nextNodes.push(newNode);

        const nextEdges = edges
            .filter(e => !(e.source === sourceId && e.target === targetId))
            .concat([
                {id: `e-${Date.now()}-a`, source: sourceId, target: newId},
                {id: `e-${Date.now()}-b`, source: newId, target: targetId}
            ]);

        setNodes(nextNodes);
        setEdges(nextEdges);

        if (status === 'off') {
            saveGraph(id, nextNodes, nextEdges);
            triggerSaveIndicator();
        } else {
            setIsDirty(true);
        }
    };

    const handlePublish = () => {
        if (!id) {
            return;
        }
        setPublishing(true);
        setTimeout(() => {
            saveGraph(id, nodes, edges);
            setAutomationStatus(id, 'live');
            setStatus('live');
            setIsDirty(false);
            setPublishing(false);
        }, 800);
    };

    const handlePublishChanges = () => {
        if (!id) {
            return;
        }
        setPublishing(true);
        setTimeout(() => {
            saveGraph(id, nodes, edges);
            setIsDirty(false);
            setPublishing(false);
        }, 800);
    };

    const handleConfirmTurnOff = () => {
        if (!id) {
            return;
        }
        setAutomationStatus(id, 'off');
        setStatus('off');
        setIsDirty(false);
        setTurnOffOpen(false);
    };

    const handleConfirmDiscard = () => {
        if (!id) {
            setDiscardOpen(false);
            navigate(toVersioned('/automations'));
            return;
        }
        const stored = loadGraph(id);
        setNodes(stored.nodes);
        setEdges(stored.edges);
        setIsDirty(false);
        setDiscardOpen(false);
        navigate(toVersioned('/automations'));
    };

    const handleBack = () => {
        if (status === 'live' && isDirty) {
            setDiscardOpen(true);
            return;
        }
        navigate(toVersioned('/automations'));
    };

    const workflowNodes: Node[] = (() => {
        if (nodes.length === 0) {
            return nodes;
        }
        const last = [...nodes].sort((a, b) => b.position.y - a.position.y)[0];
        return [...nodes, {
            id: TAIL_NODE_ID,
            position: {x: 240, y: last.position.y + 180},
            draggable: false,
            connectable: false,
            data: {label: <LucideIcon.Plus className="size-5 text-grey-500" strokeWidth={1.5} />},
            className: 'flex! items-center! justify-center! border! border-dashed! border-grey-300! rounded-lg! w-64! h-12!'
        }];
    })();

    const workflowEdges: Edge[] = useMemo(() => {
        const decoratedEdges = edges.map(e => ({
            ...e,
            data: {...e.data, onAddStep: handleAddStep}
        }));
        if (nodes.length === 0) {
            return decoratedEdges;
        }
        const last = [...nodes].sort((a, b) => b.position.y - a.position.y)[0];
        return [...decoratedEdges, {
            id: 'e-tail',
            source: last.id,
            target: TAIL_NODE_ID,
            type: 'smooth',
            style: {stroke: 'var(--color-grey-500)'}
        }];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [edges, nodes, status, isDirty]);

    const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
    const selectedNodeData = selectedNode?.data as {type: string; value?: string; icon?: React.ElementType} | undefined;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button aria-label="Back to automations" size="icon" variant="ghost" onClick={handleBack}>
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Button>
                    <span className="font-medium">{title}</span>
                    <StatusPill status={status} />
                </div>
                <div className="flex items-center gap-3">
                    {status === 'off' && <SaveIndicator state={saveState} />}
                    {status === 'off' && (
                        <Button disabled={publishing} onClick={handlePublish}>
                            {publishing ? <LucideIcon.Loader2 className="size-4 animate-spin" strokeWidth={2.5} /> : 'Publish'}
                        </Button>
                    )}
                    {status === 'live' && (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-label="More actions" size="icon" variant="ghost">
                                        <LucideIcon.MoreHorizontal strokeWidth={2} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setTurnOffOpen(true)}>
                                        <LucideIcon.Power /> Turn off
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {publishing ? (
                                <Button disabled>
                                    <LucideIcon.Loader2 className="size-4 animate-spin" strokeWidth={2.5} />
                                </Button>
                            ) : isDirty ? (
                                <Button onClick={handlePublishChanges}>Publish changes</Button>
                            ) : (
                                <Button variant="outline" disabled>Published</Button>
                            )}
                        </>
                    )}
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
                            nodeData={selectedNodeData}
                            nodeIcon={selectedNodeData?.icon}
                            onDelete={() => {
                                const targetId = selectedNodeId;
                                const nextNodes = nodes.filter(n => n.id !== targetId);
                                const nextEdges = edges.filter(e => e.source !== targetId && e.target !== targetId);
                                setNodes(nextNodes);
                                setEdges(nextEdges);
                                setSelectedNodeId(null);
                                if (id && status === 'off') {
                                    saveGraph(id, nextNodes, nextEdges);
                                    triggerSaveIndicator();
                                } else if (status === 'live') {
                                    setIsDirty(true);
                                }
                            }}
                            onEditEmail={() => setEmailEditorOpen(true)}
                        />
                    </SidebarShell>
                )}
            </div>
            {emailEditorOpen && <EmailEditorModal onClose={() => setEmailEditorOpen(false)} />}
            <Dialog open={turnOffOpen} onOpenChange={setTurnOffOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Turn off this automation?</DialogTitle>
                        <DialogDescription>It will stop running until you turn it back on.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTurnOffOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmTurnOff}>Turn off</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Discard changes?</DialogTitle>
                        <DialogDescription>You have unpublished changes that will be lost.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscardOpen(false)}>Cancel</Button>
                        <Button
                            className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                            variant="outline"
                            onClick={handleConfirmDiscard}
                        >
                            Discard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default V1Editor;
export const Component = V1Editor;
