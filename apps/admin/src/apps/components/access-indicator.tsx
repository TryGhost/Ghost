import React from 'react';
import { Badge } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import {
  type ScopeChange,
  type ScopeLine,
  type AppPermissionKey,
  describeScopes,
} from '@tryghost/app-contracts';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { servedFrom } from '@/apps/lib/served-from';
import { type ScopeChangeGroup, markScopeChanges } from '@/apps/lib/scope-changes';
import { SectionEyebrow } from './section-eyebrow';

interface AccessIndicatorProps {
  manifest: AppManifest;
  /**
   * Leaves out the label, the intro, the border and where the app's data goes, for a page that
   * gives the list its own section heading and card.
   */
  bare?: boolean;
  /**
   * What an update changes in access, for its review: new scopes are marked where they're listed,
   * and what the app no longer has is listed after them.
   */
  changes?: readonly ScopeChange[];
}

/** How an app gets what's on the list, on an app's details page. */
export const OPENED_APP_ACCESS_INTRO = 'The app acts as whoever opens it, within their role.';

/** Whatever the app asks for, for anyone deciding to let it in. */
const TRUST_NOTE = 'Only install apps from developers you trust.';

const NO_ACCESS = 'This app doesn’t ask for access to anything on your site.';

/**
 * One line per resource: its name over what the app can do with it, one sentence per scope.
 * Scopes in `added` are marked as new. `removed` lists what's gone, quieter.
 */
export const AccessLines: React.FC<{
  lines: ScopeLine[];
  testId?: string;
  added?: ReadonlySet<AppPermissionKey>;
  removed?: boolean;
}> = ({ lines, testId = 'access-item', added, removed = false }) => (
  <ul className="m-0 flex list-none flex-col gap-3 p-0">
    {lines.map((line) => (
      <li key={line.resource} data-testid={testId}>
        <Text size="sm" tone={removed ? 'secondary' : 'primary'} weight="semibold">
          {line.title}
        </Text>
        <ul className="m-0 list-disc pl-5">
          {line.actions.map((action, index) => {
            const isNew = added?.has(line.scopes[index]) ?? false;
            return (
              <li key={action} data-testid={isNew ? 'access-new' : undefined}>
                <Text as="span" size="sm" tone={removed ? 'tertiary' : 'secondary'}>
                  {action}
                </Text>
                {isNew && (
                  <Badge className="ml-2 align-middle" variant="success">
                    New
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </li>
    ))}
  </ul>
);

/** What the app no longer has after an update. */
const NoLongerHas: React.FC<{ lines: ScopeLine[] }> = ({ lines }) => (
  <Stack data-testid="app-access-removed" gap="sm">
    <Text size="sm" tone="secondary" weight="semibold">
      No longer has
    </Text>
    <AccessLines lines={lines} testId="access-removed-item" removed />
  </Stack>
);

/** What a change to an app's access adds and takes away, in the review screen's words. */
export const AccessChanges: React.FC<{ groups: ScopeChangeGroup[] }> = ({ groups }) => (
  <Stack gap="md">
    {groups.map((group) => (
      <Stack key={group.kind} data-testid={`app-access-${group.kind}`} gap="sm">
        <Text size="sm" weight="semibold">
          {group.heading}
        </Text>
        <AccessLines lines={group.lines} testId="access-change-item" />
      </Stack>
    ))}
  </Stack>
);

/**
 * The one way Ghost shows what an app can access: one line per resource the manifest's scopes
 * cover, in the scope registry's words.
 */
export const AccessIndicator: React.FC<AccessIndicatorProps> = ({
  manifest,
  bare = false,
  changes = [],
}) => {
  const lines = describeScopes(manifest.scopes);
  const marks = markScopeChanges(changes);

  const list = (
    <Stack gap="lg">
      {lines.length ? (
        <AccessLines added={marks.added} lines={lines} />
      ) : (
        <Text data-testid="app-no-access" size="sm" tone="secondary">
          {NO_ACCESS}
        </Text>
      )}
      {marks.removed.length > 0 && <NoLongerHas lines={marks.removed} />}
    </Stack>
  );

  if (bare) {
    return (
      <Stack data-testid="access-indicator" gap="lg">
        {list}
      </Stack>
    );
  }

  return (
    <Stack data-testid="access-indicator" gap="md">
      <Stack gap="xs">
        <SectionEyebrow>Required permissions</SectionEyebrow>
        <Text size="sm" tone="secondary">
          {manifest.scopes.length > 0 ? `${OPENED_APP_ACCESS_INTRO} ${TRUST_NOTE}` : TRUST_NOTE}
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
