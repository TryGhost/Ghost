import React from 'react';
import { Inline, Text } from '@tryghost/shade/primitives';
import type { ChangeRow } from '@/apps/lib/changes';

/**
 * One side of a change. The approved side reads as replaced, struck through when it had a value.
 * A screen reader can't tell the sides apart by their look, so each value is labelled for it.
 */
const Value: React.FC<{ value: string | null; missing: string; approved?: boolean }> = ({
  value,
  missing,
  approved,
}) => (
  <Text
    as="span"
    className={approved && value !== null ? 'wrap-anywhere line-through' : 'wrap-anywhere'}
    size="sm"
    tone={approved ? 'secondary' : undefined}
  >
    {value === null ? (
      <em>{missing}</em>
    ) : (
      <>
        <span className="sr-only">{approved ? 'Was: ' : 'Now: '}</span>
        {value}
      </>
    )}
  </Text>
);

/**
 * What changed since the app was approved, field by field: only what's new or different,
 * not the whole manifest again.
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
        {/* Side by side, wrapping onto the next line when they don't fit. */}
        <Inline align="baseline" gap="xs" wrap>
          <Value missing="Not there before" value={row.before} approved />
          <Value missing="Removed" value={row.after} />
        </Inline>
      </li>
    ))}
  </ul>
);
