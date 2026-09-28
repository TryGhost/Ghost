import { Grid, Inline } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { EmailSendingStatusIcon } from './email-sending-status-icon';
import { useAnimateOnChange } from './use-animate-on-change';
import { useEffect, useState, type ReactNode } from 'react';
import type { EmailSendingActiveLine } from './email-sending-status-copy';

/** Covers the 250ms fade and the 400ms collapse that starts 150ms in. */
export const EMAIL_SENDING_LEAVE_DURATION_MS = 600;

// Use `fade-in-0`, not `fade-in`: Ember's ghost.css has its own `.fade-in`
// that leaves content at opacity 0.
const REVEAL =
  'animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-out motion-reduce:animate-none';

const CROSSFADE = 'animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none';

const isSameLine = (a: EmailSendingActiveLine | null, b: EmailSendingActiveLine | null) =>
  a?.phase === b?.phase && a?.share === b?.share && a?.text === b?.text;

interface EmailSendingStatusLineProps {
  /** Null once the send has settled or failed. */
  active: EmailSendingActiveLine | null;
  /** Shown in place of the active line, without the leave animation. */
  failure?: ReactNode;
  /** False while loading, so the initial state doesn't animate in. */
  ready?: boolean;
  /** Off in the posts list, where every polling row would be announced. */
  announce?: boolean;
  className?: string;
  'data-testid'?: string;
}

/** A send's status line, used on post analytics and in the posts list. */
export function EmailSendingStatusLine({
  active,
  failure,
  ready = true,
  announce = true,
  className,
  'data-testid': testId,
}: EmailSendingStatusLineProps) {
  // Keeps the last active line around so it can fade out.
  const [shownLine, setShownLine] = useState(active);
  if (active ? !isSameLine(active, shownLine) : failure && shownLine) {
    setShownLine(active);
  }
  const isLeaving = !active && shownLine !== null;
  const animateChange = useAnimateOnChange(shownLine?.phase ?? (failure ? 'failed' : null), ready);

  useEffect(() => {
    if (!isLeaving) {
      return;
    }
    const timeout = setTimeout(() => setShownLine(null), EMAIL_SENDING_LEAVE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [isLeaving]);

  if (shownLine) {
    return (
      <Grid
        className={cn(
          // Fade out, then collapse the height.
          '[transition:opacity_250ms_ease-out,grid-template-rows_400ms_cubic-bezier(0.4,0,0.2,1)_150ms] motion-reduce:transition-none',
          isLeaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]',
          animateChange && REVEAL,
          className,
        )}
        gap="none"
      >
        <div className="min-h-0 overflow-hidden">
          <Inline
            className="leading-[1.65em]"
            data-testid={testId}
            gap="xs"
            role={announce ? 'status' : undefined}
          >
            <EmailSendingStatusIcon phase={shownLine.phase} share={shownLine.share} />
            <span className="email-sending-shimmer font-medium tabular-nums">{shownLine.text}</span>
          </Inline>
        </div>
      </Grid>
    );
  }

  if (!failure) {
    return null;
  }

  return (
    <Inline
      className={cn(
        'leading-[1.65em] text-muted-foreground tabular-nums',
        animateChange && CROSSFADE,
        className,
      )}
      data-testid={testId}
      gap="xs"
      role={announce ? 'alert' : undefined}
      wrap
    >
      {failure}
    </Inline>
  );
}
