import { TriggerCard, type TriggerData } from './trigger-card';
import { ConditionCard, type ConditionData } from './condition-card';
import { INSERT_BUTTON_CLASSES } from './add-step-edge';
import { ConditionPicker } from './step-picker';
import { useDismissOnOutsidePress } from './use-dismiss-on-outside-press';
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { AutomationCard } from './automation-card';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { EditableWaitCard, type EditableWaitData } from './editable-wait-card';
import { EditableEmailCard, type EditableEmailData } from './editable-email-card';
import type { EmailCardAnalyticsData } from './email-card-analytics';
import { ENTRANCE_EASE, useRevealAfterMount } from './use-reveal-after-mount';

// React Flow node IDs for the trigger and tail nodes. The canvas builds the visual graph using
// these; they are not action IDs and never reach the API.
export const TRIGGER_CANVAS_ID = '__trigger__';
export const TAIL_CANVAS_ID = '__tail__';
export const CONDITION_CANVAS_ID = '__condition__';
export const ADD_CONDITION_CANVAS_ID = '__add_condition__';

// Where the line between the trigger and its condition meets each card, level with the headers.
export const CONDITION_CONNECTOR_Y = 42;
export const CONDITION_HANDLE_ID = 'condition';

// Canvas-local anchor: React Flow node IDs of the two nodes between which a step is being inserted.
// Translated to the API's `InsertActionAnchor` by `toApiAnchor` (in ./node-helpers) before reaching the data helpers.
export type CanvasAnchor = { sourceId: string; targetId: string };

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

type StepNodeData = {
  email?: EditableEmailData;
  wait?: EditableWaitData;
  errorMessage?: string;
  analytics?: EmailCardAnalyticsData;
  contextMenuItems: NodeContextMenuEntry[];
  isNew: boolean;
};

type TriggerNodeData = {
  trigger: TriggerData;
  errorMessage?: string;
  onInteract: () => void;
};

export type ConditionNodeData = {
  condition: ConditionData;
  errorMessage?: string;
  contextMenuItems: NodeContextMenuEntry[];
};

type StepFlowNode = Node<StepNodeData, 'step'>;
type TriggerFlowNode = Node<TriggerNodeData, 'trigger'>;
type TailFlowNode = Node<{ connectIn?: boolean }, 'tail'>;
type ConditionFlowNode = Node<ConditionNodeData, 'condition'>;
type AddConditionFlowNode = Node<{ onAdd: () => void }, 'addCondition'>;
export type AutomationFlowNode =
  | StepFlowNode
  | TriggerFlowNode
  | TailFlowNode
  | ConditionFlowNode
  | AddConditionFlowNode;

const HIDDEN_HANDLE_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  height: 0,
  minHeight: 0,
  minWidth: 0,
  opacity: 0,
  pointerEvents: 'none',
  width: 0,
};

const HiddenHandle: React.FC<{
  type: 'source' | 'target';
  position: Position;
  id?: string;
  top?: number;
}> = ({ type, position, id, top }) => (
  <Handle
    id={id}
    isConnectable={false}
    position={position}
    style={top === undefined ? HIDDEN_HANDLE_STYLE : { ...HIDDEN_HANDLE_STYLE, top }}
    type={type}
  />
);

const TriggerNode = React.memo<NodeProps<TriggerFlowNode>>(({ data }) => (
  <TriggerCard errorMessage={data.errorMessage} trigger={data.trigger} onInteract={data.onInteract}>
    <HiddenHandle position={Position.Bottom} type="source" />
    <HiddenHandle
      id={CONDITION_HANDLE_ID}
      position={Position.Right}
      top={CONDITION_CONNECTOR_Y}
      type="source"
    />
  </TriggerCard>
));
TriggerNode.displayName = 'TriggerNode';

const ConditionNode = React.memo<NodeProps<ConditionFlowNode>>(({ data }) => (
  <ConditionCard
    condition={data.condition}
    errorMessage={data.errorMessage}
    menuItems={data.contextMenuItems}
  >
    <HiddenHandle position={Position.Left} top={CONDITION_CONNECTOR_Y} type="target" />
  </ConditionCard>
));
ConditionNode.displayName = 'ConditionNode';

const AddConditionNode: React.FC<NodeProps<AddConditionFlowNode>> = ({ data }) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, contentRef, onCloseAutoFocus } = useDismissOnOutsidePress(open, setOpen);
  return (
    <>
      <HiddenHandle position={Position.Left} type="target" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            aria-label="Add condition"
            className={cn(
              'nodrag nopan flex size-8 items-center justify-center rounded-full border focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-none',
              INSERT_BUTTON_CLASSES,
            )}
            type="button"
          >
            <LucideIcon.Plus className="size-5" strokeWidth={1.5} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          align="start"
          className="border-0 p-0 shadow-lg"
          side="right"
          sideOffset={12}
          updatePositionStrategy="always"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <ConditionPicker
            onPick={() => {
              setOpen(false);
              data.onAdd();
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
};

const StepNode = React.memo<NodeProps<StepFlowNode>>(({ data }) => {
  if (data.email) {
    return (
      <EditableEmailCard
        analytics={data.analytics}
        email={data.email}
        errorMessage={data.errorMessage}
        isNew={data.isNew}
        menuItems={data.contextMenuItems}
      >
        <HiddenHandle position={Position.Top} type="target" />
        <HiddenHandle position={Position.Bottom} type="source" />
      </EditableEmailCard>
    );
  }
  if (data.wait) {
    return (
      <EditableWaitCard
        errorMessage={data.errorMessage}
        isNew={data.isNew}
        menuItems={data.contextMenuItems}
        wait={data.wait}
      >
        <HiddenHandle position={Position.Top} type="target" />
        <HiddenHandle position={Position.Bottom} type="source" />
      </EditableWaitCard>
    );
  }
  return null;
});
StepNode.displayName = 'StepNode';

// Rises and fades in as the connector reaches it — a transition from a state flipped
// after mount rather than a keyframe, which would start while React Flow still has
// the node hidden for measuring.
const CONNECT_IN_CLASS = `transition-[opacity,translate] duration-180 [transition-delay:120ms] ${ENTRANCE_EASE} motion-reduce:transition-none`;

const TailNode: React.FC<NodeProps<TailFlowNode>> = ({ data }) => {
  const [connectIn] = React.useState(Boolean(data.connectIn));
  const shown = useRevealAfterMount(connectIn);
  return (
    <Inline className="w-[400px]" justify="center">
      <HiddenHandle position={Position.Top} type="target" />
      <AutomationCard
        aria-label="Exit automation"
        className={cn(
          'w-auto p-4 text-muted-foreground',
          connectIn && CONNECT_IN_CLASS,
          !shown && 'translate-y-2 opacity-0',
        )}
      >
        <Inline gap="md">
          <LucideIcon.LogOut aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
          <Text size="md" tone="secondary" weight="medium">
            Exit automation
          </Text>
        </Inline>
      </AutomationCard>
    </Inline>
  );
};

export { TriggerNode, StepNode, TailNode, ConditionNode, AddConditionNode };
