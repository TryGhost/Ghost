import React from 'react';
import { Banner } from '@tryghost/shade/components';
import type { AccessItem } from '@/apps/lib/access';

// TODO: point at the apps access help article once it exists.
const LEARN_MORE_URL = 'https://docs.ghost.org/';

interface AccessIndicatorProps {
  /** One block per thing the app can reach. Scopes become more blocks later. */
  items: AccessItem[];
  className?: string;
}

const LearnMore: React.FC = () => (
  <>
    {' '}
    <a
      className="font-semibold text-foreground"
      href={LEARN_MORE_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      Learn more
    </a>
  </>
);

/**
 * The one way Ghost shows what something can access: a warning banner with a
 * plain statement, so it's read before installing. Permissions and auth adds
 * blocks for scopes rather than a new pattern.
 */
export const AccessIndicator: React.FC<AccessIndicatorProps> = ({ items, className }) => (
  <Banner className={className} data-testid="access-indicator" size="md" variant="warning">
    <div className="space-y-3 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={item.title} className="space-y-1">
            <p className="m-0 text-foreground">
              {item.title}
              {isLast && !item.description && <LearnMore />}
            </p>
            {item.description && (
              <p className="m-0 text-muted-foreground">
                {item.description}
                {isLast && <LearnMore />}
              </p>
            )}
          </div>
        );
      })}
    </div>
  </Banner>
);
