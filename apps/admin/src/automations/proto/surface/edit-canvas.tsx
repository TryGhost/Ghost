import '@xyflow/react/dist/style.css';
import React, {useMemo, useState} from 'react';
import StepPicker, {type StepPickerType} from '@/automations/components/canvas/step-picker';
import {Background, BackgroundVariant, BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps, Handle, type Node, type NodeProps, Position, ReactFlow, getSmoothStepPath} from '@xyflow/react';
import type {AutomationDetail, AutomationEmailStats, InsertActionAnchor} from '@tryghost/admin-x-framework/api/automations';
import {insertSendEmailAction, insertWaitAction, removeAction, updateSendEmailAction, updateWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {EDGE_STROKE, REACT_FLOW_THEME, REGULAR_NODE_HEIGHT, TAIL_NODE_HEIGHT, type StepKind, formatWait, orderActions, panTranslateExtent, stackNodeY, stepKindIcon, useCenteredColumn} from './flow-utils';
import {NODE_CARD_PADDING, NODE_CARD_SHELL, StepNodeHeader} from './flow-node-shell';
import {EmailStatsFooter} from './email-analytics';
import {StepSidebar} from './step-sidebar';

// The real editor's StepPicker speaks 'send_email' | 'wait'; the proto's graph
// helpers here take 'email' | 'wait'.
const toInsertKind = (type: StepPickerType): 'email' | 'wait' => (type === 'send_email' ? 'email' : 'wait');

// Wait duration <-> {amount, unit} (mirrors the side panel; whole days when even).
const splitWait = (hours: number): {amount: number; unit: 'days' | 'hours'} => (
    hours % 24 === 0 ? {amount: hours / 24, unit: 'days'} : {amount: hours, unit: 'hours'}
);
const waitToHours = (amount: number, unit: 'days' | 'hours'): number => (unit === 'days' ? amount * 24 : amount);

// Height a node's always-visible inline edit form adds (estimated — tune to the
// rendered form since node Y-positions are laid out manually). No Delete here — that
// moved to the hover overflow menu. Email: subject + edit-content; wait: duration row.
const EMAIL_FORM_HEIGHT = 330;
const WAIT_FORM_HEIGHT = 112;

// Placeholder email body for the node's preview. The real email_lexical is empty
// in the proto's mock data, so this stands in to make the node read as an email.
const EMAIL_BODY_PREVIEW = 'Hey there,\n\nThanks for joining — here’s what to expect next, straight to your inbox.\n\nOver the next few weeks we’ll share our best tips, stories from the community, and the occasional behind-the-scenes look at what we’re building.\n\nGlad to have you here.';

// Trigger carries a single locked field (same single-row shape as the wait form),
// so it reserves the same height to keep the vertical rhythm even.
const TRIGGER_FORM_HEIGHT = WAIT_FORM_HEIGHT;

// Dashed circular "insert step" button, matched to the real add-step-edge.
const INSERT_BUTTON_CLASSES = 'border-dashed border-border-default bg-surface-page text-text-secondary shadow-sm hover:border-border-strong';

const AddStepPopover: React.FC<{children: React.ReactNode; onPick: (type: StepPickerType) => void; open: boolean; onOpenChange: (open: boolean) => void}> = ({children, onPick, open, onOpenChange}) => (
    <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent align="center" className="border-0 p-0 shadow-lg" side="top" sideOffset={12}>
            <StepPicker onPick={(type) => {
                onOpenChange(false);
                onPick(type);
            }} />
        </PopoverContent>
    </Popover>
);

type StepNodeData = {
    kind: StepKind;
    title: string;
    subtitle: string;
    selected: boolean;
    // Locked trigger field value (trigger node only; read-only during beta).
    triggerValue?: string;
    // Always-visible inline edit form (non-trigger nodes).
    subject?: string;
    stats?: AutomationEmailStats;
    waitHours?: number;
    onSubjectChange?: (subject: string) => void;
    onWaitChange?: (hours: number) => void;
    onDelete?: () => void;
    onEditContent?: () => void;
};

const StepNode: React.FC<NodeProps> = ({data}) => {
    const d = data as StepNodeData;
    const clickable = d.kind !== 'trigger';
    const isEmail = d.kind === 'email';
    const wait = splitWait(d.waitHours ?? 24);
    const changeWait = (amount: number, unit: 'days' | 'hours') => {
        const hours = waitToHours(amount, unit);
        if (Number.isSafeInteger(hours) && hours > 0) {
            d.onWaitChange?.(hours);
        }
    };
    return (
        <div className={cn('transition-colors', NODE_CARD_SHELL, d.selected ? 'border-blue ring-1 ring-blue' : 'border-border-default')}>
            <Handle position={Position.Top} style={{opacity: 0}} type="target" />
            <div className={cn('flex items-center gap-2', NODE_CARD_PADDING)}>
                <div className="min-w-0 flex-1">
                    <StepNodeHeader icon={stepKindIcon[d.kind]} title={d.title} />
                </div>
                {clickable && (
                    // Persistent overflow at the far right of the header row, vertically
                    // centred with the title. nodrag/nopan + stopPropagation so it doesn't
                    // pan the canvas or re-fire node selection.
                    <div className="nodrag nopan flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-label="Step actions" size="icon" variant="ghost">
                                    <LucideIcon.MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => d.onDelete?.()}>
                                    <LucideIcon.Trash2 /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
                {d.kind === 'trigger' && (
                    // Lock indicator where the overflow menu sits on other nodes. Click opens a
                    // popover explaining the beta lock.
                    <div className="nodrag nopan shrink-0" onClick={e => e.stopPropagation()}>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button aria-label="Trigger locked during beta" className="text-muted-foreground" size="icon" variant="ghost">
                                    <LucideIcon.Lock />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-auto max-w-56 text-sm text-muted-foreground">
                                This trigger is locked during beta
                            </PopoverContent>
                        </Popover>
                    </div>
                )}
            </div>
            {d.kind === 'trigger' && (
                // Trigger criterion as a real (disabled) Select. nodrag/nopan so hovering it
                // never pans the canvas.
                <div className={cn('nodrag nopan cursor-default', NODE_CARD_PADDING, 'pt-0')} onClick={e => e.stopPropagation()}>
                    <Select disabled value={d.triggerValue ?? 'Free member sign-ups'}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Free member sign-ups">Free member sign-ups</SelectItem>
                            <SelectItem value="Paid member sign-ups">Paid member sign-ups</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            {clickable && (
                // Always-visible inline edit form. nodrag/nopan + stopPropagation so typing
                // and selecting don't pan the canvas or re-fire node selection.
                <div className={cn('nodrag nopan cursor-default', NODE_CARD_PADDING, 'pt-0')} onClick={e => e.stopPropagation()}>
                    {isEmail ? (
                        // Inline-editable subject (standard InputGroup with a "Subject" leading
                        // label) sits above the email preview. The preview sheet shows a body
                        // excerpt so the node reads as an email; metrics follow below.
                        <div>
                            <InputGroup className="mb-3">
                                <InputGroupAddon align="inline-start">
                                    <InputGroupText>Subject</InputGroupText>
                                </InputGroupAddon>
                                <InputGroupInput placeholder="Subject line" value={d.subject ?? ''} onChange={e => d.onSubjectChange?.(e.target.value)} />
                            </InputGroup>
                            {/* Preview surface matches the subject input's chrome (border,
                                fill, radius) and body text matches the "Subject" label size/colour.
                                Edit-content floats top-right, inset to the sheet's p-4 padding. */}
                            <div className="relative rounded-md border border-control-border bg-control-surface p-4">
                                <p className="line-clamp-6 pr-9 text-control whitespace-pre-line text-muted-foreground">{EMAIL_BODY_PREVIEW}</p>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button aria-label="Edit email content" className="absolute top-[8px] right-[8px]" size="icon" variant="ghost" onClick={() => d.onEditContent?.()}>
                                                <LucideIcon.SquarePen />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit email content</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {d.stats && <EmailStatsFooter divider={false} stats={d.stats} />}
                        </div>
                    ) : (
                        // No field label — the node header ("Wait") already names this. Both
                        // controls sit at h-9 (36px, the base Input default) so they match the
                        // subject input; the Select is nudged up from its --control-height default.
                        <div className="flex gap-2">
                            <Input
                                className="h-9 flex-1"
                                min={1}
                                type="number"
                                value={wait.amount}
                                onChange={e => changeWait(Math.max(1, Number(e.target.value) || 1), wait.unit)}
                            />
                            <Select value={wait.unit} onValueChange={value => changeWait(wait.amount, value as 'days' | 'hours')}>
                                <SelectTrigger className="h-9 flex-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}
            <Handle position={Position.Bottom} style={{opacity: 0}} type="source" />
        </div>
    );
};

type TailNodeData = {onPick: (type: StepPickerType) => void};

const TailNode: React.FC<NodeProps> = ({data}) => {
    const {onPick} = data as TailNodeData;
    const [open, setOpen] = useState(false);
    return (
        <div className="flex w-[400px]">
            <Handle position={Position.Top} style={{opacity: 0}} type="target" />
            <AddStepPopover open={open} onOpenChange={setOpen} onPick={onPick}>
                <button aria-label="Add step" className="flex h-12 w-[400px] items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-page text-text-secondary transition-colors hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none" type="button">
                    <LucideIcon.Plus className="size-5" strokeWidth={1.5} />
                </button>
            </AddStepPopover>
        </div>
    );
};

const nodeTypes = {step: StepNode, tail: TailNode};

type PlusEdgeData = {onPick: (type: StepPickerType) => void};

// Connecting line with a hover-revealed circular "+" at its midpoint, matched to
// the real add-step-edge: the button fades in while the cursor is near the edge
// (or the picker is open) and opens the shared StepPicker.
const PlusEdge: React.FC<EdgeProps> = ({id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data}) => {
    const [open, setOpen] = useState(false);
    const [edgeHovered, setEdgeHovered] = useState(false);
    const [labelHovered, setLabelHovered] = useState(false);
    const onPick = (data as PlusEdgeData | undefined)?.onPick;
    const [path, labelX, labelY] = getSmoothStepPath({sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition});

    if (!onPick) {
        return <BaseEdge id={id} path={path} style={{stroke: EDGE_STROKE}} />;
    }

    const visible = open || edgeHovered || labelHovered;
    return (
        <g onMouseEnter={() => setEdgeHovered(true)} onMouseLeave={() => setEdgeHovered(false)}>
            <BaseEdge id={id} interactionWidth={30} path={path} style={{stroke: EDGE_STROKE}} />
            <EdgeLabelRenderer>
                <div
                    className="pointer-events-auto absolute"
                    style={{transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`}}
                    onMouseEnter={() => setLabelHovered(true)}
                    onMouseLeave={() => setLabelHovered(false)}
                >
                    {/* Wider hit zone so the + reveals when the cursor is near the edge midpoint. */}
                    <div className="flex h-10 w-16 items-center justify-center">
                        <AddStepPopover open={open} onOpenChange={setOpen} onPick={onPick}>
                            <button
                                aria-label="Insert step here"
                                className={cn('flex size-8 items-center justify-center rounded-full border transition-opacity focus-visible:opacity-100 focus-visible:outline-none', INSERT_BUTTON_CLASSES, visible ? 'opacity-100' : 'opacity-0')}
                                type="button"
                            >
                                <LucideIcon.Plus className="size-5" strokeWidth={1.5} />
                            </button>
                        </AddStepPopover>
                    </div>
                </div>
            </EdgeLabelRenderer>
        </g>
    );
};

const edgeTypes = {plus: PlusEdge};

interface SurfaceEditCanvasProps {
    draft: AutomationDetail;
    onChange: (next: AutomationDetail) => void;
}

export const SurfaceEditCanvas: React.FC<SurfaceEditCanvasProps> = ({draft, onChange}) => {
    const {canvasRef, onInit, size} = useCenteredColumn();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Email-content dialog, opened from a card's inline "Edit email content" button.
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);

    const ordered = orderActions(draft);
    const selectedAction = ordered.find(a => a.id === selectedId) ?? null;

    const insert = (anchor: InsertActionAnchor, kind: 'email' | 'wait') => {
        onChange(kind === 'email' ? insertSendEmailAction({detail: draft, anchor}) : insertWaitAction({detail: draft, anchor}));
    };
    const handleSubjectChange = (subject: string) => {
        if (selectedAction?.type === 'send_email') {
            onChange(updateSendEmailAction({detail: draft, actionId: selectedAction.id, emailSubject: subject, emailLexical: selectedAction.data.email_lexical}));
        }
    };
    const handleWaitChange = (hours: number) => {
        if (selectedAction?.type === 'wait') {
            onChange(updateWaitAction({detail: draft, actionId: selectedAction.id, waitHours: hours}));
        }
    };
    const handleDelete = () => {
        if (selectedAction) {
            onChange(removeAction({detail: draft, actionId: selectedAction.id}));
            setSelectedId(null);
        }
    };

    const {nodes, edges, contentBottom} = useMemo(() => {
        // Height-aware layout: trigger, then each action (email nodes carry a stats
        // footer), then the tail button. Even visible gaps regardless of node height.
        const heights = [REGULAR_NODE_HEIGHT + TRIGGER_FORM_HEIGHT];
        ordered.forEach((action) => {
            // Every editable node shows its inline form, so all carry the form height.
            heights.push(REGULAR_NODE_HEIGHT + (action.type === 'send_email' ? EMAIL_FORM_HEIGHT : WAIT_FORM_HEIGHT));
        });
        heights.push(TAIL_NODE_HEIGHT);
        const ys = stackNodeY(heights);

        const built: Node[] = [];
        built.push({
            id: '__trigger__',
            type: 'step',
            position: {x: 0, y: ys[0]},
            data: {kind: 'trigger', title: 'Trigger', subtitle: 'Member signup', triggerValue: 'Free member sign-ups', selected: false},
            draggable: false,
            connectable: false,
            selectable: false
        });
        ordered.forEach((action, i) => {
            const isEmail = action.type === 'send_email';
            built.push({
                id: action.id,
                type: 'step',
                position: {x: 0, y: ys[i + 1]},
                data: {
                    kind: isEmail ? 'email' : 'wait',
                    title: isEmail ? 'Send email' : 'Wait',
                    subtitle: isEmail ? (action.data.email_subject || 'Untitled') : formatWait(action.data.wait_hours),
                    selected: action.id === selectedId,
                    // Inline-form values + per-node handlers (each edits its own action).
                    subject: action.type === 'send_email' ? action.data.email_subject : undefined,
                    stats: action.type === 'send_email' ? action.stats : undefined,
                    waitHours: action.type === 'wait' ? action.data.wait_hours : undefined,
                    onSubjectChange: (subject: string) => onChange(updateSendEmailAction({detail: draft, actionId: action.id, emailSubject: subject, emailLexical: action.type === 'send_email' ? action.data.email_lexical : ''})),
                    onWaitChange: (hours: number) => onChange(updateWaitAction({detail: draft, actionId: action.id, waitHours: hours})),
                    onDelete: () => {
                        onChange(removeAction({detail: draft, actionId: action.id}));
                        setSelectedId(null);
                    },
                    onEditContent: () => setEmailDialogOpen(true)
                },
                draggable: false,
                connectable: false,
                selectable: false
            });
        });
        const lastId = ordered.length > 0 ? ordered[ordered.length - 1].id : undefined;
        built.push({
            id: '__tail__',
            type: 'tail',
            position: {x: 0, y: ys[ys.length - 1]},
            data: {onPick: (type: StepPickerType) => insert({previousActionId: lastId}, toInsertKind(type))},
            draggable: false,
            connectable: false,
            selectable: false
        });

        const ids = built.map(n => n.id);
        const builtEdges: Edge[] = [];
        for (let i = 0; i < ids.length - 1; i++) {
            const source = ids[i];
            const target = ids[i + 1];
            const toTail = target === '__tail__';
            builtEdges.push({
                id: `${source}->${target}`,
                source,
                target,
                type: toTail ? 'smoothstep' : 'plus',
                style: toTail ? {stroke: EDGE_STROKE} : undefined,
                data: toTail ? undefined : {
                    onPick: (type: StepPickerType) => insert({
                        previousActionId: source === '__trigger__' ? undefined : source,
                        nextActionId: target
                    }, toInsertKind(type))
                }
            });
        }
        // Bottom edge of the tail node — drives the pan bound below.
        const bottom = ys.length ? ys[ys.length - 1] + heights[heights.length - 1] : 0;

        return {nodes: built, edges: builtEdges, contentBottom: bottom};
    }, [draft, ordered, selectedId]);

    const translateExtent = useMemo(
        () => panTranslateExtent(contentBottom, size),
        [contentBottom, size]
    );

    return (
        <div className="flex size-full">
            <div ref={canvasRef} className="min-h-0 flex-1">
                <ReactFlow
                    className={REACT_FLOW_THEME}
                    edges={edges}
                    edgeTypes={edgeTypes}
                    nodes={nodes}
                    nodesConnectable={false}
                    nodesDraggable={false}
                    maxZoom={1}
                    minZoom={0.5}
                    nodeTypes={nodeTypes}
                    proOptions={{hideAttribution: true}}
                    translateExtent={translateExtent}
                    zoomOnScroll={false}
                    panOnDrag
                    panOnScroll
                    onInit={onInit}
                    onNodeClick={(_, node) => {
                        if (node.type === 'step' && node.id !== '__trigger__') {
                            setSelectedId(node.id);
                        }
                    }}
                    onPaneClick={() => setSelectedId(null)}
                >
                    <Background variant={BackgroundVariant.Dots} />
                </ReactFlow>
            </div>
            {selectedAction && (
                <StepSidebar
                    action={selectedAction}
                    onClose={() => setSelectedId(null)}
                    onDelete={handleDelete}
                    onSubjectChange={handleSubjectChange}
                    onWaitChange={handleWaitChange}
                />
            )}

            {/* Email content editing is out of scope for the prototype — opened from a
                card's inline "Edit email content" button. */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Email content</DialogTitle>
                        <DialogDescription>
                            The full email editor isn’t wired up in this prototype — this is where the Koenig content editor would open to design the email.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SurfaceEditCanvas;
