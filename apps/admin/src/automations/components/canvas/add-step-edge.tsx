import React, { useEffect, useState } from 'react';
import StepPicker, { type StepPickerType } from './step-picker';
import { useDismissOnOutsidePress } from './use-dismiss-on-outside-press';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';

export type AddStepEdgeData = {
  label?: string;
  sourceId: string;
  targetId: string;
  disabled: boolean;
  disabledReason?: string;
  onPick: (type: StepPickerType, anchor: { sourceId: string; targetId: string }) => void;
  // Draw the line in from its top, with the + appearing as it does.
  connectIn?: boolean;
};

const INSERT_BUTTON_CLASSES =
  'border-dashed border-border-default bg-surface-page text-text-secondary shadow-sm hover:border-border-strong';
const DEFAULT_EDGE_STROKE = 'var(--xy-edge-stroke)';
const DRAW_CLASS =
  'transition-[stroke-dashoffset] duration-180 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none';

const AddStepEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, contentRef, onCloseAutoFocus } = useDismissOnOutsidePress(open, setOpen);
  const edgeData = data as AddStepEdgeData | undefined;
  // A dash the length of the line, offset out of sight and slid back in. The line is a
  // straight drop, so its length is the distance between its ends.
  const drawLength = Math.abs(targetY - sourceY) + Math.abs(targetX - sourceX);
  const [connectIn] = useState(Boolean(edgeData?.connectIn));
  const [drawn, setDrawn] = useState(!connectIn);
  // React Flow renders an edge before its ends are measured; drawing a zero-length
  // line would finish instantly, so wait for a real one.
  useEffect(() => {
    if (drawn || drawLength === 0) {
      return;
    }
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [drawn, drawLength]);
  const stroke: React.CSSProperties = {
    stroke: DEFAULT_EDGE_STROKE,
    ...(connectIn && { strokeDasharray: drawLength, strokeDashoffset: drawn ? 0 : drawLength }),
  };

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  if (!edgeData) {
    return <BaseEdge id={id} path={path} style={{ stroke: DEFAULT_EDGE_STROKE }} />;
  }

  const handlePick = (type: StepPickerType) => {
    setOpen(false);
    edgeData.onPick(type, { sourceId: edgeData.sourceId, targetId: edgeData.targetId });
  };

  const button = (
    <button
      ref={triggerRef}
      aria-label={edgeData.label ?? 'Insert step here'}
      className={cn(
        'flex size-8 items-center justify-center rounded-full border focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-none',
        INSERT_BUTTON_CLASSES,
        edgeData.disabled && 'cursor-not-allowed!',
      )}
      data-testid={`add-step-button-${edgeData.sourceId}-${edgeData.targetId}`}
      disabled={edgeData.disabled}
      type="button"
    >
      <LucideIcon.Plus className="size-5" strokeWidth={1.5} />
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
    ) : (
      button
    );
  } else {
    control = (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{button}</PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          align="center"
          className="border-0 p-0 shadow-lg"
          side="top"
          sideOffset={12}
          updatePositionStrategy="always"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <StepPicker onPick={handlePick} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <BaseEdge className={connectIn ? DRAW_CLASS : undefined} id={id} path={path} style={stroke} />
      <EdgeLabelRenderer>
        <div
          className={cn(
            'pointer-events-auto absolute',
            connectIn && 'transition-opacity motion-reduce:transition-none',
            !drawn && 'opacity-0',
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {control}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default AddStepEdge;
