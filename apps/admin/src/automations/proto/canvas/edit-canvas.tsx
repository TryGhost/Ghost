import '@xyflow/react/dist/style.css';
import React, {useMemo, useState} from 'react';
import type {StepPickerType} from '@/automations/components/canvas/step-picker';
import {Background, BackgroundVariant, BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps, Handle, type Node, type NodeProps, Position, ReactFlow, getSmoothStepPath} from '@xyflow/react';
import type {AutomationDetail, AutomationEmailStats, InsertActionAnchor} from '@tryghost/admin-x-framework/api/automations';
import {insertSendEmailAction, insertWaitAction, removeAction, updateSendEmailAction, updateWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {OptionPicker, type PickerOption} from '@/automations/proto/shared/option-picker';
import {DEFAULT_TRIGGER_CONFIG, type TriggerConfig, availableCriteria, triggerSummary} from '@/automations/proto/shared/trigger-config';
import {CANVAS_SURFACE, EDGE_STROKE, HIDDEN_HANDLE_STYLE, REACT_FLOW_THEME, REGULAR_NODE_HEIGHT, TAIL_NODE_HEIGHT, TRIGGER_SUMMARY_HEIGHT, type StepKind, formatWait, orderActions, panTranslateExtent, stackNodeY, stepKindIcon, useCenteredColumn} from './flow-utils';
import {EmailAnalyticsSheet, type SheetEmail} from './email-analytics-sheet';
import {EmailStatsFooter} from './email-analytics';
import {NODE_BODY_PADDING, NodeCard, NodeHeader} from './flow-node-shell';
import {EmailPreview} from './email-preview';
import {TriggerFieldsForm} from './trigger-config-form';

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

// The trigger card is the trigger select (same single-row shape as the wait form)
// plus a labelled block of chips for exit criteria, and another for tiers once the
// paid trigger discloses it. A block is the gap above it, its label, and one row
// of chips; exit criteria wrap to a second row once the paid trigger adds its
// third (and longest) criterion.
const TRIGGER_FIELD_BLOCK = 84;
const TRIGGER_CHIP_ROW = 34;
const triggerFormHeight = (config: TriggerConfig, locked: boolean): number => {
    // Locked, everything below the select goes — the card is the header and the
    // disabled select, the same single-row shape as the wait form.
    if (locked) {
        return WAIT_FORM_HEIGHT;
    }
    const paid = config.type === 'paid_subscription_starts';
    const extraCriteriaRows = availableCriteria(config).length > 2 ? 1 : 0;
    return WAIT_FORM_HEIGHT
        + TRIGGER_FIELD_BLOCK
        + (extraCriteriaRows * TRIGGER_CHIP_ROW)
        + (paid ? TRIGGER_FIELD_BLOCK : 0);
};


// Dashed circular "insert step" button, matched to the real add-step-edge.
// CANVAS_SURFACE: these read as an empty slot cut out of the canvas, so they take
// the canvas's own fill (opaque, so the dot pattern doesn't show through the slot).
// Previously --surface-page, which is pure black in dark mode — darker than the
// canvas it sat on, so the buttons rendered as holes.
const INSERT_BUTTON_CLASSES = `border-dashed border-border-default ${CANVAS_SURFACE} text-text-secondary shadow-sm hover:border-border-strong`;

// The steps you can add, in the shared icon/title/description shape. Same rows
// the trigger picker uses, so "what starts this" and "what happens next" are
// chosen the same way.
const STEP_PICKER_OPTIONS: PickerOption<StepPickerType>[] = [
    {value: 'send_email', icon: LucideIcon.Mail, title: 'Email', description: 'Send an email'},
    {value: 'wait', icon: LucideIcon.Clock, title: 'Wait', description: 'Add a delay before the next step'}
];

const AddStepPopover: React.FC<{children: React.ReactNode; onPick: (type: StepPickerType) => void; open: boolean; onOpenChange: (open: boolean) => void}> = ({children, onPick, open, onOpenChange}) => (
    <OptionPicker
        align="center"
        open={open}
        options={STEP_PICKER_OPTIONS}
        side="top"
        sideOffset={12}
        onOpenChange={onOpenChange}
        onSelect={onPick}
    >
        {children}
    </OptionPicker>
);

type StepNodeData = {
    kind: StepKind;
    title: string;
    subtitle: string;
    selected: boolean;
    // Email only: opens the right-hand analytics sheet.
    onOpenAnalytics?: () => void;
    // Trigger node. Without onTriggerConfigChange the summary is read-only — the
    // read canvas passes no handler, since it shows what's running rather than
    // what's being edited.
    triggerConfig?: TriggerConfig;
    onTriggerConfigChange?: (next: TriggerConfig) => void;
    // Phase-1 concept: trigger fixed after creation (see float/trigger-card-model).
    triggerLocked?: boolean;
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
    const triggerLocked = isTrigger && Boolean(d.triggerLocked);
    // Locked trigger: a lock where other cards put their overflow menu. A button,
    // not a static glyph — clicking it answers "why can't I change this?" in a
    // popover instead of leaving the disabled select to explain itself.
    const lockAction = triggerLocked ? (
        <Popover modal={false}>
            <PopoverTrigger asChild>
                <Button aria-label="Why the trigger is locked" size="icon" variant="ghost">
                    <LucideIcon.Lock />
                </Button>
            </PopoverTrigger>
            {/* "always" so the popover tracks its card when the canvas pans — same
                reason as the overflow menu below. */}
            <PopoverContent align="end" className="w-72" updatePositionStrategy="always">
                <p className="text-sm">This trigger is set for now, with more options on the way.</p>
            </PopoverContent>
        </Popover>
    ) : undefined;
    // Header action slot: overflow menu for editable steps. The trigger has no
    // action unless locked — its fields are in the card.
    const action = clickable ? (
        // modal={false} — the default wraps the menu in RemoveScroll and kills
        // outside pointer events, which freezes the canvas underneath it. The
        // menu is a small aside on one card, not something worth trapping the
        // whole surface for; the picker is non-modal for the same reason, and so
        // is the screen's own ⋯ menu.
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button aria-label="Step actions" size="icon" variant="ghost">
                    <LucideIcon.MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            {/* "always" so the menu tracks its card when the canvas pans — see the
                OptionPicker for the full why. */}
            <DropdownMenuContent align="end" updatePositionStrategy="always">
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => d.onDelete?.()}>
                    <LucideIcon.Trash2 /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ) : lockAction;
    return (
        <NodeCard border={d.selected ? 'selected' : 'default'}>
            <NodeHeader action={action} icon={stepKindIcon[d.kind]} title={d.title} />
            {isTrigger && (
                // The trigger's own fields sit in the card, like every other step's
                // form — nothing about the trigger is behind a popover any more.
                // nodrag/nopan + stopPropagation so using them doesn't pan the canvas.
                <div className={cn('nodrag nopan cursor-default', NODE_BODY_PADDING)} onClick={e => e.stopPropagation()}>
                    {configurable && d.onTriggerConfigChange ? (
                        <TriggerFieldsForm config={triggerConfig} locked={triggerLocked} onChange={d.onTriggerConfigChange} />
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
                                <EmailPreview subject={d.subject ?? ''} editable onEditContent={d.onEditContent} onSubjectChange={d.onSubjectChange} />
                                {d.stats && (
                                    // The summary IS the analytics affordance — clicking it opens
                                    // the deeper read in the right-hand sheet.
                                    <button
                                        aria-label="View email analytics"
                                        className="-mx-3 mt-3 -mb-3 w-[calc(100%+1.5rem)] rounded-lg p-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
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
                                    {/* Same as the menu above: track the card while
                                        the canvas moves. */}
                                    <SelectContent updatePositionStrategy="always">
                                        <SelectItem value="hours">Hours</SelectItem>
                                        <SelectItem value="days">Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                )}
        </NodeCard>
    );
};

type TailNodeData = {onPick: (type: StepPickerType) => void};

const TailNode: React.FC<NodeProps> = ({data}) => {
    const {onPick} = data as TailNodeData;
    const [open, setOpen] = useState(false);
    return (
        <div className="flex w-[400px]">
            <Handle position={Position.Top} style={HIDDEN_HANDLE_STYLE} type="target" />
            <AddStepPopover open={open} onOpenChange={setOpen} onPick={onPick}>
                <button aria-label="Add step" className={`flex h-12 w-[400px] items-center justify-center rounded-lg border border-dashed border-border-default ${CANVAS_SURFACE} text-text-secondary transition-colors hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none`} type="button">
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
// (or the picker is open) and opens the shared OptionPicker.
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

interface EditCanvasProps {
    draft: AutomationDetail;
    onChange: (next: AutomationDetail) => void;
    // Trigger config lives with the screen (it isn't part of AutomationDetail yet).
    // Without a change handler the trigger renders as a read-only summary.
    triggerConfig?: TriggerConfig;
    onTriggerConfigChange?: (next: TriggerConfig) => void;
    triggerLocked?: boolean;
}

export const EditCanvas: React.FC<EditCanvasProps> = ({draft, onChange, triggerConfig, onTriggerConfigChange, triggerLocked = false}) => {
    const {canvasRef, onInit, size} = useCenteredColumn();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Which email the right-hand analytics sheet is reporting on.
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
        ? {actionId: analyticsAction.id, subject: analyticsAction.data.email_subject || 'Untitled', stats: analyticsAction.stats}
        : null;

    const {nodes, edges, contentBottom} = useMemo(() => {
        // Height-aware layout: trigger, then each action (email nodes carry a stats
        // footer), then the tail button. Even visible gaps regardless of node height.
        const heights = [REGULAR_NODE_HEIGHT + (onTriggerConfigChange ? triggerFormHeight(triggerConfig ?? DEFAULT_TRIGGER_CONFIG, triggerLocked) : TRIGGER_SUMMARY_HEIGHT)];
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
                triggerLocked
            },
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
    }, [draft, ordered, selectedId, analyticsActionId, triggerConfig, onTriggerConfigChange, triggerLocked]);

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
                    maxZoom={1}
                    minZoom={0.5}
                    nodes={nodes}
                    nodesConnectable={false}
                    nodesDraggable={false}
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
                        // The trigger's fields live in its card and its exitCriteria row opens
                        // the popover, so a bare card click does nothing.
                        if (node.id === '__trigger__') {
                            return;
                        }
                        setSelectedId(node.id);
                    }}
                    // Doesn't dismiss the analytics sheet — that's a deliberate read,
                    // closed from its own control or Escape.
                    onPaneClick={() => setSelectedId(null)}
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

export default EditCanvas;
