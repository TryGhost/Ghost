import React, { useState } from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { Inline } from '@tryghost/shade/primitives';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { AutomationCardWarning } from './automation-card-warning';
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
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
  }>
> = ({ wait, isNew, errorMessage, menuItems, children }) => {
  const [isValid, setIsValid] = useState(true);
  const warning = !isValid ? 'Enter a whole number between 1 and 30 days.' : errorMessage;
  return (
    <AutomationCard
      aria-label={`Wait: ${formatWait(wait.hours)}`}
      className={cn(
        'nodrag nopan w-[400px] text-left',
        warning && 'border-state-warning',
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
        actions={
          <Inline gap="xs">
            <AutomationCardWarning message={warning} />
            <AutomationCardMenu label="Wait actions" menuItems={menuItems} />
          </Inline>
        }
        icon={<LucideIcon.Clock className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title="Wait"
      />
      <WaitDurationField
        waitHours={wait.hours}
        inline
        onUpdate={wait.onUpdate}
        onValidityChange={(valid) => {
          setIsValid(valid);
          wait.onValidityChange(valid);
        }}
      />
    </AutomationCard>
  );
};
