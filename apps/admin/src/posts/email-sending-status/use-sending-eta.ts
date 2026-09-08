import { useState } from 'react';
import { formatNumber } from '@tryghost/shade/utils';
import type { EmailSendingStatus } from '@tryghost/admin-x-framework/api/emails';

// Keep the current label within ten seconds of its usual boundaries.
const THRESHOLD_BUFFER_SECONDS = 10;

const label = (seconds: number): number => (seconds <= 40 ? 0 : Math.round(seconds / 60));

function etaMinutes(seconds: number, previous: number | null): number {
  const keep =
    previous !== null &&
    label(seconds - THRESHOLD_BUFFER_SECONDS) <= previous &&
    previous <= label(seconds + THRESHOLD_BUFFER_SECONDS);
  return keep ? previous : label(seconds);
}

export function useSendingEta(status: EmailSendingStatus | undefined): string | null {
  const sending = status?.sending;
  const key = status ? `${status.id}:${status.sending.status}` : null;
  const isActive = sending?.status === 'preparing' || sending?.status === 'submitting';
  const seconds = isActive ? sending.progress.estimated_seconds_remaining : null;
  const [previous, setPrevious] = useState<{ key: string | null; minutes: number | null }>({
    key: null,
    minutes: null,
  });
  const minutes =
    seconds === null ? null : etaMinutes(seconds, previous.key === key ? previous.minutes : null);

  // Adjust during render so a changed email/phase never flashes the old label.
  if (previous.key !== key || previous.minutes !== minutes) {
    setPrevious({ key, minutes });
  }

  if (minutes === null) {
    return null;
  }
  return minutes === 0
    ? 'Less than 1 minute left'
    : `About ${formatNumber(minutes)} ${minutes === 1 ? 'minute' : 'minutes'} left`;
}
