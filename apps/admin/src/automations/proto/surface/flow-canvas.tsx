import '@xyflow/react/dist/style.css';
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Background, type Edge, Handle, type Node, type NodeProps, Position, ReactFlow, type ReactFlowInstance} from '@xyflow/react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import type {AutomationRun, RunStepState} from '@/automations/proto/shared/mock';
import {formatWait, orderActions} from './flow-utils';

const NODE_WIDTH = 320;
const NODE_GAP = 200;

const fmtDateTime = (iso: string): string => new Date(iso).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});

type NodeKind = 'trigger' | 'email' | 'wait' | 'terminal';

type FlowNodeData = {
    kind: NodeKind;
    title: string;
    subtitle: string;
    focused: boolean;
    state?: RunStepState | 'done';
    stateDetail?: string | null;
    stats?: {sent: number; opened: number; clicked: number};
};

const kindIcon: Record<NodeKind, React.ElementType> = {
    trigger: LucideIcon.Zap,
    email: LucideIcon.Mail,
    wait: LucideIcon.Clock,
    terminal: LucideIcon.Flag
};

const FlowStepNode: React.FC<NodeProps> = ({data}) => {
    const d = data as FlowNodeData;
    const Icon = kindIcon[d.kind];
    const done = d.focused && d.state === 'done';
    const current = d.focused && d.state === 'current';
    const muted = d.focused && (d.state === 'skipped' || d.state === 'upcoming');
    const borderClass = current ? 'border-blue' : done ? 'border-green' : 'border-border-default';

    if (d.kind === 'terminal') {
        return (
            <div className={cn('flex w-80 items-center justify-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium', borderClass, muted && 'opacity-60')}>
                <Handle position={Position.Top} style={{opacity: 0}} type="target" />
                {done && <LucideIcon.Check className="size-4 text-green" strokeWidth={2.5} />}
                <span className={cn(done && 'text-green', muted && 'text-muted-foreground')}>{d.title}</span>
            </div>
        );
    }

    return (
        <div className={cn('w-80 rounded-xl border bg-background p-4 shadow-sm', borderClass, muted && 'opacity-60')}>
            <Handle position={Position.Top} style={{opacity: 0}} type="target" />
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                        <span className="text-xs text-muted-foreground">{d.title}</span>
                        <span className="truncate font-medium">{d.subtitle}</span>
                    </div>
                </div>
                {done && <LucideIcon.Check className="size-4 shrink-0 text-green" strokeWidth={2.5} />}
                {current && <LucideIcon.Clock className="size-4 shrink-0 text-blue" />}
            </div>

            {d.focused ? (
                d.stateDetail && <div className="mt-3 border-t border-border-default pt-2 text-xs text-muted-foreground">{d.stateDetail}</div>
            ) : (
                d.stats && (
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border-default pt-2 text-xs">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground">Sent</span>
                            <span className="font-medium">{formatNumber(d.stats.sent)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-muted-foreground">Opened</span>
                            <span className="font-medium">{d.stats.opened}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-muted-foreground">Clicked</span>
                            <span className="font-medium">{d.stats.clicked}%</span>
                        </div>
                    </div>
                )
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
    const canvasRef = useRef<HTMLDivElement>(null);
    const focused = Boolean(selectedRun);

    const {nodes, edges} = useMemo(() => {
        const ordered = orderActions(automation);
        const stepByAction = new Map((selectedRun?.steps ?? []).map(s => [s.action_id, s]));

        const built: Node[] = [];
        const makeNode = (id: string, index: number, data: FlowNodeData): Node => ({
            id,
            type: 'flowStep',
            position: {x: 0, y: index * NODE_GAP},
            data: data,
            draggable: false,
            connectable: false,
            selectable: false
        });

        // Trigger — always "done" once enrolled.
        built.push(makeNode('__trigger__', 0, {
            kind: 'trigger',
            title: 'Trigger',
            subtitle: 'Member signup',
            focused,
            state: focused ? 'done' : undefined,
            stateDetail: selectedRun ? fmtDateTime(selectedRun.enrolled_at) : null
        }));

        ordered.forEach((action, i) => {
            const step = stepByAction.get(action.id);
            const isEmail = action.type === 'send_email';
            const stats = isEmail && action.stats
                ? {sent: action.stats.email_sent_count, opened: action.stats.opened_rate ?? 0, clicked: action.stats.clicked_rate ?? 0}
                : undefined;
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
            built.push(makeNode(action.id, i + 1, {
                kind: isEmail ? 'email' : 'wait',
                title: isEmail ? 'Send email' : 'Wait',
                subtitle: isEmail ? (action.data.email_subject || 'Untitled') : formatWait(action.data.wait_hours),
                focused,
                state: step?.state,
                stateDetail,
                stats
            }));
        });

        // Terminal marker.
        const terminalLabel = focused && selectedRun?.status === 'exited_early'
            ? 'Exited early'
            : 'Complete';
        const terminalState: FlowNodeData['state'] = !focused
            ? undefined
            : selectedRun?.status === 'completed' ? 'done' : selectedRun?.status === 'exited_early' ? 'skipped' : 'upcoming';
        built.push(makeNode('__terminal__', ordered.length + 1, {
            kind: 'terminal',
            title: terminalLabel,
            subtitle: '',
            focused,
            state: terminalState
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
                    stroke: dashed ? 'var(--color-grey-400)' : (focused ? 'var(--color-green)' : 'var(--color-grey-400)'),
                    strokeWidth: 2,
                    strokeDasharray: dashed ? '6 6' : undefined
                }
            });
        }

        return {nodes: built, edges: builtEdges};
    }, [automation, selectedRun, focused]);

    const flowRef = useRef<ReactFlowInstance | null>(null);

    // Keep the flow column horizontally centred, re-running on resize (window,
    // sidebar collapse) while preserving the user's pan and zoom.
    const centerColumn = useCallback(() => {
        const instance = flowRef.current;
        const el = canvasRef.current;
        if (!instance || !el) {
            return;
        }
        const {y, zoom} = instance.getViewport();
        void instance.setViewport({x: Math.round(el.clientWidth / 2 - (NODE_WIDTH * zoom) / 2), y, zoom});
    }, []);

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver(() => centerColumn());
        observer.observe(el);
        return () => observer.disconnect();
    }, [centerColumn]);

    return (
        <div ref={canvasRef} className="size-full">
            <ReactFlow
                edges={edges}
                nodes={nodes}
                nodesConnectable={false}
                nodesDraggable={false}
                nodeTypes={nodeTypes}
                proOptions={{hideAttribution: true}}
                zoomOnScroll={false}
                panOnDrag
                panOnScroll
                onInit={(instance) => {
                    flowRef.current = instance;
                    const width = canvasRef.current?.clientWidth ?? 800;
                    void instance.setViewport({x: Math.round(width / 2 - NODE_WIDTH / 2), y: 48, zoom: 1});
                }}
            >
                <Background color="var(--color-grey-300)" />
            </ReactFlow>
        </div>
    );
};

export default SurfaceFlowCanvas;
