import React from 'react';
import { Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import type { PendingChangesKind } from './pending-changes';

const labels: Record<PendingChangesKind, string> = {
  unsaved: 'Unsaved changes',
  unpublished: 'Unpublished changes',
};

// NY-1715 concepts: a quiet status line in muted text.
const ChangesIndicator: React.FC<{ kind: PendingChangesKind; className?: string }> = ({
  kind,
  className,
}) => (
  <Text
    className={cn('shrink-0 whitespace-nowrap', className)}
    role="status"
    size="sm"
    tone="secondary"
  >
    {labels[kind]}
  </Text>
);

export default ChangesIndicator;
