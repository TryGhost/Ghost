import React from 'react';
import { Stack, Text } from '@tryghost/shade/primitives';
import type { AccessItem } from '@/apps/lib/access';
import { SectionEyebrow } from './section-eyebrow';

interface AccessIndicatorProps {
  /** One entry per thing the app can reach. Scopes become more entries later. */
  items: AccessItem[];
  className?: string;
}

/**
 * The one way Ghost shows what an app can access: one short entry per kind of access,
 * like a consent screen. Permissions and auth adds an entry per scope rather than a new
 * pattern.
 */
export const AccessIndicator: React.FC<AccessIndicatorProps> = ({ items, className }) => (
  <Stack className={className} data-testid="access-indicator" gap="sm">
    <SectionEyebrow>Required permissions</SectionEyebrow>
    <ul className="m-0 flex list-none flex-col gap-3 rounded-lg border border-border-default p-4">
      {items.map((item) => (
        <li key={item.title}>
          <Text size="sm" weight="semibold">
            {item.title}
          </Text>
          {item.description && (
            <Text size="sm" tone="secondary">
              {item.description}
            </Text>
          )}
        </li>
      ))}
    </ul>
  </Stack>
);
