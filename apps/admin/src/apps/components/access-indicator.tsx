import React from 'react';
import { Banner } from '@tryghost/shade/components';
import type { AccessItem } from '@/apps/lib/access';

interface AccessIndicatorProps {
  /** One block per thing the app can reach. Scopes become more blocks later. */
  items: AccessItem[];
  className?: string;
}

/**
 * The one way Ghost shows what something can access: a warning banner with a plain
 * statement, so it's read before installing. Permissions and auth adds blocks for scopes
 * rather than a new pattern, and a link to a help article once there is one.
 */
export const AccessIndicator: React.FC<AccessIndicatorProps> = ({ items, className }) => (
  <Banner className={className} data-testid="access-indicator" size="md" variant="warning">
    <div className="space-y-3 text-sm">
      {items.map((item) => (
        <div key={item.title} className="space-y-1">
          <p className="m-0 text-foreground">{item.title}</p>
          {item.description && <p className="m-0 text-muted-foreground">{item.description}</p>}
        </div>
      ))}
    </div>
  </Banner>
);
