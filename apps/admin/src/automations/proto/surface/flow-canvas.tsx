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
    state?: RunStepState | 'done';
    stateDetail?: string | null;
    stats?: AutomationEmailStats;
    // Trigger node: the one-line config summary (read-only here — configuring
    // happens on the edit canvas).
    summary?: string;
    // Email node: opens the right-hand analytics sheet, and goes blue while that
    // sheet is reporting on it.
    onOpenAnalytics?: () => void;
    analyticsOpen?: boolean;
};

const FlowStepNode: React.FC<NodeProps> = ({data}) => {
    const d = data as FlowNodeData;
    const done = d.focused && d.state === 'done';
    const current = d.focused && d.state === 'current';
    const muted = d.focused && (d.state === 'skipped' || d.state === 'upcoming');
    const isEmail = d.kind === 'email';

    if (d.kind === 'terminal') {
        const terminalBorder = current ? 'border-blue' : done ? 'border-green' : 'border-border-default';
        return (
            <div className={cn('flex w-[400px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium', NODE_CARD_SURFACE, terminalBorder, muted && 'opacity-60')}>
                <Handle position={Position.Top} style={{opacity: 0}} type="target" />
                {done && <LucideIcon.Check className="size-4 text-green" strokeWidth={2.5} />}
                <span className={cn(done && 'text-green', muted && 'text-muted-foreground')}>{d.title}</span>
            </div>
        );
    }

    // Analytics wins the border: it only ever opens with no run in focus, so it
    // can't be masking a run state here.
    const border: NodeBorder = d.analyticsOpen ? 'selected' : current ? 'current' : done ? 'done' : 'default';
    // Run-state icon fills the same header slot the overflow/lock occupies in edit mode.
    const action = done
        ? <LucideIcon.Check className="size-4 text-green" strokeWidth={2.5} />
        : current
            ? <LucideIcon.Clock className="size-4 text-blue" />
            : undefined;

    // Single-line header (no overline) matching edit mode's one-line title. Email flips
    // perspective: "Send email" when previewing the flow you built (read), "Receive
    // email" once a member's run is in focus. Trigger/wait read the same either way.
    const label = isEmail
        ? (d.focused ? 'Receive email' : 'Send email')
        : d.kind === 'wait' ? `Wait ${d.subtitle}` : d.subtitle;

    return (
        <NodeCard border={border} muted={muted}>
                <NodeHeader action={action} icon={stepKindIcon[d.kind]} title={label} />
                {isEmail ? (
                    <div className={NODE_BODY_PADDING}>
                        <EmailPreview subject={d.subtitle || 'Untitled'} />
                        {d.focused
                            ? (d.stateDetail && <div className="mt-[24px] text-xs text-muted-foreground">{d.stateDetail}</div>)
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
                        {/* Trigger: what this automation listens for, and how many goals
                            end it. Read-only on this canvas. */}
                        {d.kind === 'trigger' && !d.focused && d.summary && (
                            <div className={cn(NODE_BODY_PADDING, 'text-sm text-muted-foreground')}>{d.summary}</div>
                        )}
                        {d.focused && d.stateDetail && (
                            <div className={cn(NODE_BODY_PADDING, 'text-xs text-muted-foreground')}>{d.stateDetail}</div>
                        )}
                    </>
                )}
        </NodeCard>
    );
};

const nodeTypes = {flowStep: FlowStepNode};

const reachedStates: ReadonlySet<RunStepState | 'done'> = new Set(['done', 'current']);

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
        ? {actionId: analyticsAction.id, subject: analyticsAction.data.email_subject, stats: analyticsAction.stats}
        : null;

    const {nodes, edges, contentBottom} = useMemo(() => {
        const ordered = orderActions(automation);
        const stepByAction = new Map((selectedRun?.steps ?? []).map(s => [s.action_id, s]));

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
            stateDetail: selectedRun ? fmtDateTime(selectedRun.enrolled_at) : null
        }});

        ordered.forEach((action) => {
            const step = stepByAction.get(action.id);
            const isEmail = action.type === 'send_email';
            const stats = action.type === 'send_email' ? action.stats : undefined;
            let stateDetail: string | null = null;
            if (focused) {
                if (step?.occurred_at) {
                    stateDetail = step.detail ? `${fmtDateTime(step.occurred_at)} · ${step.detail}` : fmtDateTime(step.occurred_at);
                } else if (step?.detail) {
                    stateDetail = step.detail;
                } else if (step?.state === 'upcoming') {
                    stateDetail = 'Not reached';
                } else if (step?.state === 'skipped') {
                    stateDetail = 'Skipped';
                }
            }
            descriptors.push({id: action.id, data: {
                kind: isEmail ? 'email' : 'wait',
                title: isEmail ? 'Send email' : 'Wait',
                subtitle: isEmail ? (action.data.email_subject || 'Untitled') : formatWait(action.data.wait_hours),
                focused,
                state: step?.state,
                stateDetail,
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
            const dashed = focused && !targetReached;
            builtEdges.push({
                id: `${ids[i]}->${ids[i + 1]}`,
                source: ids[i],
                target: ids[i + 1],
                type: 'smoothstep',
                style: {
                    stroke: (focused && targetReached) ? 'var(--color-green)' : EDGE_STROKE,
                    strokeWidth: 1,
                    strokeDasharray: dashed ? '6 6' : undefined
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
