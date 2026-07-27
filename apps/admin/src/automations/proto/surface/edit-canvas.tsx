import '@xyflow/react/dist/style.css';
import React, {useMemo, useState} from 'react';
import StepPicker, {type StepPickerType} from '@/automations/components/canvas/step-picker';
import {Background, BackgroundVariant, BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps, Handle, type Node, type NodeProps, Position, ReactFlow, getSmoothStepPath} from '@xyflow/react';
import type {AutomationDetail, AutomationEmailStats, InsertActionAnchor} from '@tryghost/admin-x-framework/api/automations';
import {insertSendEmailAction, insertWaitAction, removeAction, updateSendEmailAction, updateWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {EDGE_STROKE, REACT_FLOW_THEME, REGULAR_NODE_HEIGHT, STATS_FOOTER_HEIGHT, TAIL_NODE_HEIGHT, type StepKind, formatWait, orderActions, stackNodeY, stepKindIcon, useCenteredColumn} from './flow-utils';
import {StepNodeHeader} from './flow-node-shell';
import {EmailStatsFooter} from './email-analytics';
import {StepSidebar} from './step-sidebar';

// The real editor's StepPicker speaks 'send_email' | 'wait'; the proto's graph
// helpers here take 'email' | 'wait'.
const toInsertKind = (type: StepPickerType): 'email' | 'wait' => (type === 'send_email' ? 'email' : 'wait');

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

type StepNodeData = {kind: StepKind; title: string; subtitle: string; selected: boolean; stats?: AutomationEmailStats};

const StepNode: React.FC<NodeProps> = ({data}) => {
    const d = data as StepNodeData;
    const clickable = d.kind !== 'trigger';
    return (
        <div className={cn('w-80 rounded-xl border bg-surface-elevated p-4 shadow-sm transition-colors', clickable && 'cursor-pointer', d.selected ? 'border-blue ring-1 ring-blue' : 'border-border-default', clickable && !d.selected && 'hover:border-blue/50')}>
            <Handle position={Position.Top} style={{opacity: 0}} type="target" />
            <StepNodeHeader icon={stepKindIcon[d.kind]} subtitle={d.subtitle} title={d.title} />
            {d.stats && <EmailStatsFooter stats={d.stats} />}
            <Handle position={Position.Bottom} style={{opacity: 0}} type="source" />
        </div>
    );
};

type TailNodeData = {onPick: (type: StepPickerType) => void};

const TailNode: React.FC<NodeProps> = ({data}) => {
    const {onPick} = data as TailNodeData;
    const [open, setOpen] = useState(false);
    return (
        <div className="flex w-80">
            <Handle position={Position.Top} style={{opacity: 0}} type="target" />
            <AddStepPopover open={open} onOpenChange={setOpen} onPick={onPick}>
                <button aria-label="Add step" className="flex h-12 w-80 items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-page text-text-secondary transition-colors hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none" type="button">
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
    const {canvasRef, onInit} = useCenteredColumn();
    const [selectedId, setSelectedId] = useState<string | null>(null);

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

    const {nodes, edges} = useMemo(() => {
        // Height-aware layout: trigger, then each action (email nodes carry a stats
        // footer), then the tail button. Even visible gaps regardless of node height.
        const heights = [REGULAR_NODE_HEIGHT];
        ordered.forEach((action) => {
            heights.push(action.type === 'send_email' ? REGULAR_NODE_HEIGHT + STATS_FOOTER_HEIGHT : REGULAR_NODE_HEIGHT);
        });
        heights.push(TAIL_NODE_HEIGHT);
        const ys = stackNodeY(heights);

        const built: Node[] = [];
        built.push({
            id: '__trigger__',
            type: 'step',
            position: {x: 0, y: ys[0]},
            data: {kind: 'trigger', title: 'Trigger', subtitle: 'Member signup', selected: false},
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
                    stats: action.type === 'send_email' ? action.stats : undefined
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
        return {nodes: built, edges: builtEdges};
    }, [draft, ordered, selectedId]);

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
                    nodeTypes={nodeTypes}
                    proOptions={{hideAttribution: true}}
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
        </div>
    );
};

export default SurfaceEditCanvas;
