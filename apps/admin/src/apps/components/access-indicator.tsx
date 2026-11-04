import React from 'react';
import { Stack, Text } from '@tryghost/shade/primitives';
import type { AccessItem } from '@/apps/lib/access';
import { SectionEyebrow } from './section-eyebrow';

interface AccessIndicatorProps {
  /** One entry per kind of access. */
  items: AccessItem[];
  /** What the list means, above it: why the app gets this access. */
  intro?: string;
  className?: string;
}

/** How an app gets what's on the list, on an app's details page. */
export const OPENED_APP_ACCESS_INTRO = 'The app acts as whoever opens it, within their role.';

/** How an app gets what's on the list, for anyone deciding to let it in. */
export const ACCOUNT_ACCESS_INTRO =
  'The app acts as whoever opens it, within their role. Only install apps from developers you trust.';

/**
 * The one way Ghost shows what an app can access: one entry per kind of access,
 * like a consent screen. Apps use the account of whoever opens them for now, limited to
 * what the bridge allows; Permissions and auth gives them their own scopes.
 */
export const AccessIndicator: React.FC<AccessIndicatorProps> = ({ items, intro, className }) => (
  <Stack className={className} data-testid="access-indicator" gap="md">
    <Stack gap="xs">
      <SectionEyebrow>Required permissions</SectionEyebrow>
      {intro && (
        <Text size="sm" tone="secondary">
          {intro}
        </Text>
      )}
    </Stack>
    <ul className="m-0 flex list-none flex-col gap-3 rounded-lg border border-border-default p-4">
      {items.map((item) => (
        <li key={item.title} data-testid="access-item">
          <Text size="sm" weight="semibold">
            {item.title}
          </Text>
          <Text size="sm" tone="secondary">
            {item.description}
          </Text>
        </li>
      ))}
    </ul>
  </Stack>
);
