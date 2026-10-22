import React, { useState } from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { Inline } from '@tryghost/shade/primitives';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { AutomationCardWarning } from './automation-card-warning';
import { AutomationCardMenu } from './automation-card-menu';
import { WaitDurationField, WAIT_VALIDATION_MESSAGE } from './wait-duration-field';
import { formatWait } from './format-wait';
import type { NodeContextMenuEntry } from './nodes';
import ModifiedDot from '@/automations/concepts/modified-dot';

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
    modified?: boolean;
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
  }>
> = ({ wait, isNew, errorMessage, menuItems, modified = false, children }) => {
  const [isInvalidShown, setIsInvalidShown] = useState(false);
  const warning = isInvalidShown ? WAIT_VALIDATION_MESSAGE : errorMessage;
  return (
    <AutomationCard
      aria-label={`Wait: ${formatWait(wait.hours)}${modified ? ', modified' : ''}`}
      className={cn(
        'group/card nodrag nopan relative w-[400px] text-left',
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
      {modified && (
        // NY-1715 concepts: mirrors the ⋯ menu across the card edge: same 24px gap, same 36px box.
        <ModifiedDot className="absolute top-6 left-full ml-6" />
      )}
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
        onErrorVisibilityChange={setIsInvalidShown}
        onUpdate={wait.onUpdate}
        onValidityChange={wait.onValidityChange}
      />
    </AutomationCard>
  );
};
