import React from 'react';
import { Badge } from '@tryghost/shade/components';

/** Marks an app installed from an install link rather than the directory. */
export const DevelopmentBadge: React.FC = () => (
  <Badge
    className="px-1 py-px text-[10px] leading-none tracking-wider uppercase"
    data-testid="app-development-badge"
    variant="secondary"
  >
    Dev
  </Badge>
);
