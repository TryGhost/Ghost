import React from 'react';
import { Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { ACCOUNT_ACCESS } from '@/apps/lib/access';
import { servedFrom } from '@/apps/lib/served-from';
import { SectionEyebrow } from './section-eyebrow';

interface AccessIndicatorProps {
  manifest: AppManifest;
  /**
   * Leaves out the label, the intro, the border and where the app's data goes, for a page that
   * gives the list its own section heading and card.
   */
  bare?: boolean;
}

/** How an app gets what's on the list, on an app's details page. */
export const OPENED_APP_ACCESS_INTRO = 'The app acts as whoever opens it, within their role.';

/** How an app gets what's on the list, for anyone deciding to let it in. */
const ACCOUNT_ACCESS_INTRO =
  'The app acts as whoever opens it, within their role. Only install apps from developers you trust.';

/**
 * The one way Ghost shows what an app can access: one entry per kind of access,
 * like a consent screen. Apps use the account of whoever opens them for now, limited to
 * what the bridge allows; Permissions and auth gives them their own scopes.
 */
export const AccessIndicator: React.FC<AccessIndicatorProps> = ({ manifest, bare = false }) => (
  <Stack data-testid="access-indicator" gap="md">
    {!bare && (
      <Stack gap="xs">
        <SectionEyebrow>Required permissions</SectionEyebrow>
        <Text size="sm" tone="secondary">
          {ACCOUNT_ACCESS_INTRO}
        </Text>
      </Stack>
    )}
    <ul
      className={cn(
        'm-0 flex list-none flex-col gap-3',
        // Clips the footer band to the box's corners.
        !bare && 'overflow-hidden rounded-lg border border-border-default p-4',
      )}
    >
      {ACCOUNT_ACCESS.map((item) => (
        <li key={item.title} data-testid="access-item">
          <Text size="sm" weight="semibold">
            {item.title}
          </Text>
          <Text size="sm" tone="secondary">
            {item.description}
          </Text>
        </li>
      ))}
      {!bare && (
        // Out to the box's edges, past its padding, like a card footer.
        <li className="-mx-4 mt-1 -mb-4 bg-muted px-4 py-3">
          <DataAccessedBy manifest={manifest} />
        </li>
      )}
    </ul>
  </Stack>
);

/** Where an app reads and writes its data: a quiet label over the address. */
const DataAccessedBy: React.FC<{ manifest: AppManifest }> = ({ manifest }) => (
  <Stack className="min-w-0" data-testid="app-data-accessed-by" gap="sm">
    <p className="stat-label text-muted-foreground">Data accessed by</p>
    <p className="min-w-0 text-sm break-words text-foreground">{servedFrom(manifest)}</p>
  </Stack>
);
