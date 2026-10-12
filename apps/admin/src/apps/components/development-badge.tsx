import React from 'react';
import { Badge } from '@tryghost/shade/components';

/** Marks an app served from the developer's own machine, which only works in development. */
export const DevelopmentBadge: React.FC = () => (
  <Badge
    className="px-1 py-px text-[10px] leading-none tracking-wider uppercase"
    data-testid="app-development-badge"
    variant="secondary"
  >
    Development
  </Badge>
);
