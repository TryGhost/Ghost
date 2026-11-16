import React, { useState } from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { AutomationCard, AutomationCardHeader, CollapsibleCardBody } from './automation-card';
import { useCollapsibleCard } from './use-collapsible-card';
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
  const [valid, setValid] = useState(true);
  const card = useCollapsibleCard({
    held: !valid,
    startExpanded: isNew,
    onInteract: wait.onInteract,
  });
  return (
    <AutomationCard
      aria-label={`Wait: ${formatWait(wait.hours)}`}
      {...card.cardProps}
      className={cn(
        'nodrag nopan w-[400px] text-left',
        card.cardProps.className,
        // The field reserves a line for its error, so an open card needs less padding below.
        !card.collapsed && 'pb-3',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      gap="none"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {children}
      <AutomationCardHeader
        // Hidden while collapsed, to see how the plain rows feel.
        actions={
          !card.collapsed && <AutomationCardMenu label="Wait actions" menuItems={menuItems} />
        }
        icon={<LucideIcon.Clock className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title={card.title('Wait', `Wait ${formatWait(wait.hours)}`)}
      />
      <CollapsibleCardBody collapsed={card.collapsed}>
        <WaitDurationField
          waitHours={wait.hours}
          inline
          onUpdate={wait.onUpdate}
          onValidityChange={(nextValid) => {
            setValid(nextValid);
            wait.onValidityChange(nextValid);
          }}
        />
      </CollapsibleCardBody>
    </AutomationCard>
  );
};
