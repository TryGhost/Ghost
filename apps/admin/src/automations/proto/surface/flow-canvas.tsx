import '@xyflow/react/dist/style.css';
import React, {useMemo, useState} from 'react';
import {Background, BackgroundVariant, type Edge, Handle, type Node, type NodeProps, Position, ReactFlow} from '@xyflow/react';
import type {AutomationDetail, AutomationEmailStats} from '@tryghost/admin-x-framework/api/automations';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import type {AutomationRun, RunStepState} from '@/automations/proto/shared/mock';
import {DEFAULT_TRIGGER_CONFIG, type TriggerConfig, triggerLabel, triggerReviewLabel, triggerSummary} from '@/automations/proto/shared/trigger-config';
import {EDGE_STROKE, HIDDEN_HANDLE_STYLE, REACT_FLOW_THEME, REGULAR_NODE_HEIGHT, STATS_FOOTER_HEIGHT, TERMINAL_NODE_HEIGHT, TRIGGER_SUMMARY_HEIGHT, type StepKind, formatWait, orderActions, panTranslateExtent, stackNodeY, stepKindIcon, useCenteredColumn} from './flow-utils';
import {EmailAnalyticsSheet, type SheetEmail} from './email-analytics-sheet';
import {EmailStatsFooter} from './email-analytics';
import {NODE_BODY_PADDING, NODE_CARD_SURFACE, NodeCard, NodeHeader, type NodeBorder} from './flow-node-shell';
import {EmailPreview} from './email-preview';
import {CompletedGlyph, ExitedGlyph, InProgressGlyph} from '@/automations/proto/shared/run-glyphs';

// Height the email preview (subject + body sheet) adds to a read/run email node, on
// top of the header. Footer (stats or run detail) is added separately. Estimated —
// mirrors the edit canvas's EMAIL_FORM_HEIGHT so Y-layout stays clear of overlap.
const EMAIL_PREVIEW_HEIGHT = 260;

const fmtDateTime = (iso: string): string => new Date(iso).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});

type NodeKind = StepKind | 'terminal' | 'event';

type FlowNodeData = {
    kind: NodeKind;
    title: string;
    subtitle: string;
    focused: boolean;
    state?: RunStepState;
    // Event nodes only: what kind of between-steps event this card is.
    eventVariant?: 'exited' | 'failed';
    // Email only, review mode: the send went out but delivery failed, so the
    // title says "Sent email" rather than claiming the member received it.
    sentOnly?: boolean;
    // Supporting text ("Opened (1 link)"), the timestamp, and an optional override
    // for the badge's word. Kept as three fields rather than one pre-joined string
    // so the line can style each part differently.
    // stateDetail only surfaces for current steps now (the header's trailing
    // "Resumes Jul 24"); done steps surface stateAt instead. Kept as data for
    // both, since which one the header wants is presentation.
    stateDetail?: string | null;
    stateAt?: string | null;
    stats?: AutomationEmailStats;
    // Trigger node: the one-line config summary (read-only here — configuring
    // happens on the edit canvas), and the member-voice title for review mode.
    summary?: string;
    reviewLabel?: string;
    // Email node: opens the right-hand analytics sheet, and goes blue while that
    // sheet is reporting on it.
    onOpenAnalytics?: () => void;
    analyticsOpen?: boolean;
};

// Review state lives in the header now, not a footer. The leading chip swaps
// its step-kind icon for the run-state glyph in the badge treatment — pastel
// colour/20 fill, the darker -600 foreground in light (plain alias in dark) —
// and the step's timestamp sits at the header's far right.
//
// Only the two states a step can actually BE in. Exits and failures aren't step
// states any more — the step itself completed (the email was received; the send
// went out) — they're events between steps, rendered as their own card below.
// Skipped/upcoming cards keep the neutral chip: nothing happened, so there's no
// state to paint.
const STATE_CHIP: Partial<Record<RunStepState, {className: string; glyph: React.ElementType}>> = {
    done: {className: 'bg-green/20 text-green-600 dark:text-green', glyph: CompletedGlyph},
    current: {className: 'bg-blue/20 text-blue-600 dark:text-blue', glyph: InProgressGlyph}
};

// CircleAlert wrapped to the ElementType shape the chip slot takes.
function FailedGlyph({className}: {className?: string}) {
    return <LucideIcon.CircleAlert className={cn('size-4 shrink-0', className)} strokeWidth={2} />;
}

const FlowStepNode: React.FC<NodeProps> = ({data}) => {
    const d = data as FlowNodeData;
    const done = d.focused && d.state === 'done';
    const current = d.focused && d.state === 'current';
    const muted = d.focused && (d.state === 'skipped' || d.state === 'upcoming');
    const isEmail = d.kind === 'email';

    // The between-steps event: where the run ended, as its own card in the flow
    // rather than a recolouring of the step before it. Shaped like the wait card
    // (header only), because it narrates one fact. A member event (unsubscribed,
    // upgraded) reads in the exit treatment; a system fault (a bounce coming back
    // from the mail provider after a successful send) reads in the failure one —
    // the step above keeps its completed state either way, because it did happen.
    if (d.kind === 'event') {
        const failedEvent = d.eventVariant === 'failed';
        return (
            <NodeCard border={failedEvent ? 'failed' : 'exited'}>
                <NodeHeader
                    chipClassName={failedEvent ? 'bg-red/20 text-red-600 dark:text-red' : 'bg-muted text-muted-foreground'}
                    icon={failedEvent ? FailedGlyph : ExitedGlyph}
                    meta={d.stateAt}
                    title={d.title}
                />
            </NodeCard>
        );
    }

    if (d.kind === 'terminal') {
        const terminalBorder = current ? 'border-blue' : done ? 'border-green' : 'border-border-default';
        // (Terminal already renders muted for an exited run — see terminalState.)
        return (
            <div className={cn('flex w-[400px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium', NODE_CARD_SURFACE, terminalBorder, muted && 'opacity-60')}>
                <Handle position={Position.Top} style={HIDDEN_HANDLE_STYLE} type="target" />
                {done && <CompletedGlyph className="text-green-600 dark:text-green" />}
                <span className={cn(done && 'text-green-600 dark:text-green', muted && 'text-muted-foreground')}>{d.title}</span>
            </div>
        );
    }

    // Analytics wins the border: it only ever opens with no run in focus, so it
    // can't be masking a run state here.
    const border: NodeBorder = d.analyticsOpen ? 'selected' : current ? 'current' : done ? 'done' : 'default';
    // The chip stays the step-kind icon in every state. Run state was tried here
    // and moved: it took the position that identifies a card at a distance, and
    // the flow stopped being scannable by shape. It now leads the detail line at
    // the foot of the card, next to the words it qualifies.

    // Single-line header (no overline) matching edit mode's one-line title.
    //
    // Reviewing a run, every title narrates what this member did, with the tense
    // tracking their position: past above where they are ("Received email",
    // "Waited 7 days"), present at it ("Waiting 7 days"), and the plain
    // member-perspective form below it ("Receive email" — cards the run hasn't
    // reached describe the flow, not events). A failed delivery says "Sent
    // email": the send did complete, and the failure event card below carries
    // what came back. Without a run in focus the titles describe the flow you
    // built ("Send email").
    const label = isEmail
        ? (!d.focused ? 'Send email'
            : done ? (d.sentOnly ? 'Sent email' : 'Received email')
                : current ? 'Receiving email' : 'Receive email')
        : d.kind === 'wait'
            ? `${done ? 'Waited' : current ? 'Waiting' : 'Wait'} ${d.subtitle}`
            : d.focused ? (d.reviewLabel ?? d.subtitle) : d.subtitle;

    const chip = d.focused && d.state ? STATE_CHIP[d.state] : undefined;
    // Far right of the header: when the step happened, when it will ("Resumes
    // Jul 24" on a current step), or nothing for steps with no time to name.
    const meta = d.focused ? (d.stateAt ?? (current ? d.stateDetail : null)) : null;
    return (
        <NodeCard border={border} muted={muted}>
                <NodeHeader
                    chipClassName={chip?.className}
                    icon={chip?.glyph ?? stepKindIcon[d.kind]}
                    meta={meta}
                    title={label}
                />
                {isEmail && (
                    <div className={NODE_BODY_PADDING}>
                        <EmailPreview subject={d.subtitle || 'Untitled'} />
                        {!d.focused && d.stats && (
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
                        )}
                    </div>
                )}
                {/* Trigger: what this automation listens for, and how many criteria
                    end it. Read-only on this canvas. */}
                {d.kind === 'trigger' && !d.focused && d.summary && (
                    <div className={cn(NODE_BODY_PADDING, 'text-sm text-muted-foreground')}>{d.summary}</div>
                )}
        </NodeCard>
    );
};

const nodeTypes = {flowStep: FlowStepNode};

// Which node states count as "the member got here", for edge opacity. 'exited'
// and 'failed' belong with them: the step is one the member travelled to, so the
// line into it is a path taken — a different outcome, not a shorter journey. Only
// 'skipped' and 'upcoming' fade.
const reachedStates: ReadonlySet<RunStepState> = new Set(['done', 'current']);

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
            reviewLabel: triggerReviewLabel(triggerConfig ?? DEFAULT_TRIGGER_CONFIG),
            focused,
            state: focused ? 'done' : undefined,
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
            }
            descriptors.push({id: action.id, data: {
                kind: isEmail ? 'email' : 'wait',
                title: isEmail ? 'Send email' : 'Wait',
                subtitle: isEmail ? (action.data.email_subject || 'Untitled') : formatWait(action.data.wait_hours),
                focused,
                // The step keeps its own (raw) state even where the run ended —
                // the email WAS received, the send DID go out. What ended the run
                // is the event node inserted after it, not a repaint of this card.
                state: step?.state,
                sentOnly: Boolean(step?.failed),
                stateDetail,
                stateAt,
                stats,
                onOpenAnalytics: () => setAnalyticsActionId(action.id),
                analyticsOpen: analyticsActionId === action.id
            }});

            // The between-steps event card, after the step the run ended at. A
            // failed step's event names what the provider reported (the step's
            // detail); a member exit names the exit reason. Timestamped with the
            // step it follows — the closest moment the data has for it.
            if (action.id === exitedAtActionId && selectedRun) {
                const failedExit = Boolean(step?.failed);
                descriptors.push({id: '__exit__', data: {
                    kind: 'event',
                    title: failedExit
                        ? (step?.detail ?? 'Delivery failed')
                        : (selectedRun.exit_reason ?? 'Exited early'),
                    subtitle: '',
                    focused,
                    // 'done' so the edge INTO this card reads as path travelled.
                    state: 'done',
                    eventVariant: failedExit ? 'failed' : 'exited',
                    stateAt: step?.occurred_at ? fmtDateTime(step.occurred_at) : null
                }});
            }
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

        // Height of a node = base + email preview (email only) + footer. Focused
        // cards carry no footer any more — run state lives in the header — so the
        // only footer left is the unfocused email's stats row.
        const nodeHeight = (data: FlowNodeData): number => {
            if (data.kind === 'terminal') {
                return TERMINAL_NODE_HEIGHT;
            }
            const preview = data.kind === 'email' ? EMAIL_PREVIEW_HEIGHT : 0;
            // The trigger's config summary only shows while no run is in focus.
            const summary = (!focused && data.kind === 'trigger' && data.summary) ? TRIGGER_SUMMARY_HEIGHT : 0;
            const footer = !focused && data.stats ? STATS_FOOTER_HEIGHT : 0;
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
