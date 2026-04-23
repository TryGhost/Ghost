import '@xyflow/react/dist/style.css';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
    Background,
    BaseEdge,
    Connection,
    Edge,
    EdgeProps,
    Handle,
    Node,
    NodeProps,
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
import {Badge, Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Input, Label, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getAutomationById, mockAutomations} from './mock-data';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

const nodeDefaults = {
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    className: 'border-0! shadow-sm text-sm! px-4! py-3! rounded-lg! w-64! text-left!'
};

type NodeLabelProps = {
    icon: React.ElementType;
    type: string;
    value?: string;
};

type AddStepOption = {id: string; icon: React.ElementType; title: string; description: string};

const addStepOptions: AddStepOption[] = [
    {id: 'email', icon: LucideIcon.Mail, title: 'Email', description: 'Send an email'},
    {id: 'action', icon: LucideIcon.UserCog, title: 'Action', description: 'Manage subscribers'},
    {id: 'delay', icon: LucideIcon.Clock, title: 'Delay', description: 'Wait for a time or a date'},
    {id: 'wait-until', icon: LucideIcon.Hourglass, title: 'Wait until', description: 'Wait until an event or condition'},
    {id: 'branch', icon: LucideIcon.GitBranch, title: 'Branch', description: 'Split based on a condition'}
];

const AddStepMenu: React.FC<{children: React.ReactNode}> = ({children}) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64" sideOffset={8}>
            {addStepOptions.map(({id, icon: Icon, title, description}) => (
                <DropdownMenuItem key={id} className="gap-3 py-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-grey-100 text-grey-700">
                        <Icon className="size-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{title}</span>
                        <span className="text-xs text-grey-600">{description}</span>
                    </div>
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
);

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
                <AddStepMenu>
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

const RunEdge: React.FC<EdgeProps> = ({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd}) => {
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

const edgeTypes = {plus: PlusEdge, run: RunEdge};

const StopMarkerNode: React.FC<NodeProps> = ({data}) => {
    const reason = (data as {reason?: string}).reason;
    return (
        <>
            <Handle position={Position.Top} type="target" />
            <div className="flex w-64 items-center justify-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700">
                <LucideIcon.Square className="size-3" strokeWidth={2.5} />
                <span>Stopped</span>
                {reason && (
                    <>
                        <span className="text-orange-600">·</span>
                        <span className="truncate text-orange-600">{reason}</span>
                    </>
                )}
            </div>
            <Handle position={Position.Bottom} type="source" />
        </>
    );
};

const CompletedMarkerNode: React.FC<NodeProps> = () => (
    <>
        <Handle position={Position.Top} type="target" />
        <div className="flex w-64 items-center justify-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800">
            <LucideIcon.Check className="size-3" strokeWidth={2.5} />
            <span>Completed workflow</span>
        </div>
    </>
);

const nodeTypes = {'stop-marker': StopMarkerNode, 'completed-marker': CompletedMarkerNode};

type StopConditionKind = 'upgrade' | 'unsubscribe' | 'cancel' | 'label-added';

type StopCondition = {id: string; kind: StopConditionKind};

const stopConditionCatalog: Record<StopConditionKind, {icon: React.ElementType; label: string}> = {
    upgrade: {icon: LucideIcon.Sparkles, label: 'Member upgrades'},
    unsubscribe: {icon: LucideIcon.LogOut, label: 'Member unsubscribes'},
    cancel: {icon: LucideIcon.X, label: 'Subscription cancelled'},
    'label-added': {icon: LucideIcon.Tag, label: 'Label added'}
};

const defaultStopConditions: StopCondition[] = [
    {id: 'ec-1', kind: 'upgrade'},
    {id: 'ec-2', kind: 'unsubscribe'}
];

const mockMemberLabels = [
    {value: 'onboarding', label: 'Onboarding'},
    {value: 'paid', label: 'Paid'},
    {value: 'vip', label: 'VIP'},
    {value: 'inactive', label: 'Inactive'}
];

const StopConditionsBar: React.FC<{
    conditions: StopCondition[];
    editable: boolean;
    onAdd?: (kind: StopConditionKind) => void;
    onRemove?: (id: string) => void;
}> = ({conditions, editable, onAdd, onRemove}) => {
    const availableKinds = (Object.keys(stopConditionCatalog) as StopConditionKind[])
        .filter(kind => !conditions.some(c => c.kind === kind));
    return (
        <div className="flex flex-wrap items-center gap-2">
            {conditions.map((condition) => {
                const meta = stopConditionCatalog[condition.kind];
                const Icon = meta.icon;
                return (
                    <span
                        key={condition.id}
                        className="inline-flex items-center gap-1 rounded-full bg-grey-100 px-2 py-1 text-xs font-medium text-grey-800"
                    >
                        <Icon className="size-3" />
                        <span>{meta.label}</span>
                        {editable && onRemove && (
                            <button
                                aria-label={`Remove stop condition ${meta.label}`}
                                className="ml-0.5 flex size-4 items-center justify-center rounded-full text-grey-600 hover:bg-grey-200 hover:text-grey-800"
                                type="button"
                                onClick={() => onRemove(condition.id)}
                            >
                                <LucideIcon.X className="size-3" />
                            </button>
                        )}
                    </span>
                );
            })}
            {editable && onAdd && availableKinds.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            aria-label="Add stop condition"
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-grey-300 px-2 py-1 text-xs font-medium text-grey-700 hover:border-solid hover:bg-grey-100"
                            type="button"
                        >
                            <LucideIcon.Plus className="size-3" />
                            Add
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {availableKinds.map((kind) => {
                            const meta = stopConditionCatalog[kind];
                            const Icon = meta.icon;
                            return (
                                <DropdownMenuItem key={kind} onClick={() => onAdd(kind)}>
                                    <Icon />
                                    {meta.label}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
};

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

type StepMeta = {icon: React.ElementType; type: string; value?: string; description?: string};

const stepMeta: Record<string, StepMeta> = {
    trigger: {icon: LucideIcon.Zap, type: 'Trigger', value: 'Member signs up', description: 'Runs when a new member completes signup.'},
    'email-1': {icon: LucideIcon.Mail, type: 'Send email', value: 'Welcome to The Blueprint', description: 'Sends the selected email to the member.'},
    'wait-1': {icon: LucideIcon.Clock, type: 'Wait', value: '2 days', description: 'Pauses the flow before moving to the next step.'},
    'email-2': {icon: LucideIcon.Mail, type: 'Send email', value: 'Reader favorites', description: 'Sends the selected email to the member.'},
    'wait-2': {icon: LucideIcon.Clock, type: 'Wait', value: '3 days', description: 'Pauses the flow before moving to the next step.'},
    'email-3': {icon: LucideIcon.Mail, type: 'Send email', value: 'Become a paid member', description: 'Sends the selected email to the member.'},
    'add-label': {icon: LucideIcon.Tag, type: 'Add label', value: 'Onboarded', description: 'Applies a label to the member for segmentation.'}
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
    buildNode('email-2', {x: 240, y: 540}),
    buildNode('wait-2', {x: 240, y: 720}),
    buildNode('email-3', {x: 240, y: 900}),
    buildNode('add-label', {x: 240, y: 1080})
];

const initialEdges: Edge[] = [
    {id: 'e1', source: 'trigger', target: 'email-1'},
    {id: 'e2', source: 'email-1', target: 'wait-1'},
    {id: 'e3', source: 'wait-1', target: 'email-2'},
    {id: 'e4', source: 'email-2', target: 'wait-2'},
    {id: 'e5', source: 'wait-2', target: 'email-3'},
    {id: 'e6', source: 'email-3', target: 'add-label'}
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

type TriggerOption = {value: string; label: string};

const triggerGroups: {label: string; options: TriggerOption[]}[] = [
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
    const toggleTier = (value: string) => setTiers(current => (current.includes(value) ? current.filter(v => v !== value) : [...current, value]));

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

const SendEmailStepBody: React.FC<{onEdit: () => void; initialSubject?: string}> = ({onEdit, initialSubject}) => {
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
            {meta.type === 'Add label' && (
                <SidebarField label="Label">
                    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2">
                        <Badge variant="secondary">
                            <LucideIcon.Tag className="mr-1 size-3" />
                            {meta.value}
                        </Badge>
                    </div>
                </SidebarField>
            )}
            {meta.type !== 'Trigger' && meta.type !== 'Wait' && meta.type !== 'Add label' && meta.type !== 'Send email' && (
                <>
                    {meta.description && (
                        <p className="text-sm text-grey-700">{meta.description}</p>
                    )}
                    {meta.value !== undefined && (
                        <SidebarField label="Value">
                            <div className="rounded-md border bg-grey-75 px-3 py-2">{meta.value}</div>
                        </SidebarField>
                    )}
                </>
            )}
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

type RunStatus = 'completed' | 'failed' | 'running' | 'stopped';

type RunStepStatus = 'completed' | 'failed' | 'pending' | 'skipped' | 'stopped';

type RunStep = {stepId: string; at?: string; status: RunStepStatus; note?: string; durationMs?: number};

type Run = {id: string; member: string; startedAt: string; status: RunStatus; durationMs?: number; timeline: RunStep[]; stopReason?: string};

const FIVE_DAYS_MS = 5 * 86_400_000;
const TWO_DAYS_MS = 2 * 86_400_000;
const THREE_DAYS_MS = 3 * 86_400_000;

const mockRuns: Run[] = [
    {
        id: 'r-1042',
        member: 'amelia.harris@example.com',
        startedAt: '2026-04-18T09:14:00Z',
        status: 'completed',
        durationMs: FIVE_DAYS_MS,
        timeline: [
            {stepId: 'trigger', at: '2026-04-18T09:14:00Z', status: 'completed', durationMs: 80},
            {stepId: 'email-1', at: '2026-04-18T09:14:00Z', status: 'completed', note: 'Delivered', durationMs: 380},
            {stepId: 'wait-1', at: '2026-04-18T09:14:01Z', status: 'completed', note: 'Waited 2 days', durationMs: TWO_DAYS_MS},
            {stepId: 'email-2', at: '2026-04-20T09:14:01Z', status: 'completed', note: 'Delivered', durationMs: 410},
            {stepId: 'wait-2', at: '2026-04-20T09:14:02Z', status: 'completed', note: 'Waited 3 days', durationMs: THREE_DAYS_MS},
            {stepId: 'email-3', at: '2026-04-23T09:14:02Z', status: 'completed', note: 'Delivered', durationMs: 320},
            {stepId: 'add-label', at: '2026-04-23T09:14:02Z', status: 'completed', durationMs: 42}
        ]
    },
    {
        id: 'r-1041',
        member: 'danielle.kumar@example.com',
        startedAt: '2026-04-18T08:02:00Z',
        status: 'stopped',
        stopReason: 'Member upgraded',
        durationMs: TWO_DAYS_MS + 4_000,
        timeline: [
            {stepId: 'trigger', at: '2026-04-18T08:02:00Z', status: 'completed', durationMs: 65},
            {stepId: 'email-1', at: '2026-04-18T08:02:00Z', status: 'completed', note: 'Opened', durationMs: 410},
            {stepId: 'wait-1', at: '2026-04-18T08:02:01Z', status: 'completed', durationMs: TWO_DAYS_MS},
            {stepId: 'email-2', at: '2026-04-20T08:02:04Z', status: 'stopped', note: 'Stopped: Member upgraded', durationMs: 120},
            {stepId: 'wait-2', status: 'skipped'},
            {stepId: 'email-3', status: 'skipped'},
            {stepId: 'add-label', status: 'skipped'}
        ]
    },
    {
        id: 'r-1037',
        member: 'taylor.nguyen@example.com',
        startedAt: '2026-04-16T10:12:00Z',
        status: 'stopped',
        stopReason: 'Member unsubscribed',
        durationMs: THREE_DAYS_MS + 45_000,
        timeline: [
            {stepId: 'trigger', at: '2026-04-16T10:12:00Z', status: 'completed', durationMs: 70},
            {stepId: 'email-1', at: '2026-04-16T10:12:00Z', status: 'completed', note: 'Delivered', durationMs: 392},
            {stepId: 'wait-1', at: '2026-04-16T10:12:01Z', status: 'completed', durationMs: TWO_DAYS_MS},
            {stepId: 'email-2', at: '2026-04-18T10:12:01Z', status: 'completed', note: 'Clicked unsubscribe', durationMs: 402},
            {stepId: 'wait-2', at: '2026-04-18T10:12:02Z', status: 'stopped', note: 'Stopped: Member unsubscribed', durationMs: 45_000},
            {stepId: 'email-3', status: 'skipped'},
            {stepId: 'add-label', status: 'skipped'}
        ]
    },
    {
        id: 'r-1040',
        member: 'noah.bennet@example.com',
        startedAt: '2026-04-22T07:47:00Z',
        status: 'running',
        timeline: [
            {stepId: 'trigger', at: '2026-04-22T07:47:00Z', status: 'completed', durationMs: 73},
            {stepId: 'email-1', at: '2026-04-22T07:47:00Z', status: 'completed', note: 'Delivered', durationMs: 360},
            {stepId: 'wait-1', at: '2026-04-22T07:47:01Z', status: 'pending', note: 'Waiting 2 days'},
            {stepId: 'email-2', status: 'pending'},
            {stepId: 'wait-2', status: 'pending'},
            {stepId: 'email-3', status: 'pending'},
            {stepId: 'add-label', status: 'pending'}
        ]
    },
    {
        id: 'r-1039',
        member: 'priya.shah@example.com',
        startedAt: '2026-04-18T22:31:00Z',
        status: 'failed',
        durationMs: TWO_DAYS_MS + 12_000,
        timeline: [
            {stepId: 'trigger', at: '2026-04-18T22:31:00Z', status: 'completed', durationMs: 58},
            {stepId: 'email-1', at: '2026-04-18T22:31:00Z', status: 'completed', note: 'Delivered', durationMs: 402},
            {stepId: 'wait-1', at: '2026-04-18T22:31:01Z', status: 'completed', durationMs: TWO_DAYS_MS},
            {stepId: 'email-2', at: '2026-04-20T22:31:12Z', status: 'failed', note: 'Bounced: mailbox full', durationMs: 1_120},
            {stepId: 'wait-2', status: 'skipped'},
            {stepId: 'email-3', status: 'skipped'},
            {stepId: 'add-label', status: 'skipped'}
        ]
    },
    {
        id: 'r-1038',
        member: 'jake.thompson@example.com',
        startedAt: '2026-04-17T18:09:00Z',
        status: 'completed',
        durationMs: FIVE_DAYS_MS,
        timeline: [
            {stepId: 'trigger', at: '2026-04-17T18:09:00Z', status: 'completed', durationMs: 91},
            {stepId: 'email-1', at: '2026-04-17T18:09:00Z', status: 'completed', durationMs: 340},
            {stepId: 'wait-1', at: '2026-04-17T18:09:01Z', status: 'completed', durationMs: TWO_DAYS_MS},
            {stepId: 'email-2', at: '2026-04-19T18:09:01Z', status: 'completed', durationMs: 372},
            {stepId: 'wait-2', at: '2026-04-19T18:09:02Z', status: 'completed', durationMs: THREE_DAYS_MS},
            {stepId: 'email-3', at: '2026-04-22T18:09:02Z', status: 'completed', durationMs: 318},
            {stepId: 'add-label', at: '2026-04-22T18:09:02Z', status: 'completed', durationMs: 37}
        ]
    }
];

const runStepPillStyles: Record<RunStepStatus, string> = {
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-blue-100 text-blue-800',
    skipped: 'bg-grey-100 text-grey-600',
    stopped: 'bg-orange-100 text-orange-600'
};

const formatStepDuration = (ms: number): string => {
    if (ms < 1000) {
        return '<1s';
    }
    if (ms < 60_000) {
        return `${Math.round(ms / 1000)}s`;
    }
    if (ms < 3_600_000) {
        return `${Math.round(ms / 60_000)}m`;
    }
    if (ms < 86_400_000) {
        return `${Math.round(ms / 3_600_000)}h`;
    }
    return `${Math.round(ms / 86_400_000)}d`;
};

const formatDuration = (ms: number): string => {
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    if (days > 0) {
        return `${days}d ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
};

const runStatusStyles: Record<RunStatus, string> = {
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    running: 'bg-blue-100 text-blue-800',
    stopped: 'bg-orange-100 text-orange-600'
};

const formatRunTime = (iso: string): string => new Date(iso).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});

const RunItem: React.FC<{run: Run; selected: boolean; onSelect: (id: string) => void}> = ({run, selected, onSelect}) => (
    <li className={`rounded-md border bg-grey-75 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        <button
            aria-pressed={selected}
            className="flex w-full flex-col gap-1 p-3 text-left hover:bg-grey-100"
            type="button"
            onClick={() => onSelect(run.id)}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{run.member}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${runStatusStyles[run.status]}`}>{run.status}</span>
            </div>
            <div className="text-xs text-grey-600">{formatRunTime(run.startedAt)}</div>
        </button>
    </li>
);

const AnalyticsPanel: React.FC<{selectedRunId: string; onSelectRun: (id: string) => void}> = ({selectedRunId, onSelectRun}) => {
    const [tab, setTab] = useState('runs');
    return (
        <Tabs className="flex flex-col gap-6" value={tab} onValueChange={setTab}>
            <div className="flex items-center justify-between gap-2">
                <TabsList>
                    <TabsTrigger value="runs">Runs</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                </TabsList>
                {tab === 'runs' && (
                    <TooltipProvider delayDuration={200}>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button aria-label="Filter runs" className="size-7 [&_svg]:size-3.5" size="icon" variant="ghost">
                                        <LucideIcon.ListFilter />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Filter runs</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button aria-label="Export runs" className="size-7 [&_svg]:size-3.5" size="icon" variant="ghost">
                                        <LucideIcon.Download />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Export runs</TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                )}
            </div>
            <TabsContent className="flex flex-col gap-2" value="runs">
                <ul className="flex flex-col gap-2">
                    {mockRuns.map(run => (
                        <RunItem
                            key={run.id}
                            run={run}
                            selected={run.id === selectedRunId}
                            onSelect={onSelectRun}
                        />
                    ))}
                </ul>
            </TabsContent>
            <TabsContent value="metrics">
                <p className="text-sm text-grey-600">Metrics coming soon.</p>
            </TabsContent>
        </Tabs>
    );
};

type SidebarState = {mode: 'step'; nodeId: string} | null;

const edgeColorForRun = (sourceStatus?: RunStepStatus, targetStatus?: RunStepStatus): string => {
    if (targetStatus === 'failed') {
        return 'var(--color-red-500)';
    }
    if (targetStatus === 'stopped') {
        return 'var(--color-orange-500)';
    }
    if (sourceStatus === 'completed' && targetStatus === 'completed') {
        return 'var(--color-green-500)';
    }
    return 'var(--color-grey-500)';
};

const toSentenceCase = (value: string): string => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

const stripReasonPrefix = (note: string): string => toSentenceCase(note.replace(/^(Stopped|Bounced|Failed):\s*/i, ''));

const AnalyticsNodeLabel: React.FC<{
    icon: React.ElementType;
    type: string;
    value?: string;
    step?: RunStep;
    memberEmail?: string;
}> = ({icon: Icon, type, value, step, memberEmail}) => {
    const showReason = step && (step.status === 'stopped' || step.status === 'failed') && step.note;
    const isSkipped = step?.status === 'skipped';
    return (
        <div className="flex w-full flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-grey-100 text-grey-700">
                    <Icon className="size-4" />
                </div>
                <div className="flex min-w-0 flex-col">
                    <span className="text-xs text-grey-600">{type}</span>
                    {value && <span className={`truncate font-medium ${isSkipped ? 'text-grey-600' : ''}`}>{value}</span>}
                </div>
            </div>
            {step && (
                <div className="flex flex-col gap-1 border-t pt-2">
                    {memberEmail && (
                        <span className="truncate text-xs text-grey-700">{memberEmail}</span>
                    )}
                    <div className="flex items-center justify-between gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-medium capitalize ${runStepPillStyles[step.status]}`}>{step.status}</span>
                        <span className="text-grey-600">{step.durationMs !== undefined ? formatStepDuration(step.durationMs) : '\u2014'}</span>
                    </div>
                    {showReason && step.note && (
                        <span className="text-xs text-grey-600">{stripReasonPrefix(step.note)}</span>
                    )}
                </div>
            )}
        </div>
    );
};

const AutomationEditor: React.FC = () => {
    const navigate = useNavigate();
    const {id} = useParams<{id: string}>();
    const existing = id && id !== 'new' ? getAutomationById(id) : undefined;
    const title = existing?.name ?? (id === 'new' ? 'New automation' : 'Automation');
    const initialView: 'workflow' | 'analytics' = existing?.status === 'draft' || id === 'new' ? 'workflow' : 'analytics';

    const [view, setView] = useState<'workflow' | 'analytics'>(initialView);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
    const [sidebar, setSidebar] = useState<SidebarState>(null);
    const [emailEditorOpen, setEmailEditorOpen] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState<string>(mockRuns[0].id);
    const [stopConditions, setStopConditions] = useState<StopCondition[]>(defaultStopConditions);
    const addStopCondition = (kind: StopConditionKind) => setStopConditions(curr => [...curr, {id: `ec-${Date.now()}`, kind}]);
    const removeStopCondition = (conditionId: string) => setStopConditions(curr => curr.filter(c => c.id !== conditionId));
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [allowRepeat, setAllowRepeat] = useState(false);
    const [excludeLabel, setExcludeLabel] = useState<string>('');
    const [excludeWorkflow, setExcludeWorkflow] = useState<string>('');
    const selectedRun = mockRuns.find(r => r.id === selectedRunId) ?? mockRuns[0];
    const workflowCanvasRef = useRef<HTMLDivElement>(null);
    const analyticsCanvasRef = useRef<HTMLDivElement>(null);
    const NODE_COLUMN_CENTER_X = 240 + 128; // x=240 + half of w-64 (256px)
    const snapToTop = (canvasEl: HTMLDivElement | null, instance: {setViewport: (v: {x: number; y: number; zoom: number}) => void}) => {
        const width = canvasEl?.clientWidth ?? 1200;
        instance.setViewport({x: Math.round(width / 2 - NODE_COLUMN_CENTER_X), y: 40, zoom: 1});
    };

    const STOP_MARKER_ID = '__stop_marker__';
    const STOP_MARKER_SHIFT = 100;
    const COMPLETED_MARKER_ID = '__completed_marker__';

    const stoppedStepId = selectedRun.status === 'stopped'
        ? selectedRun.timeline.find(t => t.status === 'stopped')?.stepId
        : undefined;
    const stopOriginalIdx = stoppedStepId ? initialNodes.findIndex(n => n.id === stoppedStepId) : -1;

    const analyticsNodes = useMemo<Node[]>(() => {
        const result: Node[] = initialNodes.map((node, idx) => {
            const meta = stepMeta[node.id];
            const timelineStep = selectedRun.timeline.find(t => t.stepId === node.id);
            const effectiveStep = (stoppedStepId && timelineStep?.stepId === stoppedStepId)
                ? {...timelineStep, status: 'skipped' as RunStepStatus, note: undefined}
                : timelineStep;
            const shift = (stopOriginalIdx >= 0 && idx >= stopOriginalIdx) ? STOP_MARKER_SHIFT : 0;
            const dimmed = effectiveStep?.status === 'skipped';
            return {
                ...node,
                position: {x: node.position.x, y: node.position.y + shift},
                selectable: false,
                className: `border-0! shadow-sm text-sm! px-4! py-3! rounded-lg! w-64! text-left!${dimmed ? ' opacity-70' : ''}`,
                data: {
                    ...node.data,
                    label: <AnalyticsNodeLabel icon={meta.icon} memberEmail={node.id === 'trigger' ? selectedRun.member : undefined} step={effectiveStep} type={meta.type} value={meta.value} />
                }
            };
        });
        if (stopOriginalIdx >= 0) {
            const markerY = initialNodes[stopOriginalIdx].position.y;
            result.splice(stopOriginalIdx, 0, {
                id: STOP_MARKER_ID,
                type: 'stop-marker',
                position: {x: 240, y: markerY},
                selectable: false,
                data: {reason: selectedRun.stopReason}
            });
        }
        if (selectedRun.status === 'completed') {
            const lastNode = initialNodes[initialNodes.length - 1];
            result.push({
                id: COMPLETED_MARKER_ID,
                type: 'completed-marker',
                position: {x: 240, y: lastNode.position.y + 180},
                selectable: false,
                data: {}
            });
        }
        return result;
    }, [selectedRun, stoppedStepId, stopOriginalIdx]);

    const analyticsEdges = useMemo<Edge[]>(() => {
        const result: Edge[] = [];
        initialEdges.forEach((edge) => {
            const src = selectedRun.timeline.find(t => t.stepId === edge.source)?.status;
            const tgt = selectedRun.timeline.find(t => t.stepId === edge.target)?.status;
            if (stoppedStepId && edge.target === stoppedStepId) {
                result.push({
                    ...edge,
                    target: STOP_MARKER_ID,
                    type: 'run',
                    style: {stroke: edgeColorForRun(src, 'stopped'), strokeWidth: 2}
                });
                result.push({
                    id: `${edge.id}-marker`,
                    source: STOP_MARKER_ID,
                    target: edge.target,
                    type: 'run',
                    style: {stroke: 'var(--color-grey-500)', strokeWidth: 1, strokeDasharray: '6 6'}
                });
                return;
            }
            const effectiveTgt = (stoppedStepId && edge.target === stoppedStepId) ? 'skipped' : tgt;
            const dashed = effectiveTgt === 'skipped' || Boolean(stoppedStepId && edge.source === stoppedStepId);
            result.push({
                ...edge,
                type: 'run',
                style: {
                    stroke: edgeColorForRun(src, tgt),
                    strokeWidth: dashed ? 1 : 2,
                    strokeDasharray: dashed ? '6 6' : undefined
                }
            });
        });
        if (selectedRun.status === 'completed') {
            const lastNode = initialNodes[initialNodes.length - 1];
            result.push({
                id: 'e-completed-marker',
                source: lastNode.id,
                target: COMPLETED_MARKER_ID,
                type: 'run',
                style: {stroke: 'var(--color-green-500)', strokeWidth: 2}
            });
        }
        return result;
    }, [selectedRun, stoppedStepId]);

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
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Button>
                    <span className="font-medium">{title}</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                    <Tabs value={view} onValueChange={v => setView(v as 'workflow' | 'analytics')}>
                        <TabsList>
                            <TabsTrigger value="workflow">Workflow</TabsTrigger>
                            <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-2">
                    <Button aria-label="Settings" size="icon" variant="ghost" onClick={() => setSettingsOpen(true)}>
                        <LucideIcon.Settings strokeWidth={2} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-label="More actions" size="icon" variant="ghost">
                                <LucideIcon.MoreHorizontal strokeWidth={2} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <LucideIcon.Play /> Test
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <LucideIcon.Copy /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <LucideIcon.Trash2 /> Delete
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
                .react-flow__edge:has(.automation-edge-plus):hover .react-flow__edge-path,
                .automation-edge-plus > button:hover ~ .react-flow__edge-path { stroke: var(--color-blue-500) !important; }
            `}</style>
            {view === 'workflow' ? (
                <div className="relative flex min-h-0 flex-1 overflow-hidden">
                    <div ref={workflowCanvasRef} className="flex-1 bg-grey-75">
                        <ReactFlow
                            defaultEdgeOptions={{type: 'plus', style: {stroke: 'var(--color-grey-500)'}}}
                            edges={edges}
                            edgeTypes={edgeTypes}
                            nodes={nodes}
                            nodesDraggable={false}
                            zoomOnScroll={false}
                            panOnScroll
                            onConnect={onConnect}
                            onEdgesChange={onEdgesChange}
                            onInit={instance => snapToTop(workflowCanvasRef.current, instance)}
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
                        <SidebarShell width="36rem">
                            <StepSidebarBody
                                nodeId={sidebar.nodeId}
                                onDelete={() => {
                                    const targetId = sidebar.nodeId;
                                    setNodes(current => current.filter(n => n.id !== targetId));
                                    setEdges(current => current.filter(e => e.source !== targetId && e.target !== targetId));
                                    setSidebar(null);
                                }}
                                onEditEmail={() => setEmailEditorOpen(true)}
                            />
                        </SidebarShell>
                    )}
                </div>
            ) : (
                <div className="flex min-h-0 flex-1">
                    <aside className="flex w-1/2 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-background p-6">
                        <AnalyticsPanel
                            selectedRunId={selectedRunId}
                            onSelectRun={setSelectedRunId}
                        />
                    </aside>
                    <div className="flex flex-1 flex-col bg-grey-75">
                        <div className="flex h-[68px] shrink-0 items-center justify-between gap-4 border-b bg-background px-6">
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-grey-600">Member</span>
                                <span className="text-sm font-medium">{selectedRun.member}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-grey-600">Started</span>
                                <span className="text-sm">{formatRunTime(selectedRun.startedAt)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-grey-600">Duration</span>
                                <span className="text-sm">{selectedRun.durationMs !== undefined ? formatDuration(selectedRun.durationMs) : '—'}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${runStatusStyles[selectedRun.status]}`}>{selectedRun.status}</span>
                                {selectedRun.stopReason && (
                                    <span className="text-xs text-grey-600">{selectedRun.stopReason}</span>
                                )}
                            </div>
                        </div>
                        <div ref={analyticsCanvasRef} className="flex-1">
                            <ReactFlow
                                defaultEdgeOptions={{type: 'run'}}
                                edges={analyticsEdges}
                                edgeTypes={edgeTypes}
                                nodes={analyticsNodes}
                                nodesConnectable={false}
                                nodesDraggable={false}
                                nodeTypes={nodeTypes}
                                zoomOnScroll={false}
                                panOnDrag
                                panOnScroll
                                onInit={instance => snapToTop(analyticsCanvasRef.current, instance)}
                            >
                                <Background color="var(--color-grey-400)" />
                                <Panel position="bottom-left">
                                    <ZoomControls />
                                </Panel>
                            </ReactFlow>
                        </div>
                    </div>
                </div>
            )}
            {emailEditorOpen && <EmailEditorModal onClose={() => setEmailEditorOpen(false)} />}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                        <DialogDescription className="sr-only">Configure this automation.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-6 py-2">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="font-medium">Allow repeat members</span>
                                <span className="text-sm text-grey-600">Enable members to go through this workflow multiple times</span>
                            </div>
                            <Switch checked={allowRepeat} onCheckedChange={setAllowRepeat} />
                        </div>
                        <div className="border-t" />
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="font-medium">Exclude members</span>
                                <span className="text-sm text-grey-600">Prevent members from entering or continuing in this workflow</span>
                            </div>
                            <SidebarField label="Exclude by label">
                                <Select value={excludeLabel} onValueChange={setExcludeLabel}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Find a label" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockMemberLabels.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </SidebarField>
                            <SidebarField label="Exclude by workflow">
                                <Select value={excludeWorkflow} onValueChange={setExcludeWorkflow}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Find a workflow" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockAutomations.filter(a => a.id !== id).map(automation => (
                                            <SelectItem key={automation.id} value={automation.id}>{automation.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </SidebarField>
                        </div>
                        <div className="border-t" />
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="font-medium">Stop criteria</span>
                                <span className="text-sm text-grey-600">Automatically stop the workflow for a member when any of these happens</span>
                            </div>
                            <StopConditionsBar
                                conditions={stopConditions}
                                editable
                                onAdd={addStopCondition}
                                onRemove={removeStopCondition}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                        <Button onClick={() => setSettingsOpen(false)}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AutomationEditor;
export const Component = AutomationEditor;
