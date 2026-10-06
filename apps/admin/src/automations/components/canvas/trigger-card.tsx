import React from 'react';
import { LucideIcon } from '@tryghost/shade/utils';
import { AutomationCard, AutomationCardHeader } from './automation-card';

export const TriggerCard: React.FC<
  React.PropsWithChildren<{
    onInteract?: () => void;
  }>
> = ({ onInteract, children }) => (
  <AutomationCard
    aria-label="Member signs up"
    className="w-[400px]"
    onPointerDownCapture={onInteract}
  >
    <AutomationCardHeader
      icon={<LucideIcon.UserPlus className="size-4" />}
      iconClassName="p-2.5 text-foreground"
      title="Member signs up"
    />
    {children}
  </AutomationCard>
);
