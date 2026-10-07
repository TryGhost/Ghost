import React from 'react';
import { Badge } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { SectionEyebrow } from './section-eyebrow';
import type { PermissionRow } from '@/apps/lib/app-permissions';

const PermissionItem: React.FC<{ row: PermissionRow }> = ({ row }) => (
  <li data-resource={row.resource}>
    <Inline gap="xs">
      <Text size="sm" weight="semibold">
        {row.label}
      </Text>
      {row.change === 'more' && (
        <Badge data-testid="permission-change" variant="secondary">
          Updated
        </Badge>
      )}
    </Inline>
    <Text size="sm" tone="secondary">
      {row.detail}
      {row.previously && ` · was ${row.previously}`}
    </Text>
  </li>
);

/**
 * What an app can reach, one short entry per kind of content, like an OAuth
 * consent screen. An update lists only the new or wider access.
 */
export const PermissionList: React.FC<{ rows: PermissionRow[] }> = ({ rows }) => (
  <Stack data-testid="app-permissions" gap="sm">
    <SectionEyebrow>Required permissions</SectionEyebrow>
    <ul className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
      {rows.map((row) => (
        <PermissionItem key={row.resource} row={row} />
      ))}
    </ul>
  </Stack>
);
