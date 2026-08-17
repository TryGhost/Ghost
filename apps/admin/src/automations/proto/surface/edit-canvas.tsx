import '@xyflow/react/dist/style.css';
import React, {useMemo, useState} from 'react';
import StepPicker, {type StepPickerType} from '@/automations/components/canvas/step-picker';
import {Background, BackgroundVariant, BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps, Handle, type Node, type NodeProps, Position, ReactFlow, getSmoothStepPath} from '@xyflow/react';
import type {AutomationDetail, AutomationEmailStats, InsertActionAnchor} from '@tryghost/admin-x-framework/api/automations';
import {insertSendEmailAction, insertWaitAction, removeAction, updateSendEmailAction, updateWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {DEFAULT_TRIGGER_CONFIG, type TriggerConfig, triggerSummary} from '@/automations/proto/shared/trigger-config';
import {EDGE_STROKE, REACT_FLOW_THEME, REGULAR_NODE_HEIGHT, TAIL_NODE_HEIGHT, TRIGGER_SUMMARY_HEIGHT, type StepKind, formatWait, orderActions, panTranslateExtent, stackNodeY, stepKindIcon, useCenteredColumn} from './flow-utils';
import {EmailAnalyticsSheet, type SheetEmail} from './email-analytics-sheet';
import {EmailStatsFooter} from './email-analytics';
import {NODE_BODY_PADDING, NodeCard, NodeHeader} from './flow-node-shell';
import {NodeAnchor, NodePopover} from './node-popover';
import {EmailPreview} from './email-preview';
import {GoalsForm, TriggerFieldsForm} from './trigger-config-form';

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

// The trigger card grows once the paid trigger discloses its "Paid tiers" label +
// tier chips, on top of the trigger select (same single-row shape as the wait form)
// and the always-present goals row.
const TRIGGER_TIER_BLOCK = 72;
const TRIGGER_GOALS_ROW = 50;
const triggerFormHeight = (config: TriggerConfig): number => (
    WAIT_FORM_HEIGHT + (config.type === 'paid_subscription_starts' ? TRIGGER_TIER_BLOCK : 0) + TRIGGER_GOALS_ROW
);


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
    // Trigger only: the in-canvas goals popover. Open state is owned by the canvas
    // so it can also raise the node's z-index while the card hangs over the nodes
    // below it.
    popoverOpen?: boolean;
    onTogglePopover?: () => void;
    onClosePopover?: () => void;
    // Email only: opens the right-hand analytics sheet.
    onOpenAnalytics?: () => void;
    // Trigger node. Without onTriggerConfigChange the summary is read-only (the
    // surface concept, which doesn't own trigger state).
    triggerConfig?: TriggerConfig;
    onTriggerConfigChange?: (next: TriggerConfig) => void;
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
    const isTrigger = d.kind === 'trigger';
    const clickable = !isTrigger;
    const isEmail = d.kind === 'email';
    const triggerConfig = d.triggerConfig ?? DEFAULT_TRIGGER_CONFIG;
    const configurable = isTrigger && Boolean(d.onTriggerConfigChange);
    const wait = splitWait(d.waitHours ?? 24);
    const changeWait = (amount: number, unit: 'days' | 'hours') => {
        const hours = waitToHours(amount, unit);
        if (Number.isSafeInteger(hours) && hours > 0) {
            d.onWaitChange?.(hours);
        }
    };
    // Header action slot: overflow menu for editable steps. The trigger has no
    // action — its fields are in the card and its goals row opens the popover.
    const action = clickable ? (
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
    ) : undefined;
    return (
        <NodeAnchor>
            <NodeCard border={d.selected ? 'selected' : 'default'}>
                <NodeHeader action={action} icon={stepKindIcon[d.kind]} title={d.title} />
                {isTrigger && (
                    // The trigger's own fields sit in the card, like every other step's
                    // form. nodrag/nopan + stopPropagation so using them doesn't pan the
                    // canvas.
                    <div className={cn('nodrag nopan cursor-default', NODE_BODY_PADDING)} onClick={e => e.stopPropagation()}>
                        {configurable && d.onTriggerConfigChange ? (
                            <>
                                <TriggerFieldsForm config={triggerConfig} onChange={d.onTriggerConfigChange} />
                                {/* Goals are a list that grows, so they stay in the popover —
                                    this row reports the count and opens it. */}
                                <button
                                    aria-label="Edit goals"
                                    className="mt-3 flex w-full items-center justify-between rounded-lg border border-border-default px-3 py-2 text-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                                    type="button"
                                    onClick={d.onTogglePopover}
                                >
                                    <span className="text-muted-foreground">Goals</span>
                                    <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
                                        {triggerConfig.goals.length}
                                        <LucideIcon.ChevronRight className="size-4" />
                                    </span>
                                </button>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">{triggerSummary(triggerConfig)}</div>
                        )}
                    </div>
                )}
                {clickable && (
                    // Always-visible inline edit form. nodrag/nopan + stopPropagation so typing
                    // and selecting don't pan the canvas or re-fire node selection.
                    <div className={cn('nodrag nopan cursor-default', NODE_BODY_PADDING)} onClick={e => e.stopPropagation()}>
                        {isEmail ? (
                            // Shared email preview (editable: inline subject + floating edit button),
                            // with metrics below.
                            <div>
                                <EmailPreview editable subject={d.subject ?? ''} onEditContent={d.onEditContent} onSubjectChange={d.onSubjectChange} />
                                {d.stats && (
                                    // The summary IS the analytics affordance — clicking it opens
                                    // the deeper read in the right-hand sheet.
                                    <button
                                        aria-label="View email analytics"
                                        className="w-full rounded-lg text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                                        type="button"
                                        onClick={d.onOpenAnalytics}
                                    >
                                        <EmailStatsFooter divider={false} stats={d.stats} />
                                    </button>
                                )}
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
            </NodeCard>

            {/* Goals are a short list, so they stay in-canvas. The email report is
                not — that opens the right-hand sheet instead. */}
            {configurable && d.onTriggerConfigChange && d.onClosePopover && (
                <NodePopover open={Boolean(d.popoverOpen)} title="Goals" onClose={d.onClosePopover}>
                    <GoalsForm config={triggerConfig} onChange={d.onTriggerConfigChange} />
                </NodePopover>
            )}
        </NodeAnchor>
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
        return <BaseEdge id={id} path={path} style={{stroke: EDGE_STROKE, strokeWidth: 1}} />;
    }

    const visible = open || edgeHovered || labelHovered;
    return (
        <g onMouseEnter={() => setEdgeHovered(true)} onMouseLeave={() => setEdgeHovered(false)}>
            <BaseEdge id={id} interactionWidth={30} path={path} style={{stroke: EDGE_STROKE, strokeWidth: 1}} />
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
    // Trigger config lives with the screen (it isn't part of AutomationDetail yet).
    // Without a change handler the trigger renders as a read-only summary.
    triggerConfig?: TriggerConfig;
    onTriggerConfigChange?: (next: TriggerConfig) => void;
}

export const SurfaceEditCanvas: React.FC<SurfaceEditCanvasProps> = ({draft, onChange, triggerConfig, onTriggerConfigChange}) => {
    const {canvasRef, onInit, size} = useCenteredColumn();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Two separate surfaces: the trigger's goals popover (short list, in-canvas)
    // and the email analytics sheet (a full report, right-hand). Tracked apart
    // because they're independent and only the popover needs a raised node.
    const [goalsOpen, setGoalsOpen] = useState(false);
    const [analyticsActionId, setAnalyticsActionId] = useState<string | null>(null);
    // Email-content dialog, opened from a card's inline "Edit email content" button.
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);

    const ordered = orderActions(draft);

    const insert = (anchor: InsertActionAnchor, kind: 'email' | 'wait') => {
        onChange(kind === 'email' ? insertSendEmailAction({detail: draft, anchor}) : insertWaitAction({detail: draft, anchor}));
    };
    // The email the analytics sheet is reporting on, resolved from the live draft
    // so edits to its subject show through while the sheet is open.
    const analyticsAction = ordered.find(a => a.id === analyticsActionId);
    const sheetEmail: SheetEmail | null = analyticsAction?.type === 'send_email' && analyticsAction.stats
        ? {actionId: analyticsAction.id, subject: analyticsAction.data.email_subject, stats: analyticsAction.stats}
        : null;

    const {nodes, edges, contentBottom} = useMemo(() => {
        // Height-aware layout: trigger, then each action (email nodes carry a stats
        // footer), then the tail button. Even visible gaps regardless of node height.
        const heights = [REGULAR_NODE_HEIGHT + (onTriggerConfigChange ? triggerFormHeight(triggerConfig ?? DEFAULT_TRIGGER_CONFIG) : TRIGGER_SUMMARY_HEIGHT)];
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
            data: {
                kind: 'trigger',
                title: 'Trigger',
                subtitle: '',
                selected: false,
                triggerConfig,
                onTriggerConfigChange,
                popoverOpen: goalsOpen,
                onTogglePopover: () => setGoalsOpen(open => !open),
                onClosePopover: () => setGoalsOpen(false)
            },
            // Raised while its popover is open so the card isn't painted over by the
            // nodes it hangs in front of.
            zIndex: goalsOpen ? 1000 : 0,
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
                    // Also blue while its analytics sheet is open, so the sheet is
                    // visibly tied to the card it's reporting on.
                    selected: action.id === selectedId || action.id === analyticsActionId,
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
                    onEditContent: () => setEmailDialogOpen(true),
                    onOpenAnalytics: () => setAnalyticsActionId(action.id)
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
                style: toTail ? {stroke: EDGE_STROKE, strokeWidth: 1} : undefined,
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
    }, [draft, ordered, selectedId, analyticsActionId, goalsOpen, triggerConfig, onTriggerConfigChange]);

    const translateExtent = useMemo(
        () => panTranslateExtent(contentBottom, size),
        [contentBottom, size]
    );

    return (
        // relative: the analytics sheet slides in over this region.
        <div className="relative flex size-full">
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
                        if (node.type !== 'step') {
                            return;
                        }
                        // The trigger's fields live in its card and its goals row opens
                        // the popover, so a bare card click does nothing.
                        if (node.id === '__trigger__') {
                            return;
                        }
                        setSelectedId(node.id);
                    }}
                    // Doesn't dismiss the analytics sheet — that's a deliberate read,
                    // closed from its own control or Escape.
                    onPaneClick={() => {
                        setSelectedId(null);
                        setGoalsOpen(false);
                    }}
                >
                    <Background variant={BackgroundVariant.Dots} />
                </ReactFlow>
            </div>

            <EmailAnalyticsSheet email={sheetEmail} onClose={() => setAnalyticsActionId(null)} />

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
