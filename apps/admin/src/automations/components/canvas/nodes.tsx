import { TriggerCard, type TriggerData } from './trigger-card';
import React from 'react';
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

type StepFlowNode = Node<StepNodeData, 'step'>;
type TriggerFlowNode = Node<TriggerNodeData, 'trigger'>;
type TailFlowNode = Node<{ connectIn?: boolean }, 'tail'>;
export type AutomationFlowNode = StepFlowNode | TriggerFlowNode | TailFlowNode;

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

const HiddenHandle: React.FC<{ type: 'source' | 'target'; position: Position }> = ({
  type,
  position,
}) => <Handle isConnectable={false} position={position} style={HIDDEN_HANDLE_STYLE} type={type} />;

const TriggerNode = React.memo<NodeProps<TriggerFlowNode>>(({ data }) => (
  <TriggerCard errorMessage={data.errorMessage} trigger={data.trigger} onInteract={data.onInteract}>
    <HiddenHandle position={Position.Bottom} type="source" />
  </TriggerCard>
));
TriggerNode.displayName = 'TriggerNode';

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

export { TriggerNode, StepNode, TailNode };
