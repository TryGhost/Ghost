import React from 'react';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { PendingChangesKind } from './pending-changes';

const labels: Record<PendingChangesKind, string> = {
  unsaved: 'Unsaved changes',
  unpublished: 'Unpublished changes',
};

// NY-1715 concept A: a quiet status line — warning icon and text, both muted.
const ChangesIndicator: React.FC<{ kind: PendingChangesKind; className?: string }> = ({
  kind,
  className,
}) => (
  <Inline className={cn('shrink-0 text-text-secondary', className)} gap="xs" role="status">
    <LucideIcon.TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
    <Text className="whitespace-nowrap" size="sm" tone="secondary">
      {labels[kind]}
    </Text>
  </Inline>
);

export default ChangesIndicator;
