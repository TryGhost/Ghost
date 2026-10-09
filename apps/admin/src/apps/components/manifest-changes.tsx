import React from 'react';
import { Text } from '@tryghost/shade/primitives';
import type { ChangeRow } from '@/apps/lib/changes';

/** One side of a change. The approved side reads as replaced, struck through when it had a value. */
const Value: React.FC<{ value: string | null; missing: string; approved?: boolean }> = ({
  value,
  missing,
  approved,
}) => (
  <Text
    as="div"
    className={approved && value !== null ? 'break-all line-through' : 'break-all'}
    size="sm"
    tone={approved ? 'secondary' : undefined}
  >
    {value ?? <em>{missing}</em>}
  </Text>
);

/**
 * What changed since the app was approved, field by field: only what's new or different,
 * not the whole manifest again, with the changes that need approval first.
 */
export const ManifestChanges: React.FC<{ rows: ChangeRow[] }> = ({ rows }) => (
  <ul
    className="m-0 list-none divide-y rounded-lg border border-border-default px-4 py-1"
    data-testid="app-manifest-changes"
  >
    {rows.map((row) => (
      <li key={row.field} className="py-3" data-testid="app-manifest-change">
        <Text as="div" size="sm" weight="semibold">
          {row.label}
        </Text>
        <Value missing="Not there before" value={row.before} approved />
        <Value missing="Removed" value={row.after} />
      </li>
    ))}
  </ul>
);
