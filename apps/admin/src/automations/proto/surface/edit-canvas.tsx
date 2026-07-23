import '@xyflow/react/dist/style.css';
import React, {useMemo, useState} from 'react';
import {Background, BaseEdge, type Edge, type EdgeProps, Handle, type Node, type NodeProps, Position, ReactFlow, getSmoothStepPath} from '@xyflow/react';
import type {AutomationDetail, InsertActionAnchor} from '@tryghost/admin-x-framework/api/automations';
import {insertSendEmailAction, insertWaitAction, removeAction, updateSendEmailAction, updateWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {NODE_GAP, type StepKind, formatWait, orderActions, stepKindIcon, useCenteredColumn} from './flow-utils';
import {StepNodeHeader} from './flow-node-shell';
import {StepSidebar} from './step-sidebar';

const AddStepMenu: React.FC<{children: React.ReactNode; onPick: (kind: 'email' | 'wait') => void}> = ({children, onPick}) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-40">
            <DropdownMenuItem onClick={() => onPick('email')}>
                <LucideIcon.Mail /> Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPick('wait')}>
                <LucideIcon.Clock /> Wait
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

type StepNodeData = {kind: StepKind; title: string; subtitle: string; selected: boolean};

const StepNode: React.FC<NodeProps> = ({data}) => {
    const d = data as StepNodeData;
    const clickable = d.kind !== 'trigger';
    return (
        <div className={cn('w-80 rounded-xl border bg-background p-4 shadow-sm transition-colors', clickable && 'cursor-pointer', d.selected ? 'border-blue ring-1 ring-blue' : 'border-border-default', clickable && !d.selected && 'hover:border-blue/50')}>
            <Handle position={Position.Top} style={{opacity: 0}} type="target" />
            <StepNodeHeader icon={stepKindIcon[d.kind]} subtitle={d.subtitle} title={d.title} />
            <Handle position={Position.Bottom} style={{opacity: 0}} type="source" />
        </div>
    );
};

type TailNodeData = {onAdd: (kind: 'email' | 'wait') => void};

const TailNode: React.FC<NodeProps> = ({data}) => {
    const d = data as TailNodeData;
    return (
        <div className="flex w-80 justify-center">
            <Handle position={Position.Top} style={{opacity: 0}} type="target" />
            <AddStepMenu onPick={d.onAdd}>
                <button aria-label="Add step" className="flex size-9 items-center justify-center rounded-full border border-dashed border-border-default bg-background text-muted-foreground transition-colors hover:border-blue hover:text-blue" type="button">
                    <LucideIcon.Plus className="size-4" />
                </button>
            </AddStepMenu>
        </div>
    );
};

const nodeTypes = {step: StepNode, tail: TailNode};

type PlusEdgeData = {onPick: (kind: 'email' | 'wait') => void};

const PlusEdge: React.FC<EdgeProps> = ({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data}) => {
    const [path, labelX, labelY] = getSmoothStepPath({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 20});
    const onPick = (data as PlusEdgeData | undefined)?.onPick;
    return (
        <>
            <BaseEdge markerEnd={markerEnd} path={path} style={{stroke: 'var(--color-grey-400)', strokeWidth: 2}} />
            {onPick && (
                <foreignObject className="overflow-visible" height={28} width={28} x={labelX - 14} y={labelY - 14}>
                    <AddStepMenu onPick={onPick}>
                        <button aria-label="Add step" className="flex size-6 items-center justify-center rounded-full border border-border-default bg-background text-muted-foreground shadow-sm transition-colors hover:border-blue hover:text-blue" type="button">
                            <LucideIcon.Plus className="size-3.5" />
                        </button>
                    </AddStepMenu>
                </foreignObject>
            )}
        </>
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
        const built: Node[] = [];
        built.push({
            id: '__trigger__',
            type: 'step',
            position: {x: 0, y: 0},
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
                position: {x: 0, y: (i + 1) * NODE_GAP},
                data: {
                    kind: isEmail ? 'email' : 'wait',
                    title: isEmail ? 'Send email' : 'Wait',
                    subtitle: isEmail ? (action.data.email_subject || 'Untitled') : formatWait(action.data.wait_hours),
                    selected: action.id === selectedId
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
            position: {x: 0, y: (ordered.length + 1) * NODE_GAP},
            data: {onAdd: (kind: 'email' | 'wait') => insert({previousActionId: lastId}, kind)},
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
                style: toTail ? {stroke: 'var(--color-grey-400)', strokeWidth: 2} : undefined,
                data: toTail ? undefined : {
                    onPick: (kind: 'email' | 'wait') => insert({
                        previousActionId: source === '__trigger__' ? undefined : source,
                        nextActionId: target
                    }, kind)
                }
            });
        }
        return {nodes: built, edges: builtEdges};
    }, [draft, ordered, selectedId]);

    return (
        <div className="flex size-full">
            <div ref={canvasRef} className="min-h-0 flex-1">
                <ReactFlow
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
                    <Background color="var(--color-grey-300)" />
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
