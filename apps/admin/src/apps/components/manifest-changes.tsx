import React from 'react';
import { Inline, Text } from '@tryghost/shade/primitives';
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
 * not the whole manifest again. Changes that need approval come first; text and color
 * changes are marked as not needing it.
 */
export const ManifestChanges: React.FC<{ rows: ChangeRow[] }> = ({ rows }) => (
  <ul className="border-t" data-testid="app-manifest-changes">
    {rows.map((row) => (
      <li key={row.field} className="border-b py-3" data-testid="app-manifest-change">
        <Inline gap="xs">
          <Text as="div" weight="semibold">
            {row.label}
          </Text>
          {!row.requiresApproval && (
            <Text as="span" data-testid="app-manifest-change-silent" size="sm" tone="secondary">
              · No approval needed
            </Text>
          )}
        </Inline>
        <Value missing="Not there before" value={row.before} approved />
        <Value missing="Removed" value={row.after} />
      </li>
    ))}
  </ul>
);
