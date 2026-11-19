import React from 'react';
import { Stack, Text } from '@tryghost/shade/primitives';
import { APP_PERMISSION_KEYS, type ScopeLine, describeScopes } from '@tryghost/app-contracts';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
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
 * What an app can do with the account of whoever opens it, in the scope registry's words. Apps
 * act with the staff user's own session until Permissions and auth gives them a token, and the
 * bridge lets every app reach everything in the registry, how posts performed through includes on
 * post reads, so this lists it all.
 */
const ACCOUNT_ACCESS = describeScopes(APP_PERMISSION_KEYS);

/** One line per resource: its name over what the app can do with it, one sentence per scope. */
export const AccessLines: React.FC<{ lines: ScopeLine[]; testId?: string }> = ({
  lines,
  testId = 'access-item',
}) => (
  <ul className="m-0 flex list-none flex-col gap-3 p-0">
    {lines.map((line) => (
      <li key={line.resource} data-testid={testId}>
        <Text size="sm" weight="semibold">
          {line.title}
        </Text>
        <ul className="m-0 list-disc pl-5">
          {line.actions.map((action) => (
            <li key={action}>
              <Text size="sm" tone="secondary">
                {action}
              </Text>
            </li>
          ))}
        </ul>
      </li>
    ))}
  </ul>
);

/**
 * The one way Ghost shows what an app can access: one line per resource in the scope registry,
 * like a consent screen. Apps use the account of whoever opens them for now, limited to what the
 * bridge allows; Permissions and auth gives them their own scopes.
 */
export const AccessIndicator: React.FC<AccessIndicatorProps> = ({ manifest, bare = false }) => {
  const list = <AccessLines lines={ACCOUNT_ACCESS} />;

  if (bare) {
    return (
      <Stack data-testid="access-indicator" gap="md">
        {list}
      </Stack>
    );
  }

  return (
    <Stack data-testid="access-indicator" gap="md">
      <Stack gap="xs">
        <SectionEyebrow>Required permissions</SectionEyebrow>
        <Text size="sm" tone="secondary">
          {ACCOUNT_ACCESS_INTRO}
        </Text>
      </Stack>
      {/* The box holds the list, then where the app's data goes as a band across its bottom,
          outside the list so assistive tech doesn't count it as a permission. It clips the
          band to its corners. */}
      <div className="overflow-hidden rounded-lg border border-border-default">
        <div className="p-4">{list}</div>
        <div className="bg-muted px-4 py-3">
          <DataAccessedBy manifest={manifest} />
        </div>
      </div>
    </Stack>
  );
};

/** Where an app reads and writes its data: a quiet label over the address. */
const DataAccessedBy: React.FC<{ manifest: AppManifest }> = ({ manifest }) => (
  <Stack className="min-w-0" data-testid="app-data-accessed-by" gap="sm">
    <p className="stat-label text-muted-foreground">Data accessed by</p>
    <p className="min-w-0 text-sm break-words text-foreground">{servedFrom(manifest)}</p>
  </Stack>
);
