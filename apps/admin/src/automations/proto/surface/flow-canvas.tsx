import '@xyflow/react/dist/style.css';
import React, {useMemo, useState} from 'react';
import {Background, BackgroundVariant, type Edge, Handle, type Node, type NodeProps, Position, ReactFlow} from '@xyflow/react';
import type {AutomationDetail, AutomationEmailStats} from '@tryghost/admin-x-framework/api/automations';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import type {AutomationRun, RunStepState} from '@/automations/proto/shared/mock';
import {DEFAULT_TRIGGER_CONFIG, type TriggerConfig, triggerLabel, triggerSummary} from '@/automations/proto/shared/trigger-config';
import {DETAIL_FOOTER_HEIGHT, EDGE_STROKE, REACT_FLOW_THEME, REGULAR_NODE_HEIGHT, STATS_FOOTER_HEIGHT, TERMINAL_NODE_HEIGHT, TRIGGER_SUMMARY_HEIGHT, type StepKind, formatWait, orderActions, panTranslateExtent, stackNodeY, stepKindIcon, useCenteredColumn} from './flow-utils';
import {EmailAnalyticsSheet, type SheetEmail} from './email-analytics-sheet';
import {EmailStatsFooter} from './email-analytics';
import {NODE_BODY_PADDING, NODE_CARD_SURFACE, NodeCard, NodeHeader, type NodeBorder} from './flow-node-shell';
import {EmailPreview} from './email-preview';
import {InProgressGlyph} from '@/automations/proto/shared/run-glyphs';

// Height the email preview (subject + body sheet) adds to a read/run email node, on
// top of the header. Footer (stats or run detail) is added separately. Estimated —
// mirrors the edit canvas's EMAIL_FORM_HEIGHT so Y-layout stays clear of overlap.
const EMAIL_PREVIEW_HEIGHT = 260;

const fmtDateTime = (iso: string): string => new Date(iso).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});

type NodeKind = StepKind | 'terminal';

type FlowNodeData = {
    kind: NodeKind;
    title: string;
    subtitle: string;
    focused: boolean;
    // 'exited' and 'failed' are synthetic — the step a member left the flow at,
    // and one that ran but broke. Both arrive from the run as plain 'done' steps,
    // which gave them the completed treatment on the two cards that mean the
    // opposite.
    state?: RunStepState | 'exited' | 'failed';
    // Supporting text ("Opened (1 link)"), the timestamp, and an optional override
    // for the badge's word. Kept as three fields rather than one pre-joined string
    // so the line can style each part differently.
    stateDetail?: string | null;
    stateAt?: string | null;
    stateLabel?: string;
    stats?: AutomationEmailStats;
    // Trigger node: the one-line config summary (read-only here — configuring
    // happens on the edit canvas).
    summary?: string;
    // Email node: opens the right-hand analytics sheet, and goes blue while that
    // sheet is reporting on it.
    onOpenAnalytics?: () => void;
    analyticsOpen?: boolean;
};

// The line at the foot of a card while a run is in focus: what happened to this
// member here, and when.
//
// Format is `Outcome · When`, with exactly one separator. The outcome leads
// because it's the part that varies — read down a column of cards the timestamps
// all look alike, so putting them second gives the eye a stable left edge to scan
// and a stable gutter to ignore. Qualifiers ride in parentheses rather than after
// a dash, so a line never carries two marks at two levels of meaning.
//
// The state glyph leads the line: same green check and blue in-progress arc the
// runs table uses, so the step a member is sitting at is marked the way their row
// is. States with nothing to mark (not reached, skipped) run text-only rather
// than inventing a glyph for an absence.
// TRYING: the state as a badge rather than a bare glyph.
//
// The idea is that the outcome is the part you scan for, so it gets a shape of
// its own and the narrative drops back — one strong left anchor per card instead
// of a uniform grey line you have to read to parse. The risk is a canvas of
// coloured pills competing with the cards themselves, which is why it's worth
// looking at rather than reasoning about. To undo: drop RunStateBadge and put the
// glyph back inline.
//
// Tints follow the recipe the automation status badge uses — colour/20 fill,
// -600 text in light, the plain alias in dark. Skipped and upcoming get no badge:
// nothing happened, so there's no outcome to name.
const STATE_BADGE: Partial<Record<NonNullable<FlowNodeData['state']>, {label: string; className: string; glyph: React.ReactNode}>> = {
    done: {
        label: 'Completed',
        className: 'bg-green/20 text-green-600 dark:text-green',
        glyph: <LucideIcon.Check className="size-3 shrink-0" strokeWidth={2.5} />
    },
    current: {
        label: 'In progress',
        className: 'bg-blue/20 text-blue-600 dark:text-blue',
        glyph: <InProgressGlyph className="size-3" />
    },
    exited: {
        label: 'Exited',
        className: 'bg-muted text-muted-foreground',
        glyph: <LucideIcon.LogOut className="size-3 shrink-0" strokeWidth={1.5} />
    },
    failed: {
        label: 'Failed',
        className: 'bg-red/20 text-red-600 dark:text-red',
        glyph: <LucideIcon.CircleAlert className="size-3 shrink-0" strokeWidth={2} />
    }
};

const RunDetailLine: React.FC<{
    state?: FlowNodeData['state'];
    label?: string;
    detail?: string | null;
    at?: string | null;
}> = ({state, label, detail, at}) => {
    const badge = state ? STATE_BADGE[state] : undefined;
    // Supporting text and timestamp share one muted run, joined by the same single
    // separator the format uses everywhere else.
    const tail = [detail, at].filter(Boolean).join(' · ');
    return (
        <div className="flex items-center gap-2 text-xs">
            {/* rounded-full + px-2, matching the automation status pill — same shape,
                same fill recipe, just smaller to sit in a 12px line. */}
            {badge && (
                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold uppercase', badge.className)}>
                    {badge.glyph}
                    {label ?? badge.label}
                </span>
            )}
            {tail && <span className="min-w-0 truncate text-muted-foreground">{tail}</span>}
        </div>
    );
};

const FlowStepNode: React.FC<NodeProps> = ({data}) => {
    const d = data as FlowNodeData;
    const done = d.focused && d.state === 'done';
    const current = d.focused && d.state === 'current';
    const exited = d.focused && d.state === 'exited';
    const failed = d.focused && d.state === 'failed';
    const muted = d.focused && (d.state === 'skipped' || d.state === 'upcoming');
    const isEmail = d.kind === 'email';

    if (d.kind === 'terminal') {
        const terminalBorder = current ? 'border-blue' : done ? 'border-green' : 'border-border-default';
        // (Terminal already renders muted for an exited run — see terminalState.)
        return (
            <div className={cn('flex w-[400px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium', NODE_CARD_SURFACE, terminalBorder, muted && 'opacity-60')}>
                <Handle position={Position.Top} style={{opacity: 0}} type="target" />
                {done && <LucideIcon.Check className="size-4 text-green-600 dark:text-green" strokeWidth={2.5} />}
                <span className={cn(done && 'text-green-600 dark:text-green', muted && 'text-muted-foreground')}>{d.title}</span>
            </div>
        );
    }

    // Analytics wins the border: it only ever opens with no run in focus, so it
    // can't be masking a run state here.
    const border: NodeBorder = d.analyticsOpen ? 'selected' : failed ? 'failed' : current ? 'current' : exited ? 'exited' : done ? 'done' : 'default';
    // The chip stays the step-kind icon in every state. Run state was tried here
    // and moved: it took the position that identifies a card at a distance, and
    // the flow stopped being scannable by shape. It now leads the detail line at
    // the foot of the card, next to the words it qualifies.

    // Single-line header (no overline) matching edit mode's one-line title. Email flips
    // perspective: "Send email" when previewing the flow you built (read), "Receive
    // email" once a member's run is in focus. Trigger/wait read the same either way.
    const label = isEmail
        ? (d.focused ? 'Receive email' : 'Send email')
        : d.kind === 'wait' ? `Wait ${d.subtitle}` : d.subtitle;

    return (
        <NodeCard border={border} muted={muted}>
                <NodeHeader icon={stepKindIcon[d.kind]} title={label} />
                {isEmail ? (
                    <div className={NODE_BODY_PADDING}>
                        <EmailPreview subject={d.subtitle || 'Untitled'} />
                        {d.focused
                            ? (d.focused && <div className="mt-[24px]"><RunDetailLine at={d.stateAt} detail={d.stateDetail} label={d.stateLabel} state={d.state} /></div>)
                            : (d.stats && (
                                // Clicking the summary opens the deeper read in the
                                // right-hand analytics sheet.
                                <button
                                    aria-label="View email analytics"
                                    className="nodrag nopan w-full rounded-lg text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        d.onOpenAnalytics?.();
                                    }}
                                >
                                    <EmailStatsFooter divider={false} stats={d.stats} />
                                </button>
                            ))}
                    </div>
                ) : (
                    <>
                        {/* Trigger: what this automation listens for, and how many criteria
                            end it. Read-only on this canvas. */}
                        {d.kind === 'trigger' && !d.focused && d.summary && (
                            <div className={cn(NODE_BODY_PADDING, 'text-sm text-muted-foreground')}>{d.summary}</div>
                        )}
                        {d.focused && (
                            <div className={NODE_BODY_PADDING}>
                                <RunDetailLine at={d.stateAt} detail={d.stateDetail} label={d.stateLabel} state={d.state} />
                            </div>
                        )}
                    </>
                )}
        </NodeCard>
    );
};

const nodeTypes = {flowStep: FlowStepNode};

// Which node states count as "the member got here", for edge opacity. 'exited'
// and 'failed' belong with them: the step is one the member travelled to, so the
// line into it is a path taken — a different outcome, not a shorter journey. Only
// 'skipped' and 'upcoming' fade.
const reachedStates: ReadonlySet<RunStepState | 'exited' | 'failed'> = new Set(['done', 'current', 'exited', 'failed']);

interface SurfaceFlowCanvasProps {
    automation: AutomationDetail;
    selectedRun: AutomationRun | null;
    // Space to reserve on the left for a floating overlay (the performance card), so
    // the flow centres beside it and can't be panned underneath. 0 = full width.
    leftInset?: number;
    // Read-only here — the trigger is configured on the edit canvas.
    triggerConfig?: TriggerConfig;
}

export const SurfaceFlowCanvas: React.FC<SurfaceFlowCanvasProps> = ({automation, selectedRun, leftInset = 0, triggerConfig = DEFAULT_TRIGGER_CONFIG}) => {
    const {canvasRef, onInit, size} = useCenteredColumn(leftInset);
    const focused = Boolean(selectedRun);
    // Which email the right-hand analytics sheet is reporting on.
    const [analyticsActionId, setAnalyticsActionId] = useState<string | null>(null);
    const analyticsAction = analyticsActionId ? orderActions(automation).find(a => a.id === analyticsActionId) : undefined;
    const sheetEmail: SheetEmail | null = analyticsAction?.type === 'send_email' && analyticsAction.stats
        ? {actionId: analyticsAction.id, stats: analyticsAction.stats}
        : null;

    const {nodes, edges, contentBottom} = useMemo(() => {
        const ordered = orderActions(automation);
        const stepByAction = new Map((selectedRun?.steps ?? []).map(s => [s.action_id, s]));
        // Where an exited run stopped: its last completed step. The run itself
        // carries the outcome, so this is derived rather than string-matched off
        // the step's detail text.
        const exitedAtActionId = focused && selectedRun?.status === 'exited_early'
            ? [...selectedRun.steps].reverse().find(step => step.state === 'done')?.action_id ?? null
            : null;

        // Collect node data in flow order first, so we can position each from its
        // rendered height (which footer, if any, it carries) for even visible gaps.
        const descriptors: {id: string; data: FlowNodeData}[] = [];

        // Trigger — always "done" once enrolled.
        descriptors.push({id: '__trigger__', data: {
            kind: 'trigger',
            title: 'Trigger',
            subtitle: triggerLabel(triggerConfig),
            summary: triggerSummary(triggerConfig),
            focused,
            state: focused ? 'done' : undefined,
            // The trigger's badge names what the member did, not the step's state —
            // "Completed" for the moment someone joined would be nonsense.
            stateLabel: 'Entered',
            stateDetail: null,
            stateAt: selectedRun ? fmtDateTime(selectedRun.enrolled_at) : null
        }});

        ordered.forEach((action) => {
            const step = stepByAction.get(action.id);
            const isEmail = action.type === 'send_email';
            const stats = action.type === 'send_email' ? action.stats : undefined;
            let stateDetail: string | null = null;
            let stateAt: string | null = null;
            if (focused) {
                stateDetail = step?.detail ?? null;
                // Timestamp only on steps that have actually happened. An active wait
                // already names the date it resumes, and stamping it with the moment
                // it started put two dates on one line for the reader to work out
                // which was which.
                if (step?.state === 'done' && step.occurred_at) {
                    stateAt = fmtDateTime(step.occurred_at);
                }
                // No badge for these, so the words carry it alone.
                if (!stateDetail && step?.state === 'upcoming') {
                    stateDetail = 'Not reached';
                } else if (!stateDetail && step?.state === 'skipped') {
                    stateDetail = 'Skipped';
                }
            }
            descriptors.push({id: action.id, data: {
                kind: isEmail ? 'email' : 'wait',
                title: isEmail ? 'Send email' : 'Wait',
                subtitle: isEmail ? (action.data.email_subject || 'Untitled') : formatWait(action.data.wait_hours),
                focused,
                // Failure wins over exit: when the send broke, that's what the card
                // has to say, even though it's also where the run ended.
                state: step?.failed ? 'failed' : action.id === exitedAtActionId ? 'exited' : step?.state,
                stateDetail,
                stateAt,
                stats,
                onOpenAnalytics: () => setAnalyticsActionId(action.id),
                analyticsOpen: analyticsActionId === action.id
            }});
        });

        // Terminal marker.
        const terminalLabel = focused && selectedRun?.status === 'exited_early'
            ? 'Exited early'
            : 'Complete';
        const terminalState: FlowNodeData['state'] = !focused
            ? undefined
            : selectedRun?.status === 'completed' ? 'done' : selectedRun?.status === 'exited_early' ? 'skipped' : 'upcoming';
        descriptors.push({id: '__terminal__', data: {
            kind: 'terminal',
            title: terminalLabel,
            subtitle: '',
            focused,
            state: terminalState
        }});

        // Height of a node = base + email preview (email only) + whichever footer it
        // renders. When focused, a step shows its single-line run detail; unfocused, an
        // email shows its stats.
        const nodeHeight = (data: FlowNodeData): number => {
            if (data.kind === 'terminal') {
                return TERMINAL_NODE_HEIGHT;
            }
            const preview = data.kind === 'email' ? EMAIL_PREVIEW_HEIGHT : 0;
            // The trigger's config summary only shows while no run is in focus (a
            // focused run shows its enrolment time in that slot instead).
            const summary = (!focused && data.kind === 'trigger' && data.summary) ? TRIGGER_SUMMARY_HEIGHT : 0;
            const footer = focused
                ? (data.stateDetail ? DETAIL_FOOTER_HEIGHT : 0)
                : (data.stats ? STATS_FOOTER_HEIGHT : 0);
            return REGULAR_NODE_HEIGHT + preview + summary + footer;
        };
        const ys = stackNodeY(descriptors.map(d => nodeHeight(d.data)));
        const built: Node[] = descriptors.map((descriptor, i) => ({
            id: descriptor.id,
            type: 'flowStep',
            position: {x: 0, y: ys[i]},
            data: descriptor.data,
            draggable: false,
            connectable: false,
            selectable: false
        }));

        // Edges follow the node order.
        const ids = built.map(n => n.id);
        const builtEdges: Edge[] = [];
        for (let i = 0; i < ids.length - 1; i++) {
            const targetData = built[i + 1].data as unknown as FlowNodeData;
            const targetReached = focused && targetData.state ? reachedStates.has(targetData.state) : false;
            builtEdges.push({
                id: `${ids[i]}->${ids[i + 1]}`,
                source: ids[i],
                target: ids[i + 1],
                type: 'smoothstep',
                style: {
                    // One grey the whole way down, in every state. Reviewing a run,
                    // the connectors used to turn green behind the member as far as
                    // they'd got — which put the progress story in two places at once
                    // (the cards already carry it) and lit up half the canvas to say
                    // something the card borders and check marks say more precisely.
                    stroke: EDGE_STROKE,
                    strokeWidth: 1,
                    // Reached vs not is opacity on a solid line, not a dash pattern.
                    // A dash is a second kind of mark to learn; fading is just less of
                    // the same one, so the path a member actually travelled reads as
                    // present and the rest as pending without changing what the line is.
                    strokeOpacity: focused && !targetReached ? 0.4 : 1
                }
            });
        }

        // Bottom edge of the last node — drives the pan bound below.
        const bottom = ys.length ? ys[ys.length - 1] + nodeHeight(descriptors[descriptors.length - 1].data) : 0;

        return {nodes: built, edges: builtEdges, contentBottom: bottom};
    }, [automation, selectedRun, focused, triggerConfig, analyticsActionId]);

    const translateExtent = useMemo(
        () => panTranslateExtent(contentBottom, size, leftInset),
        [contentBottom, size, leftInset]
    );

    return (
        // relative: the analytics sheet slides in over this region.
        <div className="relative size-full">
            <div ref={canvasRef} className="size-full">
            <ReactFlow
                className={REACT_FLOW_THEME}
                edges={edges}
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
            >
                <Background variant={BackgroundVariant.Dots} />
            </ReactFlow>
            </div>

            <EmailAnalyticsSheet email={sheetEmail} onClose={() => setAnalyticsActionId(null)} />
        </div>
    );
};

export default SurfaceFlowCanvas;
