// PROTOTYPE ONLY — not production code. See ./README.md
//
// Stands in for a card's data whenever those figures would not describe this
// post's send. See EmailDataTreatment in ./types for why withholding beats
// showing a figure that is reliably low exactly when people are looking.
//
// The card keeps its header and its place in the grid; only the data area is
// replaced, which is how every other empty state on these pages behaves (see
// the Sources card under Growth).
//
// The title names what is missing and stays with the card, since each one is
// withholding something different. The reason is shared, because it is a fact
// about the send rather than about any one metric — and it is the half that
// differs: waiting for the first results is a temporary state that resolves
// itself, while a send that did not fully go out never will.

import React from 'react';
import { EmptyIndicator } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useEmailDataHiddenReason } from './use-status-copy';

const REASON_DESCRIPTION: Record<'partial' | 'failed', string> = {
  partial:
    'Some emails could not be sent, so this post has no complete performance data to report.',
  failed: 'None of the emails were sent, so this post has no performance data.',
};

interface PendingSendEmptyProps {
  children: React.ReactNode;
  /** Goes on the wrapper around the real content, never on the empty state. */
  className?: string;
  /** What is missing, in the "No X data available" shape used elsewhere. */
  title: string;
  /** Used while results are merely pending. Names the event that resolves it. */
  description: string;
}

const PendingSendEmpty: React.FC<PendingSendEmptyProps> = ({
  children,
  className,
  title,
  description,
}) => {
  const reason = useEmailDataHiddenReason();

  if (!reason) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="py-20 text-center">
      <EmptyIndicator
        className="h-full"
        description={reason === 'pending' ? description : REASON_DESCRIPTION[reason]}
        title={title}
      >
        <LucideIcon.Mail strokeWidth={1.5} />
      </EmptyIndicator>
    </div>
  );
};

export default PendingSendEmpty;
