const SENDABLE_POST_STATUSES = ['published', 'sent'];

// A newsletter is only sent, resumed or retried while its post is published.
export function isSendablePostStatus(status: string | null | undefined): boolean {
  return status !== null && status !== undefined && SENDABLE_POST_STATUSES.includes(status);
}

// Whether a send requested at `requestedAt` is too stale to start or resume:
// a send job doesn't begin sending more than `bulkEmail:resumeMaxAgeMs` after
// the publisher asked for it, though a send already under way finishes. A send
// with no recorded request time, from before sends were timed, is not.
export function isRequestTooOld({
  requestedAt,
  maxAgeMs,
  now,
}: {
  requestedAt: Date | null;
  maxAgeMs: number;
  now: Date;
}): boolean {
  return requestedAt !== null && now.getTime() - requestedAt.getTime() > maxAgeMs;
}
