import React from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import type { PendingChangesKind } from './pending-changes';

const labels: Record<PendingChangesKind, string> = {
  unsaved: 'Unsaved changes',
  unpublished: 'Unpublished changes',
};

// NY-1715 concept C: while the automation has unsaved or unpublished changes, a floating
// bar at the bottom of the canvas holds the only ways to settle them — Discard, or Save /
// Publish changes. The header keeps just Publish or Turn off. An inverted surface, so it
// reads as a temporary layer over the canvas in either theme.
const ChangesBar: React.FC<{
  kind: PendingChangesKind;
  commitLabel: React.ReactNode;
  isCommitEnabled: boolean;
  onCommit: () => void;
  // Omitted for an automation that's never been saved: there's nothing to go back to.
  onDiscard?: () => void;
}> = ({ kind, commitLabel, isCommitEnabled, onCommit, onDiscard }) => (
  <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
    <Inline
      align="center"
      className="pointer-events-auto animate-in rounded-xl bg-foreground py-2 pr-2 pl-4 text-background shadow-lg duration-200 fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
      gap="lg"
      role="status"
    >
      {/* Same line box and type size as the buttons beside it, so the label sits level with
          theirs. */}
      <Text
        as="span"
        className="inline-flex h-(--control-height) items-center text-[length:var(--text-control)] whitespace-nowrap text-background"
        leading="none"
      >
        {labels[kind]}
      </Text>
      <Inline gap="sm">
        {onDiscard && (
          <Button
            className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
            variant="outline"
            onClick={onDiscard}
          >
            Discard
          </Button>
        )}
        <Button
          className="bg-background text-foreground hover:bg-background/90"
          disabled={!isCommitEnabled}
          onClick={onCommit}
        >
          {commitLabel}
        </Button>
      </Inline>
    </Inline>
  </div>
);

export default ChangesBar;
