import React from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { AutomationCardMenu } from './automation-card-menu';
import { WaitDurationField } from './wait-duration-field';
import { formatWait } from './format-wait';
import type { NodeContextMenuEntry } from './nodes';

export type EditableWaitData = {
  hours: number;
  onInteract: () => void;
  onValidityChange: (valid: boolean) => void;
  onUpdate: (hours: number) => void;
};

export const EditableWaitCard: React.FC<
  React.PropsWithChildren<{
    wait: EditableWaitData;
    isNew: boolean;
    menuItems: NodeContextMenuEntry[];
  }>
> = ({ wait, isNew, menuItems, children }) => {
  return (
    <AutomationCard
      aria-label={`Wait: ${formatWait(wait.hours)}`}
      className={cn(
        'nodrag nopan w-[400px] text-left',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      gap="xl"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={wait.onInteract}
      onPointerDownCapture={wait.onInteract}
    >
      {children}
      <AutomationCardHeader
        actions={<AutomationCardMenu label="Wait actions" menuItems={menuItems} />}
        icon={<LucideIcon.Clock className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title="Wait"
      />
      <WaitDurationField
        waitHours={wait.hours}
        inline
        onUpdate={wait.onUpdate}
        onValidityChange={wait.onValidityChange}
      />
    </AutomationCard>
  );
};
