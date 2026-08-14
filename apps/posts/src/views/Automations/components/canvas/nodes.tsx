import '@xyflow/react/dist/style.css';
import React, {useRef, useState} from 'react';
import StepPicker, {type StepPickerType} from './step-picker';
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {Handle, Node, NodeProps, Position} from '@xyflow/react';
import {InsertActionAnchor} from '@tryghost/admin-x-framework/api/automations';
import {LucideIcon, cn} from '@tryghost/shade/utils';

// React Flow node IDs for the trigger and tail nodes. The canvas builds the visual graph using
// these; they are not action IDs and never reach the API.
export const TRIGGER_CANVAS_ID = '__trigger__';
export const TAIL_CANVAS_ID = '__tail__';

// Canvas-local anchor: React Flow node IDs of the two nodes between which a step is being inserted.
// Translated to the API's `InsertActionAnchor` by `toApiAnchor` before reaching the data helpers.
export type CanvasAnchor = {sourceId: string; targetId: string};

export const toApiAnchor = ({sourceId, targetId}: CanvasAnchor): InsertActionAnchor => ({
    previousActionId: sourceId === TRIGGER_CANVAS_ID ? undefined : sourceId,
    nextActionId: targetId === TAIL_CANVAS_ID ? undefined : targetId
});

export type StepNodeDisplayData = {
  errorMessage?: string;
  icon: React.ElementType;
  label: string;
  isPlaceholderValue?: boolean;
  value?: string;
  warningMessage?: string;
};

type NodeContextMenuItem = {
  icon?: React.ElementType;
  label: string;
  onSelect: () => void;
  type?: 'item';
  variant?: 'default' | 'destructive';
};

type NodeContextMenuSeparator = {
  id: string;
  type: 'separator';
};

export type NodeContextMenuEntry = NodeContextMenuItem | NodeContextMenuSeparator;

type StepNodeData = StepNodeDisplayData & {
  contextMenuItems: NodeContextMenuEntry[];
  isNew: boolean;
  selected: boolean;
  onSelect: () => void;
};

type TailNodeData = {
  disabled: boolean;
  disabledReason?: string;
  onPick: (type: StepPickerType, anchor: CanvasAnchor) => void;
  anchor: CanvasAnchor;
};

type StepFlowNode = Node<StepNodeData, 'trigger' | 'step'>;
type TailFlowNode = Node<TailNodeData, 'tail'>;
export type AutomationFlowNode = StepFlowNode | TailFlowNode;

const HIDDEN_HANDLE_STYLE: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    height: 0,
    minHeight: 0,
    minWidth: 0,
    opacity: 0,
    pointerEvents: 'none',
    width: 0
};

const HiddenHandle: React.FC<{type: 'source' | 'target'; position: Position}> = ({type, position}) => (
    <Handle isConnectable={false} position={position} style={HIDDEN_HANDLE_STYLE} type={type} />
);

const NodeShell: React.FC<React.PropsWithChildren<{className?: string; data: StepNodeData}>> = ({children, className, data}) => {
    const ignoreNextClickRef = useRef(false);

    return (
        <ContextMenu onOpenChange={(open) => {
            if (!open) {
                ignoreNextClickRef.current = false;
            }
        }}>
            <ContextMenuTrigger asChild>
                <button
                    aria-invalid={Boolean(data.errorMessage)}
                    aria-label={data.value ? `${data.label}: ${data.value}` : data.label}
                    aria-pressed={data.selected}
                    className={cn(
                        'flex w-64 items-center gap-3 rounded-lg border border-transparent bg-surface-elevated p-3 text-left text-sm text-foreground shadow-sm transition-all focus-visible:border-border-strong focus-visible:outline-none',
                        (data.errorMessage || data.warningMessage) && 'items-start',
                        !data.selected && 'hover:border-border-strong',
                        data.selected && !data.errorMessage && 'border-gray-700 shadow-[inset_0_0_0_1px_var(--color-gray-700),0_1px_2px_0_rgb(0_0_0_/_0.05)]',
                        data.errorMessage && 'border-destructive',
                        !data.errorMessage && data.warningMessage && 'border-yellow-600',
                        data.isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
                        className
                    )}
                    type='button'
                    onClick={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || ignoreNextClickRef.current) {
                            ignoreNextClickRef.current = false;
                            return;
                        }
                        data.onSelect();
                    }}
                    onContextMenu={(event) => {
                        ignoreNextClickRef.current = true;
                        event.stopPropagation();
                    }}
                    onPointerDown={(event) => {
                        if (event.button === 2) {
                            event.stopPropagation();
                        }
                    }}
                >
                    {children}
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent
                className='w-44'
                onClick={event => event.stopPropagation()}
                onPointerDown={event => event.stopPropagation()}
            >
                {data.contextMenuItems.map((item) => {
                    if (item.type === 'separator') {
                        return <ContextMenuSeparator key={item.id} />;
                    }
                    const Icon = item.icon;
                    return (
                        <ContextMenuItem key={item.label} variant={item.variant} onSelect={item.onSelect}>
                            {Icon && <Icon className='size-4' />}
                            {item.label}
                        </ContextMenuItem>
                    );
                })}
            </ContextMenuContent>
        </ContextMenu>
    );
};

const StepNodeContent: React.FC<{data: StepNodeData}> = ({data}) => {
    const Icon = data.icon;
    const statusMessage = data.errorMessage || data.warningMessage;
    return (
        <>
            <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-text-secondary', statusMessage && 'mt-[3px]')}>
                <Icon className='size-4' />
            </div>
            <div className='flex min-w-0 flex-col text-left'>
                <span className='text-sm text-text-secondary'>{data.label}</span>
                {data.value && <span className={cn('truncate text-base font-medium', data.isPlaceholderValue && 'opacity-50')}>{data.value}</span>}
                {data.errorMessage && <span className='mt-1 text-xs text-destructive'>{data.errorMessage}</span>}
                {!data.errorMessage && data.warningMessage && <span className='mt-1 text-xs text-yellow-600'>{data.warningMessage}</span>}
            </div>
        </>
    );
};

const TriggerNode = React.memo<NodeProps<StepFlowNode>>(({data}) => (
    <NodeShell data={data}>
        <StepNodeContent data={data} />
        <HiddenHandle position={Position.Bottom} type='source' />
    </NodeShell>
));
TriggerNode.displayName = 'TriggerNode';

const StepNode = React.memo<NodeProps<StepFlowNode>>(({data}) => (
    <NodeShell data={data}>
        <HiddenHandle position={Position.Top} type='target' />
        <StepNodeContent data={data} />
        <HiddenHandle position={Position.Bottom} type='source' />
    </NodeShell>
));
StepNode.displayName = 'StepNode';

const TailNode: React.FC<NodeProps<TailFlowNode>> = ({data}) => {
    const [open, setOpen] = useState(false);

    const handlePick = (type: StepPickerType) => {
        setOpen(false);
        data.onPick(type, data.anchor);
    };

    const triggerClassName = 'flex h-12 w-64 items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-page transition-colors hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none';

    if (data.disabled) {
        return (
            <div
                className='flex h-12 w-64 items-center justify-center rounded-lg border border-border-default bg-[repeating-linear-gradient(135deg,var(--color-white)_0,var(--color-white)_12px,var(--color-gray-100)_12px,var(--color-gray-100)_24px)] text-sm font-medium text-text-secondary'
                data-testid='step-limit-tail-node'
            >
                <HiddenHandle position={Position.Top} type='target' />
                <LucideIcon.Milestone className='mr-2 size-4' strokeWidth={1.5} />
                {data.disabledReason}
            </div>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                aria-label='Add step'
                className={cn(triggerClassName, 'cursor-pointer')}
                data-testid='add-step-tail-button'
            >
                <HiddenHandle position={Position.Top} type='target' />
                <LucideIcon.Plus className='size-5 text-text-secondary' strokeWidth={1.5} />
            </PopoverTrigger>
            <PopoverContent align='center' className='border-0 p-0 shadow-lg' side='top' sideOffset={12}>
                <StepPicker onPick={handlePick} />
            </PopoverContent>
        </Popover>
    );
};

const nodeTypes = {
    trigger: TriggerNode,
    step: StepNode,
    tail: TailNode
};

export {TriggerNode, StepNode, TailNode, nodeTypes};