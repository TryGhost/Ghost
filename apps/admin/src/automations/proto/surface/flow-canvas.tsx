import '@xyflow/react/dist/style.css';
import React, {useMemo} from 'react';
import {Background, BackgroundVariant, type Edge, Handle, type Node, type NodeProps, Position, ReactFlow} from '@xyflow/react';
import type {AutomationDetail, AutomationEmailStats} from '@tryghost/admin-x-framework/api/automations';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import type {AutomationRun, RunStepState} from '@/automations/proto/shared/mock';
import {DETAIL_FOOTER_HEIGHT, EDGE_STROKE, REACT_FLOW_THEME, REGULAR_NODE_HEIGHT, STATS_FOOTER_HEIGHT, TERMINAL_NODE_HEIGHT, type StepKind, formatWait, orderActions, stackNodeY, stepKindIcon, useCenteredColumn} from './flow-utils';
import {StepNodeHeader} from './flow-node-shell';
import {EmailStatsFooter} from './email-analytics';

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
};

const FlowStepNode: React.FC<NodeProps> = ({data}) => {
    const d = data as FlowNodeData;
    const done = d.focused && d.state === 'done';
    const current = d.focused && d.state === 'current';
    const muted = d.focused && (d.state === 'skipped' || d.state === 'upcoming');
    const borderClass = current ? 'border-blue' : done ? 'border-green' : 'border-border-default';

    if (d.kind === 'terminal') {
        return (
            <div className={cn('flex w-80 items-center justify-center gap-2 rounded-full border bg-surface-elevated-2 px-4 py-2 text-sm font-medium', borderClass, muted && 'opacity-60')}>
                <Handle position={Position.Top} style={{opacity: 0}} type="target" />
                {done && <LucideIcon.Check className="size-4 text-green" strokeWidth={2.5} />}
                <span className={cn(done && 'text-green', muted && 'text-muted-foreground')}>{d.title}</span>
            </div>
        );
    }

    return (
        <div className={cn('w-80 rounded-xl border bg-surface-elevated-2 p-6 shadow-sm', borderClass, muted && 'opacity-60')}>
            <Handle position={Position.Top} style={{opacity: 0}} type="target" />
            <div className="flex items-start justify-between gap-2">
                <StepNodeHeader icon={stepKindIcon[d.kind]} subtitle={d.subtitle} title={d.title} />
                {done && <LucideIcon.Check className="size-4 shrink-0 text-green" strokeWidth={2.5} />}
                {current && <LucideIcon.Clock className="size-4 shrink-0 text-blue" />}
            </div>

            {d.focused ? (
                d.stateDetail && <div className="mt-3 border-t border-border-default pt-2 text-xs text-muted-foreground">{d.stateDetail}</div>
            ) : (
                d.stats && <EmailStatsFooter stats={d.stats} />
            )}
            <Handle position={Position.Bottom} style={{opacity: 0}} type="source" />
        </div>
    );
};

const nodeTypes = {flowStep: FlowStepNode};

const reachedStates: ReadonlySet<RunStepState | 'done'> = new Set(['done', 'current']);

interface SurfaceFlowCanvasProps {
    automation: AutomationDetail;
    selectedRun: AutomationRun | null;
}

export const SurfaceFlowCanvas: React.FC<SurfaceFlowCanvasProps> = ({automation, selectedRun}) => {
    const {canvasRef, onInit} = useCenteredColumn();
    const focused = Boolean(selectedRun);

    const {nodes, edges} = useMemo(() => {
        const ordered = orderActions(automation);
        const stepByAction = new Map((selectedRun?.steps ?? []).map(s => [s.action_id, s]));

        // Collect node data in flow order first, so we can position each from its
        // rendered height (which footer, if any, it carries) for even visible gaps.
        const descriptors: {id: string; data: FlowNodeData}[] = [];

        // Trigger — always "done" once enrolled.
        descriptors.push({id: '__trigger__', data: {
            kind: 'trigger',
            title: 'Trigger',
            subtitle: 'Member signup',
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
                stats
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

        // Height of a node = base + whichever footer it renders. When focused, a
        // step shows its single-line run detail; unfocused, an email shows its stats.
        const nodeHeight = (data: FlowNodeData): number => {
            if (data.kind === 'terminal') {
                return TERMINAL_NODE_HEIGHT;
            }
            const footer = focused
                ? (data.stateDetail ? DETAIL_FOOTER_HEIGHT : 0)
                : (data.stats ? STATS_FOOTER_HEIGHT : 0);
            return REGULAR_NODE_HEIGHT + footer;
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
                    strokeWidth: 2,
                    strokeDasharray: dashed ? '6 6' : undefined
                }
            });
        }

        return {nodes: built, edges: builtEdges};
    }, [automation, selectedRun, focused]);

    return (
        <div ref={canvasRef} className="size-full">
            <ReactFlow
                className={REACT_FLOW_THEME}
                edges={edges}
                nodes={nodes}
                nodesConnectable={false}
                nodesDraggable={false}
                nodeTypes={nodeTypes}
                proOptions={{hideAttribution: true}}
                zoomOnScroll={false}
                panOnDrag
                panOnScroll
                onInit={onInit}
            >
                <Background variant={BackgroundVariant.Dots} />
            </ReactFlow>
        </div>
    );
};

export default SurfaceFlowCanvas;
