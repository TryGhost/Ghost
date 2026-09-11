/** Members need this many tracked emails before an open rate is meaningful. */
export const MIN_EMAIL_COUNT_FOR_OPEN_RATE = 5;

/**
 * Percentage open rate rounded to a whole number, or null below the tracked
 * email threshold. Shared by every writer of members.email_open_rate so the
 * rounding and threshold cannot drift between recount and counter paths.
 */
export function deriveOpenRate(openedCount: number, trackedCount: number): number | null {
  if (trackedCount < MIN_EMAIL_COUNT_FOR_OPEN_RATE) {
    return null;
  }
  return Math.round((openedCount / trackedCount) * 100);
}
