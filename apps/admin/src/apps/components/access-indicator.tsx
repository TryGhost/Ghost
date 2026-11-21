import React from 'react';
import { Badge, Banner } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import {
  type AccessChange,
  type AccessLine,
  type AppPermissionKey,
  describeAccess,
} from '@tryghost/app-contracts';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { servedFrom } from '@/apps/lib/served-from';
import { type AccessChangeGroup, markAccessChanges } from '@/apps/lib/access-changes';
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
   * and what the app and its backend no longer have is listed after them.
   */
  changes?: readonly AccessChange[];
}

/**
 * How an app uses what's on the list while someone has it open, on an app's details page. Its
 * backend's scopes are shown apart, with their own warning, as no role limits them.
 */
export const OPENED_APP_ACCESS_INTRO =
  'While someone has the app open, it can do these things as them, within their role.';

/** Whatever the app asks for, for anyone deciding to let it in. */
const TRUST_NOTE = 'Only install apps from developers you trust.';

/** Why a backend's scopes are shown apart. */
export const BACKEND_ACCESS_WARNING =
  'The app’s backend can use these at any time, even when nobody has the app open, and isn’t limited to anyone’s role.';

const NO_ACCESS = 'This app doesn’t ask for access to anything on your site.';

/**
 * One line per resource: its name over what the app can do with it, one sentence per scope.
 * Scopes in `added` are marked as new. `removed` lists what's gone, quieter.
 */
export const AccessLines: React.FC<{
  lines: AccessLine[];
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

/** What the app, or its backend, no longer has after an update. */
const NoLongerHas: React.FC<{ heading: string; lines: AccessLine[]; testId: string }> = ({
  heading,
  lines,
  testId,
}) => (
  <Stack data-testid={testId} gap="sm">
    <Text size="sm" tone="secondary" weight="semibold">
      {heading}
    </Text>
    <AccessLines lines={lines} testId="access-removed-item" removed />
  </Stack>
);

/** What a change to an app's access adds and takes away, in the review screen's words. */
export const AccessChanges: React.FC<{ groups: AccessChangeGroup[] }> = ({ groups }) => (
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
 * The one way Ghost shows what an app can access: one line per resource the manifest declares,
 * in the scope registry's words, and the scopes its backend may use on its own apart, with a
 * warning, as nobody is present when it does.
 */
export const AccessIndicator: React.FC<AccessIndicatorProps> = ({
  manifest,
  bare = false,
  changes = [],
}) => {
  const { lines, backendLines } = describeAccess(manifest.access);
  const marks = markAccessChanges(changes);

  const list = (
    <Stack gap="lg">
      {lines.length ? (
        <AccessLines added={marks.added} lines={lines} />
      ) : (
        <Text data-testid="app-no-access" size="sm" tone="secondary">
          {NO_ACCESS}
        </Text>
      )}
      {marks.removed.length > 0 && (
        <NoLongerHas heading="No longer has" lines={marks.removed} testId="app-access-removed" />
      )}
    </Stack>
  );

  const backend = (backendLines.length > 0 || marks.backendRemoved.length > 0) && (
    <Stack data-testid="app-backend-access" gap="sm">
      <SectionEyebrow>Its backend, on its own</SectionEyebrow>
      {backendLines.length > 0 && (
        <>
          <Banner size="md" variant="warning">
            <p className="m-0 text-sm text-foreground">{BACKEND_ACCESS_WARNING}</p>
          </Banner>
          <AccessLines
            added={marks.backendAdded}
            lines={backendLines}
            testId="backend-access-item"
          />
        </>
      )}
      {marks.backendRemoved.length > 0 && (
        <NoLongerHas
          heading="No longer for its backend"
          lines={marks.backendRemoved}
          testId="app-backend-access-removed"
        />
      )}
    </Stack>
  );

  if (bare) {
    return (
      <Stack data-testid="access-indicator" gap="lg">
        {list}
        {backend}
      </Stack>
    );
  }

  return (
    <Stack data-testid="access-indicator" gap="md">
      <Stack gap="xs">
        <SectionEyebrow>Required permissions</SectionEyebrow>
        <Text size="sm" tone="secondary">
          {manifest.access.length > 0 ? `${OPENED_APP_ACCESS_INTRO} ${TRUST_NOTE}` : TRUST_NOTE}
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
      {backend}
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
