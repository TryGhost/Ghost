import React, {useState} from 'react';
import StepPicker, {type StepPickerType} from './step-picker';
import {BaseEdge, EdgeLabelRenderer, getSmoothStepPath} from '@xyflow/react';
import type {EdgeProps} from '@xyflow/react';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {Popover, PopoverContent, PopoverTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';

export type AddStepEdgeData = {
    sourceId: string;
    targetId: string;
    disabled: boolean;
    disabledReason?: string;
    onPick: (type: StepPickerType, anchor: {sourceId: string; targetId: string}) => void;
};

const INSERT_BUTTON_CLASSES = 'border-dashed border-border-default bg-surface-page text-text-secondary shadow-sm hover:border-border-strong';
const DEFAULT_EDGE_STROKE = 'var(--xy-edge-stroke)';

const AddStepEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data
}) => {
    const [open, setOpen] = useState(false);
    const [edgeHovered, setEdgeHovered] = useState(false);
    const [labelHovered, setLabelHovered] = useState(false);
    const edgeData = data as AddStepEdgeData | undefined;

    const [path, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
    });

    if (!edgeData) {
        return <BaseEdge id={id} path={path} style={{stroke: DEFAULT_EDGE_STROKE}} />;
    }

    const handlePick = (type: StepPickerType) => {
        setOpen(false);
        edgeData.onPick(type, {sourceId: edgeData.sourceId, targetId: edgeData.targetId});
    };

    const visible = open || edgeHovered || labelHovered;
    const button = (
        <button
            aria-label='Insert step here'
            className={cn(
                'flex size-8 items-center justify-center rounded-full border transition-opacity focus-visible:opacity-100 focus-visible:outline-none',
                INSERT_BUTTON_CLASSES,
                visible ? 'opacity-100' : 'opacity-0',
                edgeData.disabled && 'cursor-not-allowed!'
            )}
            data-testid={`add-step-button-${edgeData.sourceId}-${edgeData.targetId}`}
            disabled={edgeData.disabled}
            type='button'
        >
            <LucideIcon.Plus className='size-5' strokeWidth={1.5} />
        </button>
    );

    let control: React.ReactNode;
    if (edgeData.disabled) {
        control = edgeData.disabledReason ? (
            <TooltipProvider delayDuration={150}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span tabIndex={0}>{button}</span>
                    </TooltipTrigger>
                    <TooltipContent>{edgeData.disabledReason}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        ) : button;
    } else {
        control = (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>{button}</PopoverTrigger>
                <PopoverContent align='center' className='border-0 p-0 shadow-lg' side='top' sideOffset={12}>
                    <StepPicker onPick={handlePick} />
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <g
            onMouseEnter={() => setEdgeHovered(true)}
            onMouseLeave={() => setEdgeHovered(false)}
        >
            <BaseEdge id={id} interactionWidth={30} path={path} style={{stroke: DEFAULT_EDGE_STROKE}} />
            <EdgeLabelRenderer>
                <div
                    className='pointer-events-auto absolute'
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
                    }}
                    onMouseEnter={() => setLabelHovered(true)}
                    onMouseLeave={() => setLabelHovered(false)}
                >
                    {/* Wider hit zone so the + becomes visible when the cursor is near the edge midpoint. */}
                    <div className='flex h-10 w-16 items-center justify-center'>
                        {control}
                    </div>
                </div>
            </EdgeLabelRenderer>
        </g>
    );
};

export default AddStepEdge;
