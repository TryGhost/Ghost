import { Grid, Inline } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { EmailSendingStatusIcon } from './email-sending-status-icon';
import { useChangeCount } from './use-change-count';
import { useEffect, useState } from 'react';
import type { EmailSendingLine } from './email-sending-status-copy';

/** Covers the 250ms fade and the 400ms collapse that starts 150ms in. */
export const EMAIL_SENDING_LEAVE_DURATION_MS = 600;

// Use `fade-in-0`, not `fade-in`: Ember's ghost.css has its own `.fade-in`
// that leaves content at opacity 0.
const REVEAL =
  'animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-out motion-reduce:animate-none';

const isSameLine = (a: EmailSendingLine | null, b: EmailSendingLine | null) =>
  a?.phase === b?.phase && a?.fractionComplete === b?.fractionComplete && a?.text === b?.text;

interface EmailSendingStatusLineProps {
  /** Null once the send has settled, which fades the last line out. */
  line: EmailSendingLine | null;
  /** Animates in on mount, for a line that replaces other content after load. */
  appear?: boolean;
  /** False while loading, so the initial state doesn't animate in. */
  ready?: boolean;
  /** Off in the posts list, where every polling row would be announced. */
  announce?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function EmailSendingStatusLine({
  line,
  appear = false,
  ready = true,
  announce = true,
  className,
  'data-testid': testId,
}: EmailSendingStatusLineProps) {
  // Keeps the last line around so it can fade out.
  const [shownLine, setShownLine] = useState(line);
  if (line && !isSameLine(line, shownLine)) {
    setShownLine(line);
  }
  const isLeaving = !line && shownLine !== null;
  const changeCount = useChangeCount(shownLine?.phase ?? null, ready);

  useEffect(() => {
    if (!isLeaving) {
      return;
    }
    const timeout = setTimeout(() => setShownLine(null), EMAIL_SENDING_LEAVE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [isLeaving]);

  if (!shownLine) {
    return null;
  }

  return (
    <Grid
      className={cn(
        '[transition:opacity_250ms_ease-out,grid-template-rows_400ms_cubic-bezier(0.4,0,0.2,1)_150ms] motion-reduce:transition-none',
        isLeaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]',
        className,
      )}
      gap="none"
      role={announce ? 'status' : undefined}
    >
      {/* Remounts on each phase change to replay the reveal, inside a live
          region that stays put so the new phase is still announced. */}
      <div
        key={changeCount}
        className={cn('min-h-0 overflow-hidden', (appear || changeCount > 0) && REVEAL)}
      >
        <Inline className="leading-[1.65em]" data-testid={testId} gap="xs">
          <EmailSendingStatusIcon
            fractionComplete={shownLine.fractionComplete}
            phase={shownLine.phase}
          />
          <span className="email-sending-shimmer font-medium tabular-nums">{shownLine.text}</span>
        </Inline>
      </div>
    </Grid>
  );
}
